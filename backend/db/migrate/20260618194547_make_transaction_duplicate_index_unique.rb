class MakeTransactionDuplicateIndexUnique < ActiveRecord::Migration[8.1]
  def up
    # Remove duplicate rows, keeping the one with the lowest id
    execute <<~SQL
      DELETE FROM transactions
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM transactions
        GROUP BY user_id, date, description, amount
      )
    SQL

    remove_index :transactions, name: "index_transactions_on_duplicate_detection", if_exists: true
    add_index :transactions, [:user_id, :date, :description, :amount],
              unique: true,
              name: "index_transactions_on_duplicate_detection"
  end

  def down
    remove_index :transactions, name: "index_transactions_on_duplicate_detection", if_exists: true
    add_index :transactions, [:user_id, :date, :description, :amount],
              name: "index_transactions_on_duplicate_detection"
  end
end
