Rails.application.routes.draw do
  devise_for :users,
             path: "api/v1/auth",
             path_names: { sign_in: "login", sign_out: "logout", registration: "register" },
             controllers: {
               sessions: "api/v1/auth/sessions",
               registrations: "api/v1/auth/registrations"
             }

  namespace :api do
    namespace :v1 do
      resources :transactions, only: %i[index show create update destroy] do
        collection do
          patch :bulk
        end
      end
      resources :categories, only: %i[index show create update destroy]
      resources :rules, only: %i[index show create update destroy] do
        collection do
          patch :reorder
        end
      end
      resources :imports, only: %i[index show create]
      resource :rule_set, only: %i[show update] do
        post :reset
      end
      get "dashboard/stats", to: "dashboard#stats"
      resource :recategorization_status, only: %i[show destroy], controller: "recategorization_status"
    end
  end

  get "up" => "rails/health#show", as: :rails_health_check
end
