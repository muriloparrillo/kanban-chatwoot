module Api
  module V1
    class AccountsController < BaseController
      skip_before_action :authenticate_account!, only: %i[create]

      # POST /api/v1/accounts
      # Admin bootstrap: register a Chatwoot account on the Kanban by providing
      # the Chatwoot base URL + API Access Token.
      def create
        account = Account.find_or_initialize_by(chatwoot_account_id: account_params[:chatwoot_account_id])
        account.assign_attributes(account_params)
        if account.save
          account.funnels.create!(name: 'Funil Principal', is_default: true) if account.funnels.empty?
          status = account.previously_new_record? ? :created : :ok
          render json: serialize_account(account, include_secrets: true, base_url: request.base_url), status: status
        else
          render json: { errors: account.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def current
        render json: serialize_account(current_account, base_url: request.base_url)
      end

      def show
        render json: serialize_account(current_account, base_url: request.base_url)
      end

      def update
        if current_account.update(account_params.except(:chatwoot_account_id))
          render json: serialize_account(current_account, base_url: request.base_url)
        else
          render json: { errors: current_account.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def sync_agents
        agents = current_account.chatwoot_client.agents
        render json: { count: Array(agents).size, agents: agents }
      end

      def sync_conversations
        count = Chatwoot::ConversationSync.new(current_account).backfill!(limit: params.fetch(:limit, 100).to_i)
        current_account.update(last_synced_at: Time.current)
        render json: { synced: count }
      end

      # GET /api/v1/accounts/message_templates
      # Retorna templates de mensagem aprovados do WhatsApp via Chatwoot API
      # ?debug=1 retorna diagnóstico completo (apenas para troubleshooting)
      def message_templates
        client = current_account.chatwoot_client
        templates = client.message_templates

        Rails.logger.info "[CRM] message_templates account=#{current_account.id} cw_account=#{current_account.chatwoot_account_id} count=#{templates.size}"

        if params[:debug] == '1'
          # Endpoint diagnóstico: retorna info bruta para investigação
          raw_res = current_account.chatwoot_client.send(:connection)
                      .get("/api/v1/accounts/#{current_account.chatwoot_account_id}/message_templates")
          return render json: {
            status:    raw_res.status,
            body:      raw_res.body,
            templates: templates,
            account:   current_account.chatwoot_account_id,
            url:       "#{current_account.chatwoot_base_url}/api/v1/accounts/#{current_account.chatwoot_account_id}/message_templates"
          }
        end

        render json: templates
      rescue => e
        Rails.logger.error "[CRM] message_templates controller error: #{e.message}"
        render json: { error: e.message }, status: :bad_gateway
      end

      # POST /api/v1/accounts/sync_labels
      # Importa os labels do Chatwoot como tags do CRM.
      # Cria se não existir (match por nome, case-insensitive). Não remove tags existentes.
      def sync_labels
        raw = current_account.chatwoot_client.labels
        # A API do Chatwoot retorna { payload: [ { id, title, color, ... }, ... ] }
        label_list = (raw.is_a?(Hash) ? raw['payload'] : raw) || []
        created = 0
        label_list.each do |lbl|
          title = lbl['title'].presence || lbl['name'].presence
          next unless title
          color = lbl['color'].presence || '#1f93ff'
          existing = current_account.tags.where('LOWER(name) = ?', title.downcase).first
          unless existing
            current_account.tags.create!(name: title, color: color)
            created += 1
          end
        end
        render json: { synced: label_list.size, created: created,
                       tags: current_account.tags.map { |t| { id: t.id, name: t.name, color: t.color } } }
      rescue Chatwoot::Client::ApiError => e
        render json: { error: e.message }, status: :bad_gateway
      end

      private

      def account_params
        params.require(:account).permit(
          :chatwoot_account_id, :name, :chatwoot_base_url,
          :chatwoot_api_access_token, settings: {}
        )
      end

      def serialize_account(account, include_secrets: false, base_url: '')
        frontend_url = ENV.fetch('FRONTEND_URL', base_url)
        base = {
          id: account.id,
          name: account.name,
          chatwoot_account_id: account.chatwoot_account_id,
          chatwoot_base_url: account.chatwoot_base_url,
          account_token: account.account_token,
          last_synced_at: account.last_synced_at,
          settings: account.settings,
          webhook_url: "#{frontend_url}/webhooks/chatwoot/#{account.account_token}"
        }
        base[:webhook_secret] = account.webhook_secret if include_secrets
        base
      end
    end
  end
end
