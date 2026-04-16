module Api
  module V1
    class StagesController < BaseController
      before_action :set_funnel
      before_action :set_stage, only: %i[update destroy reorder]

      def index
        render json: @funnel.stages.ordered.map { |s| stage_json(s) }
      end

      def create
        stage = @funnel.stages.new(stage_params)
        stage.position ||= @funnel.stages.maximum(:position).to_i + 1
        if stage.save
          render json: stage_json(stage), status: :created
        else
          render json: { errors: stage.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @stage.update(stage_params)
          render json: stage_json(@stage)
        else
          render json: { errors: @stage.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        fallback = @funnel.stages.where.not(id: @stage.id).ordered.first
        if fallback.nil?
          return render json: { error: 'cannot_delete_last_stage' }, status: :unprocessable_entity
        end
        Stage.transaction do
          @stage.leads.update_all(stage_id: fallback.id)
          @stage.destroy
        end
        head :no_content
      end

      def reorder
        @stage.update(position: params[:position].to_i)
        render json: stage_json(@stage)
      end

      private

      def set_funnel
        @funnel = current_account.funnels.find(params[:funnel_id])
      end

      def set_stage
        @stage = @funnel.stages.find(params[:id])
      end

      def stage_params
        params.require(:stage).permit(:name, :color, :position, :stage_type, :sla_hours, :active, settings: {})
      end

      def stage_json(s)
        { id: s.id, name: s.name, color: s.color, position: s.position,
          stage_type: s.stage_type, sla_hours: s.sla_hours, active: s.active, settings: s.settings }
      end
    end
  end
end
