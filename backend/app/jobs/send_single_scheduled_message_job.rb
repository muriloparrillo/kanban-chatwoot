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
      Rails.logger.warn "[CRM] ScheduledMessage ##{sm.id} falhou: sem conversation_id"
      return
    end

    begin
      client = account.chatwoot_client
      client.send_message(conv_id, sm.message)
      sm.update!(status: 'sent', sent_at: Time.current)
      Rails.logger.info "[CRM] ScheduledMessage ##{sm.id} enviada para conv #{conv_id} (account #{account.id})"
    rescue => e
      error_msg = e.message.truncate(500)
      sm.update!(status: 'failed', error_message: error_msg)
      Rails.logger.error "[CRM] ScheduledMessage ##{sm.id} falhou (account #{account.id}): #{error_msg}"
      raise # re-raise para Sidekiq retry (max 2x)
    end
  end
end
