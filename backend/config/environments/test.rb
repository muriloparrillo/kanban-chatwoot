require 'active_support/core_ext/integer/time'

Rails.application.configure do
  config.cache_classes = true
  config.eager_load = false
  config.public_file_server.enabled = true
  config.public_file_server.headers = { 'Cache-Control' => "public, max-age=#{1.hour.to_i}" }

  config.consider_all_requests_local = true
  config.action_mailer.perform_caching = false
  config.active_support.discard_invalid_bytes_in_strings = true

  config.log_level = :fatal
  config.action_dispatch.show_exceptions = :rescuable
end
