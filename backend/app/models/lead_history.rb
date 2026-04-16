class LeadHistory < ApplicationRecord
  belongs_to :lead
  validates :event, presence: true
  scope :recent, -> { order(created_at: :desc) }
end
