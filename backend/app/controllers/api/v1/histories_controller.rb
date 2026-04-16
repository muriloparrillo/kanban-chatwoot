module Api
  module V1
    class HistoriesController < BaseController
      def index
        lead = current_account.leads.find(params[:lead_id])
        render json: lead.histories.recent.limit(100).map { |h|
          { id: h.id, event: h.event, actor: h.actor_name,
            actor_id: h.actor_chatwoot_user_id, payload: h.payload, created_at: h.created_at }
        }
      end
    end
  end
end
