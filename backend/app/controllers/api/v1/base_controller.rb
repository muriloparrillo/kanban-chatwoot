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
        token = request.headers['X-Account-Token'].presence || params[:account_token].presence
        @current_account = Account.find_by(account_token: token) if token.present?
        return if @current_account

        render json: { error: 'unauthorized', message: 'Missing or invalid account token' }, status: :unauthorized
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
