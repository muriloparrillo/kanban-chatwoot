class ScheduledMessage < ApplicationRecord
  belongs_to :account
  belongs_to :lead, optional: true

  validates :message, :scheduled_at, presence: true
  validates :status, inclusion: { in: %w[pending sent failed cancelled] }

  scope :pending,  -> { where(status: 'pending') }
  scope :due,      -> { pending.where('scheduled_at <= ?', Time.current) }
  scope :upcoming, -> { pending.where('scheduled_at > ?', Time.current).order(:scheduled_at) }
end
