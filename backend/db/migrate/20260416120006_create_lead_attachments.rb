class CreateLeadAttachments < ActiveRecord::Migration[7.1]
  def change
    create_table :lead_attachments do |t|
      t.references :lead, null: false, foreign_key: true, index: true
      t.string  :filename, null: false
      t.string  :content_type
      t.integer :byte_size
      t.string  :storage_key, null: false   # S3 object key or local path
      t.string  :url
      t.bigint  :uploader_chatwoot_user_id
      t.timestamps
    end
  end
end
