module Api
  module V1
    class DashboardController < ApplicationController
      def stats
        render json: compute_stats
      end

      private

      def compute_stats
        txns = current_user.transactions

        spending_by_category = txns
          .where.not(category: [nil, ""])
          .where("amount < 0")
          .group(:category)
          .sum(:amount)
          .transform_values(&:abs)
          .sort_by { |_, v| -v }
          .first(10)
          .to_h

        monthly_totals = txns
          .where(date: 12.months.ago..)
          .group("DATE_TRUNC('month', date)")
          .sum(:amount)
          .transform_keys { |k| k.strftime("%Y-%m") }
          .sort
          .to_h

        {
          total_transactions: txns.count,
          flagged_count: txns.flagged.count,
          uncategorized_count: txns.uncategorized.count,
          pending_review_count: txns.for_review.count,
          total_amount: txns.sum(:amount),
          spending_by_category: spending_by_category,
          monthly_totals: monthly_totals
        }
      end
    end
  end
end
