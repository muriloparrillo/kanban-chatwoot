class Lead < ApplicationRecord
  belongs_to :account
  belongs_to :funnel
  belongs_to :stage
  belongs_to :product, optional: true  # mantido para retrocompatibilidade

  has_many :notes,         class_name: 'LeadNote',       dependent: :destroy
  has_many :attachments,   class_name: 'LeadAttachment', dependent: :destroy
  has_many :histories,     class_name: 'LeadHistory',    dependent: :destroy
  has_many :lead_products, dependent: :destroy
  has_many :products,      through: :lead_products
  has_and_belongs_to_many :tags

  validates :title, presence: true

  before_validation :ensure_consistent_funnel
  after_create :record_creation_history

  scope :active,    -> { where(archived_at: nil) }
  scope :archived,  -> { where.not(archived_at: nil) }
  scope :on_stage,  ->(stage_id) { where(stage_id: stage_id) }
  scope :search,    ->(q) {
    like = "%#{q}%"
    where('title ILIKE ? OR contact_name ILIKE ? OR contact_email ILIKE ? OR contact_phone ILIKE ?', like, like, like, like)
  }

  def move_to!(new_stage, actor: nil, position: nil)
    prev = { stage_id: stage_id, position: self.position }
    self.stage = new_stage
    self.moved_to_stage_at = Time.current
    self.last_activity_at = Time.current
    self.position = position if position
    save!
    histories.create!(
      event: 'moved',
      actor_chatwoot_user_id: actor&.dig(:id),
      actor_name: actor&.dig(:name),
      payload: { from: prev, to: { stage_id: new_stage.id, position: self.position } }
    )
  end

  def archive!(actor: nil)
    update!(archived_at: Time.current)
    histories.create!(event: 'archived', actor_chatwoot_user_id: actor&.dig(:id), actor_name: actor&.dig(:name))
  end

  def unarchive!
    update!(archived_at: nil)
  end

  private

  def ensure_consistent_funnel
    self.funnel_id = stage.funnel_id if stage && funnel_id != stage.funnel_id
  end

  def record_creation_history
    histories.create!(event: 'created', payload: { title: title, stage_id: stage_id })
  end
end
