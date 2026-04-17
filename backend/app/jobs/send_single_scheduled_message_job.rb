class SendSingleScheduledMessageJob
  include Sidekiq::Job

  sidekiq_options queue: 'default', retry: 2

  def perform(scheduled_message_id)
    sm = ScheduledMessage.find_by(id: scheduled_message_id)
    return unless sm
    return unless sm.status == 'pending'

    account = sm.account
    conv_id = sm.chatwoot_conversation_id

    unless conv_id
      sm.update!(status: 'failed', error_message: 'conversation_id ausente')
      return
    end

    begin
      client = account.chatwoot_client
      # Envia mensagem via API do Chatwoot
      client.send_message(conv_id, sm.message)
      sm.update!(status: 'sent', sent_at: Time.current)
    rescue => e
      sm.update!(status: 'failed', error_message: e.message.truncate(500))
      raise # re-raise para Sidekiq retry
    end
  end
end
