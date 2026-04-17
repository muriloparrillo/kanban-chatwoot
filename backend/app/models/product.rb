class Product < ApplicationRecord
  belongs_to :account
  has_many   :leads, dependent: :nullify

  validates :name, presence: true, length: { maximum: 255 }
  validates :currency, presence: true

  scope :active,  -> { where(active: true) }
  scope :ordered, -> { order(Arel.sql('LOWER(name)')) }

  default_scope { order(Arel.sql('LOWER(name)')) }
end
