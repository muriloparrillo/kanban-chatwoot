class CreateLeadNotes < ActiveRecord::Migration[7.1]
  def change
    create_table :lead_notes do |t|
      t.references :lead, null: false, foreign_key: true, index: true
      t.bigint :author_chatwoot_user_id
      t.string :author_name
      t.text   :body, null: false
      t.timestamps
    end
  end
end
