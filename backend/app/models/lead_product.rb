class LeadProduct < ApplicationRecord
  belongs_to :lead
  belongs_to :product

  validates :product_id, uniqueness: { scope: :lead_id }

  # Usa o valor do produto como padrão se unit_value não for informado
  before_validation :inherit_product_value, on: :create

  private

  def inherit_product_value
    self.unit_value ||= product&.value
  end
end
