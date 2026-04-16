class LeadNote < ApplicationRecord
  belongs_to :lead
  validates :body, presence: true

  after_create :log_history

  private

  def log_history
    lead.histories.create!(
      event: 'note_added',
      actor_chatwoot_user_id: author_chatwoot_user_id,
      actor_name: author_name,
      payload: { note_id: id, excerpt: body.to_s.truncate(140) }
    )
  end
end
