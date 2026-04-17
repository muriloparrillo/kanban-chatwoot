class AddBillingTypeToProducts < ActiveRecord::Migration[7.1]
  def change
    add_column :products, :billing_type, :string, default: 'one_time', null: false
  end
end
