module Api
  module V1
    # Aggregated board payload used by the Kanban view on the frontend.
    # Returns: funnel + stages[] + leads grouped by stage.
    class BoardsController < BaseController
      def show
        funnel = current_account.funnels.includes(:stages).find(params[:funnel_id])
        stages = funnel.stages.ordered
        leads  = current_account.leads.active.where(funnel_id: funnel.id).includes(:tags).order(:position)

        grouped = leads.group_by(&:stage_id)

        render json: {
          funnel: {
            id: funnel.id, name: funnel.name, slug: funnel.slug, color: funnel.color,
            settings: funnel.settings
          },
          stages: stages.map do |s|
            {
              id: s.id, name: s.name, color: s.color, stage_type: s.stage_type,
              position: s.position, sla_hours: s.sla_hours,
              leads: (grouped[s.id] || []).map { |l| lead_card(l) }
            }
          end
        }
      end

      private

      def lead_card(l)
        {
          id: l.id, title: l.title, value: l.value, currency: l.currency, priority: l.priority,
          contact_name: l.contact_name, contact_email: l.contact_email, contact_phone: l.contact_phone,
          chatwoot_conversation_id: l.chatwoot_conversation_id,
          assignee: l.assignee_chatwoot_user_id && {
            id: l.assignee_chatwoot_user_id, name: l.assignee_name, avatar_url: l.assignee_avatar_url
          },
          tags: l.tags.map { |t| { id: t.id, name: t.name, color: t.color } },
          due_at: l.due_at, last_activity_at: l.last_activity_at, position: l.position
        }
      end
    end
  end
end
