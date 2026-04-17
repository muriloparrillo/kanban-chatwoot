class CreateProducts < ActiveRecord::Migration[7.1]
  def change
    create_table :products do |t|
      t.references :account, null: false, foreign_key: true
      t.string  :name,        null: false
      t.text    :description
      t.decimal :value,       precision: 12, scale: 2
      t.string  :currency,    default: 'BRL', null: false
      t.boolean :active,      default: true,  null: false

      t.timestamps
    end

    add_index :products, [:account_id, :name]
  end
end
