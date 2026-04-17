require_relative 'boot'
require 'rails/all'

Bundler.require(*Rails.groups)

module KanbanChatwoot
  class Application < Rails::Application
    config.load_defaults 7.1
    config.api_only = true
    config.time_zone = 'Brasilia'
    config.active_job.queue_adapter = :sidekiq

    config.autoload_paths += %W[#{config.root}/app/services]

    # CORS for Chatwoot dashboard iframe embed
    config.middleware.insert_before 0, Rack::Cors do
      allow do
        origins ENV.fetch('ALLOWED_ORIGINS', '*').split(',')
        resource '*',
                 headers: :any,
                 methods: %i[get post put patch delete options head],
                 expose: %w[Authorization X-Account-Id],
                 credentials: false
      end
    end
  end
end
