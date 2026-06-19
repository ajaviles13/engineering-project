FactoryBot.define do
  factory :transaction do
    association :user
    date { Faker::Date.backward(days: 365) }
    description { Faker::Commerce.product_name }
    amount { -rand(10.0..500.0).round(2) }
    category { nil }
    status { "pending" }
    source { "manual" }
    anomaly_flags { {} }
  end
end
