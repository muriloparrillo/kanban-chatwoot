require 'faraday'
require 'faraday/retry'

module Chatwoot
  # Thin HTTP client for the Chatwoot Application API.
  # Uses the account API Access Token (api_access_token) for auth.
  class Client
    class ApiError < StandardError; end

    def initialize(base_url:, access_token:, account_id:)
      @base_url     = base_url.to_s.chomp('/')
      @access_token = access_token
      @account_id   = account_id
    end

    def conversations(page: 1, status: 'open', assignee_type: nil)
      get("/api/v1/accounts/#{@account_id}/conversations",
          { page: page, status: status, assignee_type: assignee_type }.compact)
    end

    def conversation(id)
      get("/api/v1/accounts/#{@account_id}/conversations/#{id}")
    end

    def contact(id)
      get("/api/v1/accounts/#{@account_id}/contacts/#{id}")
    end

    def agents
      get("/api/v1/accounts/#{@account_id}/agents")
    end

    def inboxes
      get("/api/v1/accounts/#{@account_id}/inboxes")
    end

    def register_webhook(url:, subscriptions: default_subscriptions)
      post("/api/v1/accounts/#{@account_id}/webhooks",
           { url: url, subscriptions: subscriptions })
    end

    def default_subscriptions
      %w[
        conversation_created
        conversation_updated
        conversation_status_changed
        contact_created
        contact_updated
        message_created
      ]
    end

    private

    def connection
      @connection ||= Faraday.new(url: @base_url) do |f|
        f.request :json
        f.request :retry, max: 2, interval: 0.5
        f.response :json, content_type: /\bjson$/
        f.headers['api_access_token'] = @access_token
        f.headers['Content-Type']     = 'application/json'
      end
    end

    def get(path, params = {})
      handle connection.get(path, params)
    end

    def post(path, body = {})
      handle connection.post(path, body.to_json)
    end

    def handle(res)
      return res.body if res.success?
      raise ApiError, "Chatwoot API #{res.status}: #{res.body}"
    end
  end
end
