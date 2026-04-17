class Account < ApplicationRecord
  has_many :funnels,            dependent: :destroy
  has_many :leads,              dependent: :destroy
  has_many :tags,               dependent: :destroy
  has_many :products,           dependent: :destroy
  has_many :scheduled_messages, dependent: :destroy

  validates :chatwoot_account_id, :name, :chatwoot_base_url, :chatwoot_api_access_token, presence: true
  validates :chatwoot_account_id, uniqueness: true

  before_validation :ensure_tokens
  after_create      :create_default_funnel

  # Build an authenticated Chatwoot API client for this account
  def chatwoot_client
    @chatwoot_client ||= Chatwoot::Client.new(
      base_url:     chatwoot_base_url,
      access_token: chatwoot_api_access_token,
      account_id:   chatwoot_account_id
    )
  end

  def default_funnel
    funnels.where(is_default: true).first || funnels.order(:position).first
  end

  private

  def ensure_tokens
    self.account_token   ||= SecureRandom.hex(24)
    self.webhook_secret  ||= SecureRandom.hex(32)
  end

  def create_default_funnel
    # Usa create (sem bang) para não propagar exceção no pipeline de request
    funnels.create(name: 'Funil Principal', is_default: true) if funnels.empty?
  rescue => e
    Rails.logger.warn "[CRM] create_default_funnel falhou para account #{id}: #{e.message}"
  end
end
