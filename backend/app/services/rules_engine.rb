class RulesEngine
  def self.call(transaction)
    new(transaction).call
  end

  def initialize(transaction)
    @transaction = transaction
    @user = transaction.user
  end

  def call
    return if @user.nil?

    # 1. Check hierarchical rule set (Category Tags — YAML keyword matching)
    if (matched_category = match_from_rule_set)
      @transaction.category = matched_category
      @transaction.status = "approved" if @transaction.status == "pending"
      return matched_category
    end

    # 2. Check custom rules (Rule AR model); collect ALL matches to detect conflicts
    rules = @user.rules.active.by_priority
    matching_rules = rules.select { |rule| matches_rule?(rule) }

    if matching_rules.size > 1
      @transaction.anomaly_flags = (@transaction.anomaly_flags || {}).merge(
        "rules_conflict" => {
          message: "Two Custom Rules match this record — please review manually",
          rule_names: matching_rules.map(&:name),
          detected_at: Time.current.iso8601
        }
      )
      @transaction.status = "flagged"
      return nil
    elsif matching_rules.size == 1
      apply_rule_action(matching_rules.first)
      return matching_rules.first
    end

    nil
  end

  def apply_rule_if_matches(rule)
    return false unless matches_rule?(rule)
    apply_rule_action(rule)
    true
  end

  private

  def match_from_rule_set
    rule_set = @user.rule_set
    return nil unless rule_set

    content = rule_set.content
    return nil unless content["categories"].present?

    desc = @transaction.description.to_s.downcase.strip

    content["categories"].each do |parent_name, children|
      next unless children.is_a?(Hash)

      children.each do |child_name, child_data|
        next unless child_data.is_a?(Hash)

        keywords  = Array(child_data["keywords"])
        merchants = Array(child_data["merchants"])

        if (keywords + merchants).any? { |pattern| desc.include?(pattern.to_s.downcase) }
          return "#{parent_name} > #{child_name}"
        end
      end
    end

    nil
  end

  def apply_rule_action(rule)
    case rule.action_type
    when "categorize"
      @transaction.category = rule.action_value
      @transaction.status = "approved" if @transaction.status == "pending"
    when "flag"
      @transaction.anomaly_flags = (@transaction.anomaly_flags || {}).merge(
        "custom_flag_#{rule.id}" => {
          message: rule.action_value,
          rule_name: rule.name,
          detected_at: Time.current.iso8601
        }
      )
      @transaction.status = "flagged"
    when "set_status"
      @transaction.status = rule.action_value
    end
  end

  def matches_rule?(rule)
    case rule.condition_field
    when "description" then description_matches?(rule)
    when "amount"       then amount_matches?(rule)
    when "date"         then date_matches?(rule)
    else false
    end
  rescue StandardError
    false
  end

  def description_matches?(rule)
    desc = @transaction.description.to_s
    value = rule.condition_value

    case rule.condition_operator
    when "contains"      then desc.downcase.include?(value.downcase)
    when "starts_with"   then desc.downcase.start_with?(value.downcase)
    when "ends_with"     then desc.downcase.end_with?(value.downcase)
    when "matches_regex" then Regexp.new(value, Regexp::IGNORECASE).match?(desc)
    else false
    end
  end

  def amount_matches?(rule)
    amount = @transaction.amount.to_f
    value = rule.condition_value.to_f

    case rule.condition_operator
    when "gt"  then amount > value
    when "lt"  then amount < value
    when "gte" then amount >= value
    when "lte" then amount <= value
    when "eq"  then amount == value
    else false
    end
  end

  def date_matches?(rule)
    date = @transaction.date
    return false unless date

    case rule.condition_operator
    when "day_of_week"
      date.strftime("%A").downcase == rule.condition_value.downcase
    when "month"
      month_val = rule.condition_value.to_i
      month_val > 0 ? date.month == month_val : date.strftime("%B").downcase == rule.condition_value.downcase
    else false
    end
  end
end
