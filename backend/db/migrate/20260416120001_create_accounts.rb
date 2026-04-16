class CreateAccounts < ActiveRecord::Migration[7.1]
  def change
    create_table :accounts do |t|
      t.bigint  :chatwoot_account_id, null: false
      t.string  :name, null: false
      t.string  :chatwoot_base_url, null: false           # e.g. https://app.chatwoot.com
      t.string  :chatwoot_api_access_token, null: false   # account API key
      t.string  :webhook_secret, null: false              # for verifying webhook callbacks
      t.string  :account_token, null: false               # opaque public token used in /webhooks/chatwoot/:account_token
      t.jsonb   :settings, default: {}, null: false
      t.datetime :last_synced_at
      t.timestamps
    end

    add_index :accounts, :chatwoot_account_id, unique: true
    add_index :accounts, :account_token, unique: true
  end
end
