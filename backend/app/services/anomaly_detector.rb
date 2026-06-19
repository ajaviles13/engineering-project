class AnomalyDetector
  STDDEV_THRESHOLD = 3.0
  HIGH_VALUE_THRESHOLD = 1000.0
  SUSPICIOUS_ROUND_THRESHOLD = 5000.0
  DUPLICATE_WINDOW = 24.hours

  def self.call(transaction)
    new(transaction).call
  end

  def initialize(transaction)
    @transaction = transaction
    @user = transaction.user
    @flags = {}
  end

  def call
    check_missing_metadata
    check_duplicate
    check_unusual_amount
    check_suspicious_round

    # Merge with any pre-set flags (e.g. missing_amount set during CSV import)
    @transaction.anomaly_flags = (@transaction.anomaly_flags || {}).merge(@flags)

    if @transaction.anomaly_flags.any?
      @transaction.status = "flagged"
    end

    @flags
  end

  private

  def check_missing_metadata
    if @transaction.description.blank?
      @flags["missing_description"] = {
        message: "Missing Description",
        detected_at: Time.current.iso8601
      }
    end
  end

  def check_duplicate
    return unless @user

    window_start = @transaction.date.to_time - DUPLICATE_WINDOW
    window_end = @transaction.date.to_time + DUPLICATE_WINDOW

    scope = @user.transactions
      .where(amount: @transaction.amount)
      .where(description: @transaction.description)
      .where(date: window_start.to_date..window_end.to_date)

    scope = scope.where.not(id: @transaction.id) if @transaction.persisted?

    if scope.exists?
      @flags["duplicate"] = {
        message: "Potential Duplicates",
        detected_at: Time.current.iso8601
      }
    end
  end

  def check_unusual_amount
    return unless @user && @transaction.amount

    stats = user_stats_for_category
    return unless stats[:count] >= 10

    amount = @transaction.amount.to_f
    mean = stats[:mean]
    stddev = stats[:stddev]

    return if stddev.nil? || stddev == 0

    z_score = (amount.abs - mean.abs) / stddev
    if z_score > STDDEV_THRESHOLD
      @flags["unusual_amount"] = {
        message: "High Transaction Amount",
        amount: amount,
        mean: mean.round(2),
        stddev: stddev.round(2),
        z_score: z_score.round(2),
        detected_at: Time.current.iso8601
      }
    end
  end

  def check_suspicious_round
    return unless @transaction.amount

    amount = @transaction.amount.to_f.abs
    if amount >= SUSPICIOUS_ROUND_THRESHOLD && (amount % 1000).zero?
      @flags["suspicious_round"] = {
        message: "Suspicious Round Amount",
        amount: amount,
        detected_at: Time.current.iso8601
      }
    end
  end

  def user_stats_for_category
    cache_key = "user_stats_#{@user.id}_#{@transaction.category.presence || 'uncategorized'}"

    cached = Rails.cache.read(cache_key)
    return cached if cached

    scope = @user.transactions.where.not(amount: nil)
    scope = scope.where(category: @transaction.category) if @transaction.category.present?

    result = scope.pick(
      Arel.sql("COUNT(*), AVG(ABS(amount)), STDDEV(ABS(amount))")
    )

    stats = { count: result[0].to_i, mean: result[1].to_f, stddev: result[2].to_f }
    Rails.cache.write(cache_key, stats, expires_in: 1.hour)
    stats
  end
end
