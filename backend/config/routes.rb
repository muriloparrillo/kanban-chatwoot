Rails.application.routes.draw do
  # Health check
  get '/health', to: 'health#show'

  # Public webhook (Chatwoot -> Kanban)
  post '/webhooks/chatwoot/:account_token', to: 'webhooks#chatwoot', as: :webhooks_chatwoot

  namespace :api do
    namespace :v1 do
      # Account bootstrap (connect Chatwoot account via API Key)
      resources :accounts, only: %i[create show update] do
        collection do
          get :current
          get :message_templates
          post :sync_agents
          post :sync_conversations
          post :sync_labels
        end
      end

      # Funnels (pipelines) - each account can have multiple
      resources :funnels do
        member do
          post :duplicate
          patch :reorder_stages
        end
        resources :stages, only: %i[index create update destroy] do
          member { patch :reorder }
        end
      end

      # Leads (cards on the Kanban)
      resources :leads do
        collection do
          get :search
          post :bulk_move
        end
        member do
          patch :move            # move between stages (drag & drop)
          post  :assign
          post  :archive
          post  :unarchive
        end

        resources :notes,         only: %i[index create update destroy]
        resources :attachments,   only: %i[index create destroy]
        resources :histories,     only: %i[index]
        resources :tags,          only: %i[index create destroy]
        resources :lead_products, only: %i[create destroy]
      end

      # Board view aggregate (one call = full board payload)
      get 'boards/:funnel_id', to: 'boards#show'

      # Tags (global, per account)
      resources :tags, only: %i[index create update destroy]

      # Products / Services catalog
      resources :products, only: %i[index create update destroy]

      # Scheduled messages (Agenda)
      resources :scheduled_messages, only: %i[index create update destroy] do
        collection do
          post :process_due
        end
      end

      # Tasks (tarefas e pendências por lead/account)
      resources :tasks, only: %i[index show create update destroy]

      # Agents (mirrored from Chatwoot)
      resources :agents, only: %i[index]
    end
  end
end
