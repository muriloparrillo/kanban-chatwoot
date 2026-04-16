max_threads = ENV.fetch('RAILS_MAX_THREADS', 5).to_i
workers     ENV.fetch('WEB_CONCURRENCY', 2).to_i
threads     max_threads, max_threads
preload_app!
port        ENV.fetch('PORT', 3000)
environment ENV.fetch('RAILS_ENV', 'production')
