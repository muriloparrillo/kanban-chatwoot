module Api
  module V1
    class FunnelsController < BaseController
      before_action :set_funnel, only: %i[show update destroy duplicate reorder_stages]

      # GET /api/v1/funnels
      def index
        render json: current_account.funnels.ordered.includes(:stages).map { |f| serialize(f, with_stages: true) }
      end

      def show
        render json: serialize(@funnel, with_stages: true)
      end

      def create
        funnel = current_account.funnels.new(funnel_params)
        if funnel.save
          funnel.ensure_single_default!
          render json: serialize(funnel, with_stages: true), status: :created
        else
          render json: { errors: funnel.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @funnel.update(funnel_params)
          @funnel.ensure_single_default!
          render json: serialize(@funnel, with_stages: true)
        else
          render json: { errors: @funnel.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @funnel.destroy
        head :no_content
      end

      def duplicate
        clone = @funnel.dup
        clone.name = "#{@funnel.name} (cópia)"
        clone.slug = nil
        clone.is_default = false
        clone.save!
        @funnel.stages.ordered.each do |s|
          clone.stages.create!(s.attributes.except('id', 'funnel_id', 'created_at', 'updated_at'))
        end
        render json: serialize(clone, with_stages: true), status: :created
      end

      # PATCH /api/v1/funnels/:id/reorder_stages
      # body: { order: [stage_id_1, stage_id_2, ...] }
      def reorder_stages
        ids = Array(params[:order]).map(&:to_i)

        # Valida que todos os IDs pertencem a este funnel
        valid_ids = @funnel.stages.pluck(:id)
        invalid   = ids - valid_ids
        return render json: { error: 'invalid_stage_ids', ids: invalid }, status: :bad_request if invalid.any?

        Stage.transaction do
          ids.each_with_index do |sid, idx|
            @funnel.stages.where(id: sid).update_all(position: idx)
          end
        end
        render json: serialize(@funnel, with_stages: true)
      end

      private

      def set_funnel
        @funnel = current_account.funnels.find(params[:id])
      end

      def funnel_params
        params.require(:funnel).permit(:name, :description, :color, :position, :active, :is_default, settings: {})
      end

      def serialize(f, with_stages: false)
        {
          id: f.id, name: f.name, slug: f.slug, description: f.description, color: f.color,
          position: f.position, active: f.active, is_default: f.is_default, settings: f.settings,
          stages: with_stages ? f.stages.ordered.map { |s| stage_json(s) } : nil
        }.compact
      end

      def stage_json(s)
        { id: s.id, name: s.name, color: s.color, position: s.position,
          stage_type: s.stage_type, sla_hours: s.sla_hours, active: s.active, settings: s.settings }
      end
    end
  end
end
