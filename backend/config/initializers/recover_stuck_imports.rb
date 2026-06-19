Rails.application.config.after_initialize do
  # Any import stuck in "processing" after a server/Sidekiq restart will never complete.
  # Mark them failed so the UI doesn't show a permanent spinner.
  if defined?(ActiveRecord::Base) && ActiveRecord::Base.connection.table_exists?(:imports)
    stuck = Import.where(status: "processing").where("created_at < ?", 10.minutes.ago)
    if stuck.any?
      Rails.logger.warn("Recovering #{stuck.count} stuck import(s) left in 'processing' state")
      stuck.update_all(status: "failed")
    end
  end
rescue => e
  Rails.logger.error("recover_stuck_imports initializer failed: #{e.message}")
end
