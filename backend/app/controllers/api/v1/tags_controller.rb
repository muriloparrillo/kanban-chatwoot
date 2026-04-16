module Api
  module V1
    class TagsController < BaseController
      def index
        if params[:lead_id].present?
          lead = current_account.leads.find(params[:lead_id])
          render json: lead.tags.map { |t| serialize(t) }
        else
          render json: current_account.tags.order(:name).map { |t| serialize(t) }
        end
      end

      # POST /api/v1/tags               -> create tag
      # POST /api/v1/leads/:lead_id/tags -> attach tag to lead (body: { tag_id } or { name })
      def create
        if params[:lead_id].present?
          lead = current_account.leads.find(params[:lead_id])
          tag  = find_or_build_tag
          lead.tags << tag unless lead.tag_ids.include?(tag.id)
          lead.histories.create!(event: 'tag_added', payload: { tag_id: tag.id, name: tag.name })
          render json: serialize(tag), status: :created
        else
          tag = current_account.tags.new(tag_params)
          if tag.save
            render json: serialize(tag), status: :created
          else
            render json: { errors: tag.errors.full_messages }, status: :unprocessable_entity
          end
        end
      end

      def update
        tag = current_account.tags.find(params[:id])
        tag.update!(tag_params)
        render json: serialize(tag)
      end

      def destroy
        if params[:lead_id].present?
          lead = current_account.leads.find(params[:lead_id])
          tag  = current_account.tags.find(params[:id])
          lead.tags.delete(tag)
          lead.histories.create!(event: 'tag_removed', payload: { tag_id: tag.id, name: tag.name })
          head :no_content
        else
          current_account.tags.find(params[:id]).destroy
          head :no_content
        end
      end

      private

      def tag_params
        params.require(:tag).permit(:name, :color)
      end

      def find_or_build_tag
        if params[:tag_id].present?
          current_account.tags.find(params[:tag_id])
        else
          current_account.tags.find_or_create_by!(name: params[:name]) { |t| t.color = params[:color] || '#64748b' }
        end
      end

      def serialize(t)
        { id: t.id, name: t.name, color: t.color }
      end
    end
  end
end
