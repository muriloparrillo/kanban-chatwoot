class Stage < ApplicationRecord
  belongs_to :funnel
  has_many :leads, dependent: :nullify

  validates :name, presence: true
  validates :stage_type, inclusion: { in: %w[open won lost custom] }

  scope :active, -> { where(active: true) }
  scope :ordered, -> { order(:position, :id) }

  delegate :account, to: :funnel
end
