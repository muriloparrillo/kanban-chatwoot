class CreateLeads < ActiveRecord::Migration[7.1]
  def change
    create_table :leads do |t|
      t.references :account, null: false, foreign_key: true, index: true
      t.references :funnel,  null: false, foreign_key: true, index: true
      t.references :stage,   null: false, foreign_key: true, index: true

      t.string  :title, null: false
      t.text    :description
      t.decimal :value, precision: 12, scale: 2, default: 0
      t.string  :currency, default: 'BRL'

      # Contact info
      t.string  :contact_name
      t.string  :contact_email
      t.string  :contact_phone
      t.bigint  :chatwoot_contact_id
      t.bigint  :chatwoot_conversation_id
      t.string  :chatwoot_inbox_name

      # Assignment (agent mirrored from Chatwoot)
      t.bigint  :assignee_chatwoot_user_id
      t.string  :assignee_name
      t.string  :assignee_avatar_url

      t.datetime :due_at
      t.datetime :last_activity_at
      t.datetime :moved_to_stage_at
      t.datetime :archived_at

      t.integer :position, default: 0
      t.integer :priority, default: 0           # 0 none, 1 low, 2 medium, 3 high, 4 urgent
      t.string  :source                          # conversation | manual | import | api
      t.jsonb   :custom_fields, default: {}, null: false

      t.timestamps
    end

    add_index :leads, %i[stage_id position]
    add_index :leads, :chatwoot_conversation_id
    add_index :leads, :chatwoot_contact_id
    add_index :leads, :archived_at
  end
end
