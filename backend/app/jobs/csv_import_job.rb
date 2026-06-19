require "csv"

class CsvImportJob
  include Sidekiq::Job

  sidekiq_options queue: "imports", retry: 2

  BATCH_SIZE = 500
  REQUIRED_COLUMNS = %w[date amount].freeze
  COLUMN_ALIASES = {
    "date" => %w[date transaction_date txn_date posted_date],
    "amount" => %w[amount total debit credit value],
    "description" => %w[description desc memo name payee narrative],
    "category" => %w[category type label]
  }.freeze

  def perform(import_id, file_path)
    import = Import.find(import_id)
    import.update!(status: "processing")

    # One shared timestamp for every record in this import — most efficient
    import_ts = Time.now.utc.iso8601

    rows_imported = 0
    error_log = []
    row_number = 1
    batch = []

    begin
      CSV.foreach(file_path, headers: true, header_converters: :downcase) do |row|
        row_number += 1
        mapped = map_row(row)

        if mapped.nil?
          error_log << {
            row: row_number,
            data: row.to_h,
            reason: missing_columns_reason(row)
          }
          next
        end

        record, error_reason = build_record(import.user_id, mapped, row, import_ts, import.filename)
        if record
          batch << record
          if batch.size >= BATCH_SIZE
            imported, batch_errors = insert_batch(batch, import.user_id, row_number - batch.size)
            rows_imported += imported
            error_log.concat(batch_errors)
            batch = []
          end
        else
          error_log << { row: row_number, data: row.to_h, reason: error_reason }
        end
      end

      imported, batch_errors = insert_batch(batch, import.user_id, row_number - batch.size) if batch.any?
      rows_imported += imported || 0
      error_log.concat(batch_errors || [])

      import.update!(
        status: "completed",
        row_count: rows_imported,
        error_count: error_log.size,
        error_log: error_log
      )
    rescue StandardError => e
      import.update!(status: "failed", error_count: error_log.size, error_log: error_log)
      Rails.logger.error("CSV import #{import_id} failed: #{e.message}")
    ensure
      File.delete(file_path) if File.exist?(file_path)
    end

    DashboardStatsCache.invalidate(import.user_id)
  end

  private

  # Returns [Date, nil] on success or [nil, error_string] on failure.
  # Separates "unrecognizable format" from "impossible calendar value" so the
  # error message tells the user exactly what went wrong.
  def parse_date(raw)
    return [nil, "Date is blank — every row must have a date"] if raw.blank?

    # Explicit numeric formats — regex extracts parts unambiguously so we can
    # use Date.new(year, mon, mday) and get precise calendar errors.
    NUMERIC_DATE_PATTERNS.each do |pattern, extractor|
      m = raw.match(pattern)
      next unless m

      p = extractor.call(m)
      begin
        date = Date.new(p[:year], p[:mon], p[:mday])
        return future_date_error(raw, date) if date > Date.today
        return [date, nil]
      rescue Date::Error, ArgumentError, RangeError
        return [nil, calendar_error(raw, p[:mon], p[:mday])]
      end
    end

    # Natural-language fallback: "Jan 15 2024", "15 January 2024", etc.
    parts = (Date._parse(raw, false) rescue {})
    if parts.empty?
      return [nil, "Unrecognized date format '#{raw}' — " \
                   "accepted formats: MM/DD/YYYY, YYYY-MM-DD, MM-DD-YYYY, Jan 15 2024"]
    end

    begin
      date = Date.parse(raw)
      return future_date_error(raw, date) if date > Date.today
      [date, nil]
    rescue ArgumentError, Date::Error
      [nil, calendar_error(raw, parts[:mon], parts[:mday])]
    end
  end

  def future_date_error(raw, date)
    [nil, "Date '#{raw}' (#{date}) is in the future — transactions cannot be dated after today (#{Date.today})"]
  end

  NUMERIC_DATE_PATTERNS = [
    # YYYY-MM-DD or YYYY/MM/DD  (ISO 8601 — unambiguous)
    [
      /\A(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})\z/,
      ->(m) { { year: m[1].to_i, mon: m[2].to_i, mday: m[3].to_i } }
    ],
    # MM/DD/YYYY  (US slash format)
    [
      /\A(\d{1,2})\/(\d{1,2})\/(\d{4})\z/,
      ->(m) { { mon: m[1].to_i, mday: m[2].to_i, year: m[3].to_i } }
    ],
    # MM-DD-YYYY  (US dash format — most common CSV export style)
    [
      /\A(\d{1,2})-(\d{1,2})-(\d{4})\z/,
      ->(m) { { mon: m[1].to_i, mday: m[2].to_i, year: m[3].to_i } }
    ],
  ].freeze

  def calendar_error(raw, mon, mday)
    reason = if mon.nil? || mday.nil?
      "this date does not exist in the calendar"
    elsif mon < 1 || mon > 12
      "month #{mon} does not exist (valid range: 01-12)"
    elsif mday < 1 || mday > 31
      "day #{mday} is out of range (valid range: 01-31)"
    else
      month_name = Date::MONTHNAMES[mon] || "month #{mon}"
      "#{month_name} does not have #{mday} days"
    end
    "Invalid date '#{raw}' — #{reason}"
  end

  def map_row(row)
    headers = row.headers
    mapping = {}

    COLUMN_ALIASES.each do |field, aliases|
      matched = aliases.find { |a| headers.include?(a) }
      mapping[field] = matched if matched
    end

    return nil unless REQUIRED_COLUMNS.all? { |c| mapping.key?(c) }

    mapping
  end

  def missing_columns_reason(row)
    headers = row.headers
    missing = REQUIRED_COLUMNS.reject do |col|
      COLUMN_ALIASES[col].any? { |a| headers.include?(a) }
    end
    "Missing required column(s): #{missing.join(', ')}"
  end

  def build_record(user_id, mapping, row, import_ts, import_filename)
    raw_date = row[mapping["date"]].to_s.strip
    raw_amount = row[mapping["amount"]].to_s.strip

    date_val, date_error = parse_date(raw_date)
    return nil, date_error if date_error

    # Pre-flag blank amounts before parsing — still import as 0 rather than reject
    pre_flags = {}
    if raw_amount.blank?
      pre_flags["missing_amount"] = {
        message: "Missing Transaction Amount",
        detected_at: Time.current.iso8601
      }
    end

    # Strip currency symbols, commas, and handle unicode minus sign
    cleaned_amount = raw_amount.gsub(/[,$]/, "").gsub("−", "-")
    amount_val = cleaned_amount.to_f

    if amount_val == 0 && cleaned_amount !~ /\A-?0*(\.0*)?\z/
      return nil, "Invalid amount: '#{raw_amount}' — could not be read as a number"
    end

    record = {
      user_id: user_id,
      date: date_val,
      amount: amount_val,
      description: row[mapping["description"]]&.to_s&.strip,
      category: row[mapping["category"]]&.to_s&.strip.presence,
      status: "pending",
      source: "csv",
      anomaly_flags: pre_flags,
      created_ts_utc_iso: import_ts,
      import_file_name: import_filename,
      created_at: Time.current,
      updated_at: Time.current
    }
    [record, nil]
  rescue ArgumentError
    [nil, "Could not parse row — please check the date and amount values"]
  end

  def insert_batch(batch, user_id, start_row = 0)
    return [0, []] if batch.empty?

    # Skip duplicate rows within the same CSV batch
    seen_in_batch = Set.new
    deduped_batch = batch.filter do |r|
      key = "#{r[:date]}|#{r[:description]}|#{r[:amount]}"
      next false if seen_in_batch.include?(key)

      seen_in_batch.add(key)
      true
    end

    existing_keys = Transaction
      .where(user_id: user_id)
      .where(date: deduped_batch.map { |r| r[:date] }.uniq)
      .pluck(:date, :description, :amount)
      .map { |d, desc, a| "#{d}|#{desc}|#{a}" }
      .to_set

    unique_batch = deduped_batch.reject do |r|
      existing_keys.include?("#{r[:date]}|#{r[:description]}|#{r[:amount]}")
    end

    return [0, []] if unique_batch.empty?

    user = User.find_by(id: user_id)
    if user
      unique_batch.each do |record|
        txn = Transaction.new(record.merge(user: user))
        AnomalyDetector.call(txn)
        RulesEngine.call(txn)
        record[:anomaly_flags] = txn.anomaly_flags
        record[:category] = txn.category
        # Imported records must always land as pending or flagged — never approved.
        # AnomalyDetector may set flagged; RulesEngine may promote to approved; we undo that.
        record[:status] = txn.anomaly_flags.any? ? "flagged" : "pending"
      end
    end

    result = Transaction.insert_all(
      unique_batch,
      unique_by: [:user_id, :date, :description, :amount],
      returning: [:id, :category]
    )
    inserted_count = result.rows.size

    if inserted_count.zero?
      Rails.logger.warn(
        "CSV import batch insert saved 0 of #{unique_batch.size} rows for user #{user_id}"
      )
    end

    # Enqueue AI categorization for any rows the rules engine couldn't tag
    result.each do |row|
      AiCategorizationJob.perform_async(row["id"]) if row["category"].blank?
    end

    [inserted_count, []]
  rescue StandardError => e
    Rails.logger.error("Batch insert failed: #{e.message}")
    [0, [{ row: start_row, reason: "Batch failed to import: #{e.message}" }]]
  end
end
