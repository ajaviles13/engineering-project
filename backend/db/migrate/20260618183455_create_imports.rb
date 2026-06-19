class CreateImports < ActiveRecord::Migration[8.1]
  def change
    create_table :imports do |t|
      t.references :user, null: false, foreign_key: true
      t.string :filename
      t.string :status
      t.integer :row_count
      t.integer :error_count

      t.timestamps
    end
  end
end
