class Transaction < ApplicationRecord
  belongs_to :user

  STATUSES = %w[pending approved flagged].freeze
  SOURCES = %w[manual csv].freeze

  validates :date, presence: true
  validates :amount, presence: true, numericality: true
  validates :status, inclusion: { in: STATUSES }
  validates :source, inclusion: { in: SOURCES }

  scope :flagged, -> { where(status: "flagged") }
  scope :pending, -> { where(status: "pending") }
  scope :approved, -> { where(status: "approved") }
  scope :uncategorized, -> { where(category: [nil, ""]) }
  scope :for_review, -> { where(status: %w[pending flagged]) }
  scope :needs_attention, -> {
    where(status: %w[pending flagged]).or(where(category: [nil, ""]))
  }
  scope :by_date, -> { order(date: :desc, id: :desc) }

  # Keyset pagination cursor
  scope :after_cursor, ->(date, id) {
    where("(date, id) < (?, ?)", date, id)
  }

  scope :matching_description_patterns, ->(patterns) {
    normalized = Array(patterns).map { |pattern| RuleSetPatternIndex.normalize(pattern) }.uniq.reject(&:blank?)
    return none if normalized.empty?

    clauses = normalized.map { "LOWER(description) LIKE ?" }
    values = normalized.map { |pattern| "%#{sanitize_sql_like(pattern)}%" }
    where(clauses.join(" OR "), *values)
  }

  # Matches transactions eligible for re-tagging when keywords change:
  #   - description matches keyword AND status != approved  (respect human decisions)
  #   - category matches keyword AND category is a flat/legacy label (no " > ")
  #     e.g. "Entertainment" → eligible; "Meals & Entertainment > Coffee Shops" → skip
  scope :matching_for_recategorization, ->(patterns) {
    normalized = Array(patterns).map { |pattern| RuleSetPatternIndex.normalize(pattern) }.uniq.reject(&:blank?)
    return none if normalized.empty?

    like_values = normalized.map { |pattern| "%#{sanitize_sql_like(pattern)}%" }
    desc_clauses = normalized.map { "LOWER(COALESCE(description, '')) LIKE ?" }
    cat_clauses  = normalized.map { "LOWER(COALESCE(category, '')) LIKE ?" }

    desc_match = where(desc_clauses.join(" OR "), *like_values).where.not(status: "approved")
    cat_match  = where(cat_clauses.join(" OR "), *like_values).where("category NOT LIKE '% > %'")
    desc_match.or(cat_match)
  }

  def flagged?
    anomaly_flags.any? && status == "flagged"
  end
end
