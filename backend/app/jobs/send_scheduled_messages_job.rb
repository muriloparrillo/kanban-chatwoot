class SendScheduledMessagesJob
  include Sidekiq::Job

  sidekiq_options queue: 'default', retry: 3

  # Processa TODAS as mensagens com scheduled_at <= now e status pending.
  # Chamado pelo scheduler periódico (a cada minuto via sidekiq-cron ou
  # pelo endpoint POST /api/v1/scheduled_messages/process_due).
  def perform
    ScheduledMessage.due.find_each do |sm|
      SendSingleScheduledMessageJob.perform_async(sm.id)
    end
  end
end
