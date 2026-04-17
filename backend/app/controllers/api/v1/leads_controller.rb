module Api
  module V1
    class LeadsController < BaseController
      before_action :set_lead, only: %i[show update destroy move assign archive unarchive]

      # GET /api/v1/leads?funnel_id=...&stage_id=...&q=...&assignee_id=...&tag_id=...
      def index
        scope = current_account.leads.active
        scope = scope.where(funnel_id: params[:funnel_id]) if params[:funnel_id].present?
        scope = scope.where(stage_id:  params[:stage_id])  if params[:stage_id].present?
        scope = scope.where(assignee_chatwoot_user_id: params[:assignee_id]) if params[:assignee_id].present?
        scope = scope.joins(:tags).where(tags: { id: params[:tag_id] })      if params[:tag_id].present?
        scope = scope.where(chatwoot_conversation_id: params[:conversation_id]) if params[:conversation_id].present?
        scope = scope.search(params[:q]) if params[:q].present?
        scope = scope.order(:position)
        render json: scope.map { |l| serialize(l) }
      end

      def search
        q = params[:q].to_s
        leads = current_account.leads.active.search(q).limit(30)
        render json: leads.map { |l| serialize(l) }
      end

      def show
        render json: serialize(@lead, detailed: true)
      end

      def create
        funnel = current_account.funnels.find(params.dig(:lead, :funnel_id) || current_account.default_funnel.id)
        stage  = funnel.stages.find(params.dig(:lead, :stage_id) || funnel.stages.ordered.first.id)
        lead = current_account.leads.new(lead_params.merge(funnel_id: funnel.id, stage_id: stage.id,
                                                           source: params.dig(:lead, :source) || 'manual'))
        lead.position = (funnel.leads.where(stage_id: stage.id).maximum(:position) || 0) + 1
        if lead.save
          render json: serialize(lead, detailed: true), status: :created
        else
          render json: { errors: lead.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        if @lead.update(lead_params)
          @lead.histories.create!(event: 'updated', actor_chatwoot_user_id: current_actor[:id],
                                  actor_name: current_actor[:name],
                                  payload: { changes: @lead.previous_changes.except('updated_at') })
          render json: serialize(@lead, detailed: true)
        else
          render json: { errors: @lead.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @lead.destroy
        head :no_content
      end

      # PATCH /api/v1/leads/:id/move  body: { stage_id:, position: }
      def move
        stage = current_account.funnels.joins(:stages).where(stages: { id: params[:stage_id] }).first&.stages&.find(params[:stage_id])
        return render json: { error: 'stage_not_found' }, status: :not_found unless stage

        @lead.move_to!(stage, actor: current_actor, position: params[:position])
        render json: serialize(@lead)
      end

      def assign
        @lead.update!(
          assignee_chatwoot_user_id: params[:assignee_id],
          assignee_name:             params[:assignee_name],
          assignee_avatar_url:       params[:assignee_avatar_url]
        )
        @lead.histories.create!(event: 'assigned', actor_chatwoot_user_id: current_actor[:id],
                                actor_name: current_actor[:name],
                                payload: { assignee_id: params[:assignee_id], assignee_name: params[:assignee_name] })
        render json: serialize(@lead)
      end

      def archive
        @lead.archive!(actor: current_actor)
        head :no_content
      end

      def unarchive
        @lead.unarchive!
        head :no_content
      end

      def bulk_move
        ids = Array(params[:lead_ids]).map(&:to_i)
        stage = Stage.joins(funnel: :account).where(accounts: { id: current_account.id }, id: params[:stage_id]).first
        return render json: { error: 'stage_not_found' }, status: :not_found unless stage
        Lead.where(id: ids, account_id: current_account.id).find_each { |l| l.move_to!(stage, actor: current_actor) }
        head :no_content
      end

      private

      def set_lead
        @lead = current_account.leads.find(params[:id])
      end

      def lead_params
        params.require(:lead).permit(
          :title, :description, :value, :currency,
          :contact_name, :contact_email, :contact_phone,
          :chatwoot_contact_id, :chatwoot_conversation_id, :chatwoot_inbox_name,
          :due_at, :priority, :stage_id, :funnel_id, :product_id,
          custom_fields: {}
        )
      end

      def serialize(l, detailed: false)
        base = {
          id: l.id, title: l.title, description: l.description,
          value: l.value, currency: l.currency,
          contact: { name: l.contact_name, email: l.contact_email, phone: l.contact_phone,
                     chatwoot_contact_id: l.chatwoot_contact_id },
          conversation: { id: l.chatwoot_conversation_id, inbox: l.chatwoot_inbox_name },
          assignee: l.assignee_chatwoot_user_id && {
            id: l.assignee_chatwoot_user_id, name: l.assignee_name, avatar_url: l.assignee_avatar_url
          },
          funnel_id: l.funnel_id, stage_id: l.stage_id, position: l.position,
          priority: l.priority, due_at: l.due_at, last_activity_at: l.last_activity_at,
          moved_to_stage_at: l.moved_to_stage_at, source: l.source,
          tag_ids: l.tag_ids, custom_fields: l.custom_fields,
          product: l.product && { id: l.product.id, name: l.product.name, value: l.product.value, currency: l.product.currency },
          product_id: l.product_id,
          created_at: l.created_at, updated_at: l.updated_at
        }
        if detailed
          base[:notes]       = l.notes.order(created_at: :desc).map { |n| { id: n.id, body: n.body, author: n.author_name, created_at: n.created_at } }
          base[:attachments] = l.attachments.order(created_at: :desc).map { |a| { id: a.id, filename: a.filename, url: a.url } }
          base[:histories]   = l.histories.recent.limit(50).map { |h| { id: h.id, event: h.event, actor: h.actor_name, payload: h.payload, created_at: h.created_at } }
        end
        base
      end
    end
  end
end
