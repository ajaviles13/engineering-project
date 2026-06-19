class AddErrorLogToImports < ActiveRecord::Migration[8.1]
  def change
    add_column :imports, :error_log, :jsonb, default: []
  end
end
