module Chatwoot
  # Turns a Chatwoot conversation payload into (or updates) a Lead on the Kanban.
  class ConversationSync
    def initialize(account)
      @account = account
    end

    def sync_from_webhook(payload)
      # payload is the Chatwoot webhook JSON for conversation_created / updated
      return unless payload.present?
      conversation = payload.is_a?(Hash) ? payload : payload.to_h
      upsert_lead(conversation)
    end

    def backfill!(limit: 100)
      count = 0
      page  = 1
      loop do
        res = @account.chatwoot_client.conversations(page: page)
        data = res.dig('data', 'payload') || res['payload'] || []
        break if data.empty?
        data.each do |conv|
          upsert_lead(conv)
          count += 1
          return count if count >= limit
        end
        page += 1
      end
      count
    end

    private

    def upsert_lead(conv)
      funnel = @account.default_funnel || @account.funnels.create!(name: 'Principal', is_default: true)
      stage  = funnel.stages.ordered.first

      contact = conv['meta']&.dig('sender') || {}
      lead = @account.leads.find_or_initialize_by(chatwoot_conversation_id: conv['id'])

      lead.assign_attributes(
        funnel:                funnel,
        stage:                 (lead.stage || stage),
        title:                 conv['additional_attributes']&.dig('subject') || contact['name'] || "Conversa ##{conv['id']}",
        contact_name:          contact['name'],
        contact_email:         contact['email'],
        contact_phone:         contact['phone_number'],
        chatwoot_contact_id:   contact['id'],
        chatwoot_inbox_name:   conv.dig('meta', 'channel'),
        source:                'conversation',
        last_activity_at:      Time.current
      )

      assignee = conv.dig('meta', 'assignee')
      if assignee
        lead.assignee_chatwoot_user_id = assignee['id']
        lead.assignee_name             = assignee['name']
        lead.assignee_avatar_url       = assignee['thumbnail']
      end

      lead.save!
      lead
    end
  end
end
