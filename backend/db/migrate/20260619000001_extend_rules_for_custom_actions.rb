class ExtendRulesForCustomActions < ActiveRecord::Migration[8.0]
  def up
    add_column :rules, :action_type, :string, null: false, default: "categorize"
    add_column :rules, :action_value, :string

    change_column_null :rules, :category_id, true

    execute <<~SQL
      UPDATE rules
      SET action_value = categories.name
      FROM categories
      WHERE rules.category_id = categories.id
    SQL
  end

  def down
    remove_column :rules, :action_value
    remove_column :rules, :action_type
    change_column_null :rules, :category_id, false
  end
end
