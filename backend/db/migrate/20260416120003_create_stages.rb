class CreateStages < ActiveRecord::Migration[7.1]
  def change
    create_table :stages do |t|
      t.references :funnel, null: false, foreign_key: true, index: true
      t.string  :name, null: false
      t.string  :color, default: '#64748b'
      t.integer :position, null: false, default: 0
      t.string  :stage_type, default: 'open'     # open | won | lost | custom
      t.integer :sla_hours                        # optional SLA
      t.boolean :active, default: true
      t.jsonb   :settings, default: {}, null: false
      t.timestamps
    end

    add_index :stages, %i[funnel_id position]
  end
end
