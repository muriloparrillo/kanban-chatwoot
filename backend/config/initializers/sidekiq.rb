require 'sidekiq'
require 'sidekiq-cron'

Sidekiq.configure_server do |config|
  config.redis = { url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/0') }

  # Agenda o disparo de mensagens agendadas a cada minuto
  config.on(:startup) do
    Sidekiq::Cron::Job.load_from_hash(
      'send_scheduled_messages' => {
        'cron'  => '* * * * *',      # todo minuto
        'class' => 'SendScheduledMessagesJob',
        'queue' => 'default'
      }
    )
  end
end

Sidekiq.configure_client do |config|
  config.redis = { url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/0') }
end
