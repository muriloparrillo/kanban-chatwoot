class Funnel < ApplicationRecord
  belongs_to :account
  has_many :stages, -> { order(:position) }, dependent: :destroy
  has_many :leads,  dependent: :destroy

  validates :name, presence: true
  validates :slug, presence: true, uniqueness: { scope: :account_id }

  before_validation :generate_slug
  after_create :create_default_stages

  scope :active, -> { where(active: true) }
  scope :ordered, -> { order(:position, :id) }

  def ensure_single_default!
    return unless is_default?

    account.funnels.where.not(id: id).update_all(is_default: false)
  end

  private

  def generate_slug
    return if slug.present?
    base = name.to_s.parameterize
    candidate = base
    i = 1
    while account&.funnels&.where(slug: candidate)&.where&.not(id: id)&.exists?
      i += 1
      candidate = "#{base}-#{i}"
    end
    self.slug = candidate
  end

  def create_default_stages
    default = [
      { name: 'Novo',        color: '#3b82f6', stage_type: 'open', position: 0 },
      { name: 'Qualificado', color: '#8b5cf6', stage_type: 'open', position: 1 },
      { name: 'Proposta',    color: '#f59e0b', stage_type: 'open', position: 2 },
      { name: 'Negociação',  color: '#ef4444', stage_type: 'open', position: 3 },
      { name: 'Ganho',       color: '#10b981', stage_type: 'won',  position: 4 },
      { name: 'Perdido',     color: '#6b7280', stage_type: 'lost', position: 5 }
    ]
    default.each { |attrs| stages.create(attrs) }
  rescue => e
    Rails.logger.warn "[CRM] create_default_stages falhou para funnel #{id}: #{e.message}"
  end
end
