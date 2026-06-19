class Import < ApplicationRecord
  belongs_to :user

  STATUSES = %w[pending processing completed failed].freeze

  validates :filename, presence: true
  validates :status, inclusion: { in: STATUSES }

  scope :recent, -> { order(created_at: :desc) }
end
