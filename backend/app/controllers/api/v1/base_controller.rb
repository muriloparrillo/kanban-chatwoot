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

        if cw_id.present?
          # Tenta achar conta isolada para este Chatwoot account
          @current_account = Account.find_by(account_token: token,
                                             chatwoot_account_id: cw_id)

          # Não encontrou → auto-provisiona conta isolada copiando credenciais
          # da conta-template (a que foi cadastrada com este token)
          unless @current_account
            template = Account.find_by(account_token: token)
            if template
              @current_account = Account.find_or_create_by!(chatwoot_account_id: cw_id) do |a|
                a.account_token              = token
                a.name                       = "Conta #{cw_id}"
                a.chatwoot_base_url          = template.chatwoot_base_url
                a.chatwoot_api_access_token  = template.chatwoot_api_access_token
              end
            end
          end
        end

        # Fallback: conta única (sem header cw_account_id)
        @current_account ||= Account.find_by(account_token: token)

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
