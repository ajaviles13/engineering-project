module Api
  module V1
    class CategoriesController < ApplicationController
      before_action :set_category, only: %i[show update destroy]

      def index
        render json: { categories: current_user.categories.order(:name) }
      end

      def show
        render json: { category: @category }
      end

      def create
        category = current_user.categories.create!(category_params)
        render json: { category: category }, status: :created
      end

      def update
        @category.update!(category_params)
        render json: { category: @category }
      end

      def destroy
        @category.destroy!
        render json: { message: "Category deleted" }
      end

      private

      def set_category
        @category = current_user.categories.find(params[:id])
      end

      def category_params
        params.require(:category).permit(:name, :color)
      end
    end
  end
end
