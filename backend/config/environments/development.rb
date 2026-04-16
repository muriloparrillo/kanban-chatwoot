require 'active_support/core_ext/integer/time'

Rails.application.configure do
  config.cache_classes = false
  config.eager_load = false
  config.consider_all_requests_local = true
  config.server_timing = true

  config.logger = ActiveSupport::TaggedLogging.new(Logger.new($stdout))
  config.log_level = :debug

  config.action_mailer.perform_caching = false
  config.active_support.discard_invalid_bytes_in_strings = true
end
