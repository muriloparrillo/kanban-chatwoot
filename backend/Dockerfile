FROM ruby:3.2.2-slim

RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
      build-essential libpq-dev git curl tzdata && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV BUNDLE_JOBS=4 BUNDLE_RETRY=3 RAILS_LOG_TO_STDOUT=1 RAILS_ENV=production

COPY Gemfile Gemfile.lock* ./
RUN bundle install

COPY . .

EXPOSE 3000
CMD bash -c "bundle exec rails db:migrate 2>&1 | tail -5; bundle exec puma -C config/puma.rb -p 3000"
