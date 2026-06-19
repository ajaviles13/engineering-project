module Api
  module V1
    class RecategorizationStatusController < ApplicationController
      def show
        status = RecategorizationTracker.get(current_user.id)
        render json: status
      end

      def destroy
        RecategorizationTracker.dismiss(current_user.id)
        head :no_content
      end
    end
  end
end
