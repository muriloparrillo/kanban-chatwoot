module Api
  module V1
    class AttachmentsController < BaseController
      before_action :set_lead

      def index
        render json: @lead.attachments.order(created_at: :desc).map { |a| serialize(a) }
      end

      # Expects multipart/form-data with "file"
      def create
        file = params[:file]
        return render json: { error: 'file_required' }, status: :bad_request unless file.respond_to?(:original_filename)

        key = "accounts/#{current_account.id}/leads/#{@lead.id}/#{SecureRandom.hex(8)}-#{file.original_filename}"
        url = AttachmentStorage.upload(key: key, file: file)

        att = @lead.attachments.create!(
          filename:     file.original_filename,
          content_type: file.content_type,
          byte_size:    file.size,
          storage_key:  key,
          url:          url,
          uploader_chatwoot_user_id: current_actor[:id]
        )
        render json: serialize(att), status: :created
      end

      def destroy
        att = @lead.attachments.find(params[:id])
        AttachmentStorage.delete(att.storage_key)
        att.destroy
        head :no_content
      end

      private

      def set_lead
        @lead = current_account.leads.find(params[:lead_id])
      end

      def serialize(a)
        { id: a.id, filename: a.filename, content_type: a.content_type, byte_size: a.byte_size,
          url: a.url, created_at: a.created_at }
      end
    end
  end
end
