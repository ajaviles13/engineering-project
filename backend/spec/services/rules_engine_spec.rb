require "rails_helper"

RSpec.describe RulesEngine do
  let(:user) { create(:user) }
  let(:shopping) { create(:category, user: user, name: "Shopping") }
  let(:high_value) { create(:category, user: user, name: "High Value") }

  def build_txn(attrs = {})
    build(:transaction, { user: user, date: Date.today }.merge(attrs))
  end

  describe "description rules" do
    let!(:rule) { create(:rule, user: user, category: shopping, condition_field: "description", condition_operator: "contains", condition_value: "Amazon", priority: 0) }

    it "categorizes matching transaction" do
      txn = build_txn(description: "Amazon Purchase")
      RulesEngine.call(txn)
      expect(txn.category).to eq("Shopping")
    end

    it "is case insensitive" do
      txn = build_txn(description: "amazon prime")
      RulesEngine.call(txn)
      expect(txn.category).to eq("Shopping")
    end

    it "does not match non-matching description" do
      txn = build_txn(description: "Walmart Store")
      RulesEngine.call(txn)
      expect(txn.category).to be_nil
    end

    it "supports starts_with operator" do
      rule.update!(condition_operator: "starts_with", condition_value: "AMZN")
      txn = build_txn(description: "AMZN Marketplace")
      RulesEngine.call(txn)
      expect(txn.category).to eq("Shopping")
    end
  end

  describe "amount rules" do
    let!(:rule) { create(:rule, user: user, category: high_value, condition_field: "amount", condition_operator: "gt", condition_value: "1000", priority: 0) }

    it "flags high value transaction" do
      txn = build_txn(amount: 1500.00)
      RulesEngine.call(txn)
      expect(txn.category).to eq("High Value")
    end

    it "does not flag low value transaction" do
      txn = build_txn(amount: 50.00)
      RulesEngine.call(txn)
      expect(txn.category).to be_nil
    end
  end

  describe "conflict detection" do
    let(:transport) { create(:category, user: user, name: "Transport") }
    let!(:rule1) { create(:rule, user: user, category: shopping, condition_field: "description", condition_operator: "contains", condition_value: "Store", priority: 1) }
    let!(:rule2) { create(:rule, user: user, category: transport, condition_field: "description", condition_operator: "contains", condition_value: "Store", priority: 0) }

    it "flags the transaction when multiple rules match" do
      txn = build_txn(description: "Grocery Store")
      RulesEngine.call(txn)
      expect(txn.category).to be_nil
      expect(txn.status).to eq("flagged")
      expect(txn.anomaly_flags["rules_conflict"]).to be_present
    end
  end
end
