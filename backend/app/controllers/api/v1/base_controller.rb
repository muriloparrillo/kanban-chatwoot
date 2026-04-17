module Api
  module V1
    # Shared auth: every API call must identify a Kanban Account.
    #
    # Isolamento multi-tenant:
    #   Um único account_token (hardcoded no inject.js) representa a instalação
    #   inteira do Chatwoot. Cada conta Chatwoot (chatwoot_account_id) recebe
    #   seu próprio Account isolado no banco — auto-provisionado na 1ª requisição.
    #
    # Lookup order:
    #   1. token + cw_account_id  → conta isolada (caso normal)
    #   2. auto-provisiona nova conta copiando credenciais da conta-template
    #   3. token apenas           → fallback (conta única / sem header)
    class BaseController < ApplicationController
      before_action :authenticate_account!

      attr_reader :current_account

      private

      def authenticate_account!
        token = request.headers['X-Account-Token'].presence || params[:account_token].presence
        cw_id = request.headers['X-Chatwoot-Account-Id'].presence ||
                params[:cw_account_id].presence

        unless token.present?
          return render json: { error: 'unauthorized', message: 'Missing account token' },
                        status: :unauthorized
        end

        # Passo 1: valida a instalação pelo account_token
        installation = Account.find_by(account_token: token)

        unless installation
          return render json: { error: 'unauthorized', message: 'Invalid account token' },
                        status: :unauthorized
        end

        if cw_id.present? && cw_id.to_s != installation.chatwoot_account_id.to_s
          # Passo 2: cw_id diferente da conta-mestre → busca conta isolada pelo chatwoot_account_id
          # (cada conta isolada tem seu próprio account_token único gerado na criação)
          @current_account = Account.find_by(chatwoot_account_id: cw_id)

          # Passo 3: não existe → auto-provisiona com credenciais da instalação
          unless @current_account
            begin
              @current_account = Account.create!(
                chatwoot_account_id:        cw_id,
                name:                       "Conta #{cw_id}",
                chatwoot_base_url:          installation.chatwoot_base_url,
                chatwoot_api_access_token:  installation.chatwoot_api_access_token
                # account_token gerado automaticamente por ensure_tokens (único)
              )
            rescue => e
              Rails.logger.error "[CRM] auto-provision falhou cw_id=#{cw_id}: #{e.message}"
              # Tenta achar de novo (race condition: outra requisição criou antes)
              @current_account = Account.find_by(chatwoot_account_id: cw_id)
            end
          end
        end

        # Usa a instalação diretamente se cw_id bate ou não foi enviado
        @current_account ||= installation

        return if @current_account

        render json: { error: 'unauthorized', message: 'Missing or invalid account token' },
               status: :unauthorized
      end

      def current_actor
        {
          id:   request.headers['X-Chatwoot-User-Id'],
          name: request.headers['X-Chatwoot-User-Name']
        }
      end
    end
  end
end
