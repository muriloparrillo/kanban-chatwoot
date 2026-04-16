class CreateLeadHistories < ActiveRecord::Migration[7.1]
  def change
    create_table :lead_histories do |t|
      t.references :lead, null: false, foreign_key: true, index: true
      t.string :event, null: false                 # created | moved | assigned | updated | archived | note_added | attachment_added | tag_added | tag_removed
      t.bigint :actor_chatwoot_user_id
      t.string :actor_name
      t.jsonb  :payload, default: {}, null: false  # before/after snapshots
      t.datetime :created_at, null: false
    end
  end
end
