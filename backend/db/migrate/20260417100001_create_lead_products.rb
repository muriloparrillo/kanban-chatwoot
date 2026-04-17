class CreateLeadProducts < ActiveRecord::Migration[7.1]
  def change
    create_table :lead_products do |t|
      t.references :lead,    null: false, foreign_key: true
      t.references :product, null: false, foreign_key: true
      t.decimal    :unit_value, precision: 12, scale: 2
      t.timestamps
    end
    add_index :lead_products, [:lead_id, :product_id], unique: true
  end
end
