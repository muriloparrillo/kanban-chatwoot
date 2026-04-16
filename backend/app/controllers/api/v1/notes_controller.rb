module Api
  module V1
    class NotesController < BaseController
      before_action :set_lead

      def index
        render json: @lead.notes.order(created_at: :desc).map { |n| serialize(n) }
      end

      def create
        note = @lead.notes.create!(
          body: params[:body],
          author_chatwoot_user_id: current_actor[:id],
          author_name: current_actor[:name]
        )
        render json: serialize(note), status: :created
      end

      def update
        note = @lead.notes.find(params[:id])
        note.update!(body: params[:body])
        render json: serialize(note)
      end

      def destroy
        @lead.notes.find(params[:id]).destroy
        head :no_content
      end

      private

      def set_lead
        @lead = current_account.leads.find(params[:lead_id])
      end

      def serialize(n)
        { id: n.id, body: n.body, author: n.author_name, author_id: n.author_chatwoot_user_id,
          created_at: n.created_at, updated_at: n.updated_at }
      end
    end
  end
end
