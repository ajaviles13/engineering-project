class ApplicationController < ActionController::API
  before_action :authenticate_user!

  rescue_from ActiveRecord::RecordNotFound, with: :not_found
  rescue_from ActiveRecord::RecordInvalid, with: :unprocessable_entity

  private

  def not_found
    render json: { error: "Not found" }, status: :not_found
  end

  def unprocessable_entity(e)
    render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
  end
end
