class CreateRules < ActiveRecord::Migration[8.1]
  def change
    create_table :rules do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, null: false
      t.string :condition_field, null: false
      t.string :condition_operator, null: false
      t.string :condition_value, null: false
      t.references :category, null: false, foreign_key: true
      t.integer :priority, null: false, default: 0
      t.boolean :active, null: false, default: true

      t.timestamps
    end

    add_index :rules, [:user_id, :priority]
    add_index :rules, [:user_id, :active]
  end
end
