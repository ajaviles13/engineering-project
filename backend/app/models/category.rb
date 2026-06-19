class Category < ApplicationRecord
  belongs_to :user
  has_many :rules, dependent: :nullify

  validates :name, presence: true, uniqueness: { scope: :user_id }

  DEFAULT_CATEGORIES = [
    { name: "Food & Dining", color: "#ef4444" },
    { name: "Shopping", color: "#f97316" },
    { name: "Transportation", color: "#eab308" },
    { name: "Entertainment", color: "#22c55e" },
    { name: "Healthcare", color: "#06b6d4" },
    { name: "Housing", color: "#6366f1" },
    { name: "Utilities", color: "#8b5cf6" },
    { name: "Income", color: "#10b981" },
    { name: "High Value", color: "#f43f5e" },
    { name: "Other", color: "#6b7280" }
  ].freeze
end
