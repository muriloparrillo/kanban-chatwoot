module Api
  module V1
    class AgentsController < BaseController
      def index
        agents = current_account.chatwoot_client.agents
        render json: Array(agents).map { |a|
          { id: a['id'], name: a['name'], email: a['email'], avatar_url: a['thumbnail'] }
        }
      rescue Chatwoot::Client::ApiError => e
        render json: { error: 'chatwoot_api_error', message: e.message }, status: :bad_gateway
      end
    end
  end
end
