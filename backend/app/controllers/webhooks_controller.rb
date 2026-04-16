# Public webhook endpoint for Chatwoot -> Kanban sync.
# URL: POST /webhooks/chatwoot/:account_token
# Chatwoot sends event JSON on conversation/contact/message events.
class WebhooksController < ApplicationController
  def chatwoot
    account = Account.find_by!(account_token: params[:account_token])
    event   = params[:event] || request.headers['X-Chatwoot-Event']
    payload = params.to_unsafe_h.except(:account_token, :controller, :action)

    case event
    when 'conversation_created', 'conversation_updated', 'conversation_status_changed'
      Chatwoot::ConversationSync.new(account).sync_from_webhook(payload)
    when 'contact_updated'
      update_contacts(account, payload)
    when 'message_created'
      bump_activity(account, payload)
    end

    render json: { ok: true }
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'account_not_found' }, status: :not_found
  end

  private

  def update_contacts(account, payload)
    contact_id = payload['id'] || payload.dig('payload', 'id')
    return unless contact_id
    account.leads.where(chatwoot_contact_id: contact_id).find_each do |lead|
      lead.update(
        contact_name:  payload['name']  || lead.contact_name,
        contact_email: payload['email'] || lead.contact_email,
        contact_phone: payload['phone_number'] || lead.contact_phone
      )
    end
  end

  def bump_activity(account, payload)
    conv_id = payload.dig('conversation', 'id') || payload['conversation_id']
    return unless conv_id
    account.leads.where(chatwoot_conversation_id: conv_id).update_all(last_activity_at: Time.current)
  end
end
