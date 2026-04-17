class AddProductIdToLeads < ActiveRecord::Migration[7.1]
  def change
    add_reference :leads, :product, foreign_key: true, null: true
  end
end
