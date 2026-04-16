class CreateTags < ActiveRecord::Migration[7.1]
  def change
    create_table :tags do |t|
      t.references :account, null: false, foreign_key: true, index: true
      t.string :name, null: false
      t.string :color, default: '#64748b'
      t.timestamps
    end

    add_index :tags, %i[account_id name], unique: true

    create_join_table :leads, :tags do |t|
      t.index :lead_id
      t.index :tag_id
      t.index %i[lead_id tag_id], unique: true
    end
  end
end
