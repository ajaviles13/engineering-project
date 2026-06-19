module Api
  module V1
    class TransactionsController < ApplicationController
      DEFAULT_PAGE_SIZE = 50
      PAGE_SIZE_OPTIONS = [25, 50, 100, 200].freeze
      SORT_COLUMNS = %w[date description amount category status created_at].freeze

      before_action :set_transaction, only: %i[show update destroy]
      after_action :invalidate_dashboard_cache, only: %i[create update destroy bulk]

      def index
        scope = filtered_transactions
        sort_by, sort_dir = sort_params
        total_count = first_page? ? scope.count : nil

        transactions = apply_sort(scope, sort_by, sort_dir)
        transactions = apply_cursor(transactions, sort_by, sort_dir)

        page_size = validated_page_size
        transactions = transactions.limit(page_size + 1)
        records = transactions.to_a

        has_more = records.size > page_size
        records = records.first(page_size)

        next_cursor = if has_more && records.last
          {
            id: records.last.id,
            sort_by: sort_by,
            sort_dir: sort_dir,
            sort_value: cursor_value_for(records.last, sort_by)
          }
        end

        render json: {
          transactions: serialize_transactions(records),
          next_cursor: next_cursor,
          has_more: has_more,
          total_count: total_count
        }
      end

      def show
        render json: { transaction: serialize_transaction(@transaction) }
      end

      def create
        transaction = current_user.transactions.build(transaction_params)
        transaction.source = "manual"
        transaction.created_ts_utc_iso = Time.now.utc.iso8601

        AnomalyDetector.call(transaction)
        RulesEngine.call(transaction)

        transaction.save!

        AiCategorizationJob.perform_async(transaction.id) if transaction.category.blank?

        render json: { transaction: serialize_transaction(transaction) }, status: :created
      end

      def update
        @transaction.assign_attributes(transaction_params)

        if params[:transaction][:status] == "approved"
          @transaction.status = "approved"
        end

        @transaction.save!
        render json: { transaction: serialize_transaction(@transaction) }
      end

      def destroy
        @transaction.destroy!
        render json: { message: "Transaction deleted" }
      end

      def bulk
        ids = params[:ids] || []
        transactions = current_user.transactions.where(id: ids)

        case params[:action_type]
        when "categorize"
          transactions.update_all(category: params[:category])
        when "approve"
          transactions.update_all(status: "approved")
        when "delete"
          transactions.destroy_all
        else
          render json: { error: "Unknown bulk action" }, status: :bad_request
          return
        end

        render json: { message: "Bulk action applied", count: transactions.count }
      end

      private

      def set_transaction
        @transaction = current_user.transactions.find(params[:id])
      end

      def transaction_params
        params.require(:transaction).permit(:date, :description, :amount, :category, :status)
      end

      def filtered_transactions
        transactions = current_user.transactions

        transactions = transactions.where(status: params[:status]) if params[:status].present?
        transactions = transactions.where(category: params[:category]) if params[:category].present?
        transactions = transactions.where(date: params[:start_date]..params[:end_date]) if params[:start_date].present?
        transactions = transactions.uncategorized if params[:uncategorized] == "true"
        transactions = transactions.flagged if params[:flagged] == "true"
        transactions = transactions.needs_attention if params[:needs_review] == "true"
        transactions = transactions.where(import_file_name: params[:import_file]) if params[:import_file].present?

        if params[:search].present?
          transactions = transactions.where("description ILIKE ?", "%#{params[:search]}%")
        end

        transactions
      end

      def first_page?
        params[:cursor_id].blank? && params[:cursor_date].blank?
      end

      def validated_page_size
        size = params[:per_page].to_i
        PAGE_SIZE_OPTIONS.include?(size) ? size : DEFAULT_PAGE_SIZE
      end

      def invalidate_dashboard_cache
        DashboardStatsCache.invalidate(current_user.id)
      end

      def sort_params
        sort_by = SORT_COLUMNS.include?(params[:sort_by].to_s) ? params[:sort_by].to_s : "date"
        sort_dir = params[:sort_dir].to_s == "asc" ? "asc" : "desc"
        [sort_by, sort_dir]
      end

      def apply_sort(transactions, sort_by, sort_dir)
        dir = sort_dir == "asc" ? :asc : :desc
        transactions.reorder(sort_by => dir, id: dir)
      end

      def apply_cursor(transactions, sort_by, sort_dir)
        if params[:cursor_id].present? && params[:cursor_sort_value].present?
          cursor_sort_by = SORT_COLUMNS.include?(params[:cursor_sort_by].to_s) ? params[:cursor_sort_by].to_s : sort_by
          cursor_sort_dir = params[:cursor_sort_dir].to_s == "asc" ? "asc" : "desc"
          return transactions unless cursor_sort_by == sort_by && cursor_sort_dir == sort_dir

          op = sort_dir == "asc" ? ">" : "<"
          value = cast_cursor_value(cursor_sort_by, params[:cursor_sort_value])
          transactions.where("(#{cursor_sort_by}, transactions.id) #{op} (?, ?)", value, params[:cursor_id])
        elsif params[:cursor_date].present? && params[:cursor_id].present? && sort_by == "date" && sort_dir == "desc"
          transactions.after_cursor(params[:cursor_date], params[:cursor_id])
        else
          transactions
        end
      end

      def cursor_value_for(record, sort_by)
        value = record.public_send(sort_by)
        case sort_by
        when "created_at" then value&.iso8601(3)
        when "date" then value&.iso8601
        else value
        end
      end

      def cast_cursor_value(sort_by, value)
        case sort_by
        when "date" then Date.parse(value.to_s)
        when "amount" then value.to_d
        when "created_at" then Time.zone.parse(value.to_s)
        else value
        end
      end

      def serialize_transactions(records)
        records.map { |t| serialize_transaction(t) }
      end

      def serialize_transaction(t)
        {
          id: t.id,
          date: t.date,
          description: t.description,
          amount: t.amount,
          category: t.category,
          status: t.status,
          source: t.source,
          anomaly_flags: t.anomaly_flags,
          created_ts_utc_iso: t.created_ts_utc_iso,
          import_file_name: t.import_file_name,
          created_at: t.created_at
        }
      end
    end
  end
end
