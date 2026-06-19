# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_06_19_000001) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pg_trgm"

  create_table "categories", force: :cascade do |t|
    t.string "color"
    t.datetime "created_at", null: false
    t.string "name"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id"], name: "index_categories_on_user_id"
  end

  create_table "imports", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.integer "error_count"
    t.jsonb "error_log", default: []
    t.string "filename"
    t.integer "row_count"
    t.string "status"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id"], name: "index_imports_on_user_id"
  end

  create_table "jwt_denylists", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "exp"
    t.string "jti"
    t.datetime "updated_at", null: false
    t.index ["jti"], name: "index_jwt_denylists_on_jti", unique: true
  end

  create_table "rule_sets", force: :cascade do |t|
    t.jsonb "content", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id"], name: "index_rule_sets_on_user_id", unique: true
  end

  create_table "rules", force: :cascade do |t|
    t.string "action_type", default: "categorize", null: false
    t.string "action_value"
    t.boolean "active", default: true, null: false
    t.bigint "category_id"
    t.string "condition_field", null: false
    t.string "condition_operator", null: false
    t.string "condition_value", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.integer "priority", default: 0, null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["category_id"], name: "index_rules_on_category_id"
    t.index ["user_id", "active"], name: "index_rules_on_user_id_and_active"
    t.index ["user_id", "priority"], name: "index_rules_on_user_id_and_priority"
    t.index ["user_id"], name: "index_rules_on_user_id"
  end

  create_table "transactions", force: :cascade do |t|
    t.decimal "amount", precision: 15, scale: 2, null: false
    t.jsonb "anomaly_flags", default: {}, null: false
    t.string "category"
    t.datetime "created_at", null: false
    t.string "created_ts_utc_iso"
    t.date "date", null: false
    t.string "description"
    t.string "import_file_name"
    t.string "source", default: "manual", null: false
    t.string "status", default: "pending", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["anomaly_flags"], name: "index_transactions_on_anomaly_flags", using: :gin
    t.index ["description"], name: "index_transactions_on_description", opclass: :gin_trgm_ops, using: :gin
    t.index ["status"], name: "index_transactions_on_flagged_status", where: "((status)::text = 'flagged'::text)"
    t.index ["user_id", "category"], name: "index_transactions_on_user_id_and_category"
    t.index ["user_id", "date", "description", "amount"], name: "index_transactions_on_duplicate_detection", unique: true
    t.index ["user_id", "date"], name: "index_transactions_on_user_id_and_date"
    t.index ["user_id", "status"], name: "index_transactions_on_user_id_and_status"
    t.index ["user_id"], name: "index_transactions_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.datetime "remember_created_at"
    t.datetime "reset_password_sent_at"
    t.string "reset_password_token"
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  add_foreign_key "categories", "users"
  add_foreign_key "imports", "users"
  add_foreign_key "rule_sets", "users"
  add_foreign_key "rules", "categories"
  add_foreign_key "rules", "users"
  add_foreign_key "transactions", "users"
end
