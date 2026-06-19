class CreateRuleSets < ActiveRecord::Migration[8.1]
  def change
    create_table :rule_sets do |t|
      t.references :user, null: false, foreign_key: true, index: { unique: true }
      t.jsonb :content, null: false, default: {}

      t.timestamps
    end
  end
end
