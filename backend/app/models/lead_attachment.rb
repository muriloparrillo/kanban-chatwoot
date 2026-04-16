class LeadAttachment < ApplicationRecord
  belongs_to :lead
  validates :filename, :storage_key, presence: true

  after_create :log_history

  private

  def log_history
    lead.histories.create!(
      event: 'attachment_added',
      actor_chatwoot_user_id: uploader_chatwoot_user_id,
      payload: { filename: filename, id: id }
    )
  end
end
