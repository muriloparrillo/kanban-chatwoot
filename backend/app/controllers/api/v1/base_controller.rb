module Api
  module V1
    # Shared auth: every API call must identify a Kanban Account, either via
    #   - X-Account-Token header (opaque token, used by the Dashboard App iframe)
    #   - or ?account_token=... query parameter
    #
    # The Dashboard App (iframe) gets the token embedded on the URL when the
    # Chatwoot admin registers the dashboard app for the account.
    class BaseController < ApplicationController
      before_action :authenticate_account!

      attr_reader :current_account

      private

      def authenticate_account!
        token  = request.headers['X-Account-Token'].presence || params[:account_token].presence
        cw_id  = request.headers['X-Chatwoot-Account-Id'].presence ||
                 params[:cw_account_id].presence

        if token.present?
          if cw_id.present?
            # Isola por conta Chatwoot: o mesmo token pode existir para múltiplas
            # contas no mesmo Chatwoot. Usamos cw_account_id para selecionar a certa.
            @current_account = Account.find_by(
              account_token:       token,
              chatwoot_account_id: cw_id
            )
            # Fallback: se não achou pela combinação, tenta só pelo token
            # (suporte a instâncias com conta única)
            @current_account ||= Account.find_by(account_token: token)
          else
            @current_account = Account.find_by(account_token: token)
          end
        end

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
