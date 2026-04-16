class Tag < ApplicationRecord
  belongs_to :account
  has_and_belongs_to_many :leads

  validates :name, presence: true, uniqueness: { scope: :account_id, case_sensitive: false }
end
