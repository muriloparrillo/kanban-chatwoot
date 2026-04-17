module Api
  module V1
    class ScheduledMessagesController < BaseController
      before_action :set_scheduled_message, only: %i[show update destroy]

      # GET /api/v1/scheduled_messages
      def index
        scope = current_account.scheduled_messages.order(:scheduled_at)
        scope = scope.where(status: params[:status]) if params[:status].present?
        render json: scope.map { |sm| serialize(sm) }
      end

      # POST /api/v1/scheduled_messages
      def create
        sm = current_account.scheduled_messages.new(scheduled_message_params)
        if sm.save
          render json: serialize(sm), status: :created
        else
          render json: { errors: sm.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # PATCH /api/v1/scheduled_messages/:id
      def update
        if @sm.update(scheduled_message_params)
          render json: serialize(@sm)
        else
          render json: { errors: @sm.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # DELETE /api/v1/scheduled_messages/:id
      def destroy
        @sm.update!(status: 'cancelled')
        head :no_content
      end

      # POST /api/v1/scheduled_messages/process_due
      # Aciona manualmente o processamento de mensagens vencidas (útil sem sidekiq-cron).
      def process_due
        SendScheduledMessagesJob.perform_async
        render json: { queued: true }
      end

      private

      def set_scheduled_message
        @sm = current_account.scheduled_messages.find(params[:id])
      end

      def scheduled_message_params
        params.require(:scheduled_message).permit(
          :lead_id, :chatwoot_conversation_id, :chatwoot_inbox_id,
          :message, :scheduled_at, :status
        )
      end

      def serialize(sm)
        {
          id:                        sm.id,
          lead_id:                   sm.lead_id,
          chatwoot_conversation_id:  sm.chatwoot_conversation_id,
          message:                   sm.message,
          scheduled_at:              sm.scheduled_at,
          sent_at:                   sm.sent_at,
          status:                    sm.status,
          error_message:             sm.error_message,
          lead_title:                sm.lead&.title,
          created_at:                sm.created_at
        }
      end
    end
  end
end
