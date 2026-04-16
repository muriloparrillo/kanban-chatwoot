require 'active_support/core_ext/integer/time'

Rails.application.configure do
  config.cache_classes = true
  config.eager_load = true
  config.consider_all_requests_local = false
  config.public_file_server.enabled = ENV['RAILS_SERVE_STATIC_FILES'].present?

  config.active_storage.service = ENV.fetch('ACTIVE_STORAGE_SERVICE', 'local').to_sym
  config.log_tags = [:request_id]
  config.logger = ActiveSupport::TaggedLogging.new(Logger.new($stdout))
  config.log_level = ENV.fetch('LOG_LEVEL', 'info').to_sym

  config.active_support.report_deprecations = false
  config.i18n.fallbacks = true
  config.action_mailer.perform_caching = false
end
