require "rails_helper"

RSpec.describe RuleSetRecategorizationJob, type: :job do
  let(:user) { create(:user) }

  let(:pattern_map) { { "housing" => "Travel > Lodging" } }

  before do
    user.rule_set.update!(content: {
      "categories" => {
        "Travel" => {
          "Lodging" => {
            "keywords" => ["housing"],
            "merchants" => [],
            "accounting_account" => "Lodging"
          }
        }
      }
    })
  end

  it "recategorizes transactions whose descriptions match changed patterns" do
    txn = create(:transaction, user: user, description: "Monthly housing payment", category: "Housing")

    described_class.new.perform(user.id, pattern_map, 0, false)
    described_class.new.perform(user.id, pattern_map, txn.id, false)
    described_class.new.perform(user.id, pattern_map, 0, true)

    expect(txn.reload.category).to eq("Travel > Lodging")
  end

  it "does not scan unrelated transactions when patterns are provided" do
    unrelated = create(:transaction, user: user, description: "Coffee shop", category: "Food")

    described_class.new.perform(user.id, pattern_map, 0, false)
    described_class.new.perform(user.id, pattern_map, 0, true)

    expect(unrelated.reload.category).to eq("Food")
  end
end
