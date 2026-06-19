FactoryBot.define do
  factory :rule do
    association :user
    association :category
    sequence(:name) { |n| "Rule #{n}" }
    condition_field { "description" }
    condition_operator { "contains" }
    condition_value { "Amazon" }
    action_type { "categorize" }
    action_value { category.name }
    priority { 0 }
    active { true }
  end
end
