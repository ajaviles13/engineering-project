FactoryBot.define do
  factory :import do
    user { nil }
    filename { "MyString" }
    status { "MyString" }
    row_count { 1 }
    error_count { 1 }
  end
end
