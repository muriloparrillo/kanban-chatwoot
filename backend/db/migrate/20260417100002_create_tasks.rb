class CreateTasks < ActiveRecord::Migration[7.1]
  def change
    create_table :tasks do |t|
      t.references :account, null: false, foreign_key: true
      t.references :lead,    null: true,  foreign_key: true

      t.string  :title,       null: false
      t.text    :description
      t.string  :status,      null: false, default: 'pending'  # pending, done, cancelled
      t.string  :priority,    null: false, default: 'medium'   # low, medium, high
      t.datetime :due_at
      t.string  :assignee_chatwoot_user_id
      t.string  :assignee_name

      t.timestamps
    end

    add_index :tasks, [:account_id, :status], if_not_exists: true
    add_index :tasks, [:account_id, :due_at], if_not_exists: true
    add_index :tasks, [:lead_id],             if_not_exists: true
  end
end
