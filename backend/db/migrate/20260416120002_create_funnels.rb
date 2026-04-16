class CreateFunnels < ActiveRecord::Migration[7.1]
  def change
    create_table :funnels do |t|
      t.references :account, null: false, foreign_key: true, index: true
      t.string  :name, null: false
      t.string  :slug, null: false
      t.text    :description
      t.string  :color, default: '#1f93ff'
      t.integer :position, default: 0
      t.boolean :active, default: true
      t.boolean :is_default, default: false
      t.jsonb   :settings, default: {}, null: false       # e.g. { auto_create_from_conversation: true }
      t.timestamps
    end

    add_index :funnels, %i[account_id slug], unique: true
    add_index :funnels, %i[account_id position]
  end
end
