class Task < ApplicationRecord
  belongs_to :account
  belongs_to :lead, optional: true

  validates :title,    presence: true
  validates :status,   inclusion: { in: %w[pending done cancelled] }
  validates :priority, inclusion: { in: %w[low medium high] }

  scope :pending,   -> { where(status: 'pending') }
  scope :done,      -> { where(status: 'done') }
  scope :overdue,   -> { pending.where('due_at < ?', Time.current) }
  scope :due_today, -> { pending.where(due_at: Time.current.beginning_of_day..Time.current.end_of_day) }
  scope :ordered,   -> { order(Arel.sql("CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, due_at ASC NULLS LAST, created_at ASC")) }
end
