class Rule < ApplicationRecord
  belongs_to :user
  belongs_to :category, optional: true  # legacy FK; new rules use action_value instead

  CONDITION_FIELDS = %w[description amount date].freeze
  CONDITION_OPERATORS = {
    "description" => %w[contains starts_with ends_with matches_regex],
    "amount" => %w[gt lt gte lte eq],
    "date" => %w[day_of_week month]
  }.freeze
  ACTION_TYPES = %w[categorize flag set_status].freeze
  VALID_STATUSES = %w[pending approved flagged].freeze

  validates :name, presence: true
  validates :condition_field, inclusion: { in: CONDITION_FIELDS }
  validates :condition_operator, presence: true
  validates :condition_value, presence: true
  validates :action_type, inclusion: { in: ACTION_TYPES }
  validates :action_value, presence: true
  validates :priority, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validate :valid_action_value_for_type

  scope :active, -> { where(active: true) }
  scope :by_priority, -> { order(priority: :asc) }

  def overlaps_with?(other)
    return false unless active? && other.active?
    return false unless condition_field == other.condition_field

    case condition_field
    when "description" then description_overlaps?(other)
    when "amount" then amount_overlaps?(other)
    when "date" then date_overlaps?(other)
    else false
    end
  end

  private

  def valid_action_value_for_type
    return unless action_type == "set_status"
    unless VALID_STATUSES.include?(action_value)
      errors.add(:action_value, "must be one of: #{VALID_STATUSES.join(', ')}")
    end
  end

  def description_overlaps?(other)
    op_a = condition_operator
    op_b = other.condition_operator

    if op_a == "contains" && op_b == "contains"
      a = condition_value.to_s.downcase
      b = other.condition_value.to_s.downcase
      a.include?(b) || b.include?(a)
    elsif op_a == op_b
      condition_value.to_s.downcase == other.condition_value.to_s.downcase
    else
      false
    end
  end

  def amount_overlaps?(other)
    op_a = condition_operator
    op_b = other.condition_operator
    val_a = condition_value.to_f
    val_b = other.condition_value.to_f

    # Both open upward — any value above the higher threshold satisfies both
    return true if %w[gt gte].include?(op_a) && %w[gt gte].include?(op_b)
    # Both open downward
    return true if %w[lt lte].include?(op_a) && %w[lt lte].include?(op_b)

    # One upward, one downward
    if %w[gt gte].include?(op_a) && %w[lt lte].include?(op_b)
      return op_a == "gte" && op_b == "lte" ? val_a <= val_b : val_a < val_b
    end
    if %w[lt lte].include?(op_a) && %w[gt gte].include?(op_b)
      return op_b == "gte" && op_a == "lte" ? val_b <= val_a : val_b < val_a
    end

    # eq vs eq
    return val_a == val_b if op_a == "eq" && op_b == "eq"

    # eq vs range
    return amount_satisfies?(val_a, op_b, val_b) if op_a == "eq"
    return amount_satisfies?(val_b, op_a, val_a) if op_b == "eq"

    false
  end

  def date_overlaps?(other)
    condition_operator == other.condition_operator &&
      condition_value.to_s.downcase == other.condition_value.to_s.downcase
  end

  def amount_satisfies?(x, op, val)
    case op
    when "gt"  then x > val
    when "gte" then x >= val
    when "lt"  then x < val
    when "lte" then x <= val
    else false
    end
  end
end
