FactoryBot.define do
  factory :jwt_denylist do
    jti { "MyString" }
    exp { "2026-06-18 11:35:19" }
  end
end
