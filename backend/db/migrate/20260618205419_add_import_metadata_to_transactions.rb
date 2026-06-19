class AddImportMetadataToTransactions < ActiveRecord::Migration[8.1]
  def up
    add_column :transactions, :created_ts_utc_iso, :string
    add_column :transactions, :import_file_name, :string

    # Backfill existing rows from created_at
    execute "UPDATE transactions SET created_ts_utc_iso = TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"')"
  end

  def down
    remove_column :transactions, :created_ts_utc_iso
    remove_column :transactions, :import_file_name
  end
end
