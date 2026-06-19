FactoryBot.define do
  factory :category do
    association :user
    sequence(:name) { |n| "Category #{n}" }
    color { "#6b7280" }
  end
end
