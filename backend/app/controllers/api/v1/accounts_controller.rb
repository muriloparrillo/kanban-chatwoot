module Api
  module V1
    class AccountsController < BaseController
      skip_before_action :authenticate_account!, only: %i[create]

      # POST /api/v1/accounts
      # Admin bootstrap: register a Chatwoot account on the Kanban by providing
      # the Chatwoot base URL + API Access Token.
      def create
        account = Account.new(account_params)
        if account.save
          # create a default funnel with default stages
          account.funnels.create!(name: 'Funil Principal', is_default: true) if account.funnels.empty?
          render json: serialize_account(account, include_secrets: true), status: :created
        else
          render json: { errors: account.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def current
        render json: serialize_account(current_account)
      end

      def show
        render json: serialize_account(current_account)
      end

      def update
        if current_account.update(account_params.except(:chatwoot_account_id))
          render json: serialize_account(current_account)
        else
          render json: { errors: current_account.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def sync_agents
        agents = current_account.chatwoot_client.agents
        render json: { count: Array(agents).size, agents: agents }
      end

      def sync_conversations
        count = Chatwoot::ConversationSync.new(current_account).backfill!(limit: params.fetch(:limit, 100).to_i)
        current_account.update(last_synced_at: Time.current)
        render json: { synced: count }
      end

      private

      def account_params
        params.require(:account).permit(
          :chatwoot_account_id, :name, :chatwoot_base_url,
          :chatwoot_api_access_token, settings: {}
        )
      end

      def serialize_account(account, include_secrets: false)
        base = {
          id: account.id,
          name: account.name,
          chatwoot_account_id: account.chatwoot_account_id,
          chatwoot_base_url: account.chatwoot_base_url,
          account_token: account.account_token,
          last_synced_at: account.last_synced_at,
          settings: account.settings,
          webhook_url: Rails.application.routes.url_helpers.webhooks_chatwoot_path(account_token: account.account_token)
        }
        base[:webhook_secret] = account.webhook_secret if include_secrets
        base
      end
    end
  end
end
