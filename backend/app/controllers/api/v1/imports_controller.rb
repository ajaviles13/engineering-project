module Api
  module V1
    class ImportsController < ApplicationController
      def index
        render json: { imports: current_user.imports.recent.limit(20) }
      end

      def show
        import = current_user.imports.find(params[:id])
        render json: { import: import }
      end

      def create
        unless params[:file]
          render json: { error: "No file provided" }, status: :bad_request
          return
        end

        import = current_user.imports.create!(
          filename: params[:file].original_filename,
          status: "pending",
          row_count: 0,
          error_count: 0
        )

        # Store file temporarily and enqueue job
        file_path = Rails.root.join("tmp", "imports", "#{import.id}_#{params[:file].original_filename}")
        FileUtils.mkdir_p(File.dirname(file_path))
        File.open(file_path, "wb") { |f| f.write(params[:file].read) }

        CsvImportJob.perform_async(import.id, file_path.to_s)

        render json: { import: import }, status: :created
      end
    end
  end
end
