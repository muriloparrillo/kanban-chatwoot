class CreateScheduledMessages < ActiveRecord::Migration[7.1]
  def change
    create_table :scheduled_messages do |t|
      t.references :account, null: false, foreign_key: true
      t.references :lead,    null: true,  foreign_key: true
      t.integer    :chatwoot_conversation_id
      t.integer    :chatwoot_inbox_id
      t.text       :message,      null: false
      t.datetime   :scheduled_at, null: false
      t.datetime   :sent_at
      t.string     :status,       default: 'pending', null: false  # pending | sent | failed | cancelled
      t.text       :error_message

      t.timestamps
    end

    add_index :scheduled_messages, [:account_id, :status]
    add_index :scheduled_messages, :scheduled_at
  end
end
