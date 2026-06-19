class User < ApplicationRecord
  devise :database_authenticatable, :registerable,
         :recoverable, :validatable,
         :jwt_authenticatable, jwt_revocation_strategy: JwtDenylist

  has_many :transactions, dependent: :destroy
  has_many :categories, dependent: :destroy
  has_many :rules, dependent: :destroy
  has_many :imports, dependent: :destroy
  has_one :rule_set, dependent: :destroy

  after_create :seed_rule_set

  private

  def seed_rule_set
    create_rule_set!(content: RuleSet.default_content)
  end
end
