class CreateTransactions < ActiveRecord::Migration[8.1]
  def change
    create_table :transactions do |t|
      t.references :user, null: false, foreign_key: true
      t.date :date, null: false
      t.string :description
      t.decimal :amount, precision: 15, scale: 2, null: false
      t.string :category
      t.string :status, null: false, default: "pending"
      t.string :source, null: false, default: "manual"
      t.jsonb :anomaly_flags, null: false, default: {}

      t.timestamps
    end

    add_index :transactions, [:user_id, :date]
    add_index :transactions, [:user_id, :status]
    add_index :transactions, [:user_id, :category]
    add_index :transactions, :anomaly_flags, using: :gin
    add_index :transactions, :description, using: :gin, opclass: :gin_trgm_ops
    add_index :transactions, [:user_id, :date, :description, :amount],
              name: "index_transactions_on_duplicate_detection"
    add_index :transactions, :status,
              where: "status = 'flagged'",
              name: "index_transactions_on_flagged_status"
  end
end
