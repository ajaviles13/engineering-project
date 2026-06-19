require "rails_helper"

RSpec.describe AnomalyDetector do
  let(:user) { create(:user) }

  def build_txn(attrs = {})
    build(:transaction, { user: user, date: Date.today }.merge(attrs))
  end

  describe "missing description" do
    it "flags blank description" do
      txn = build_txn(description: "")
      AnomalyDetector.call(txn)
      expect(txn.anomaly_flags).to have_key("missing_description")
      expect(txn.status).to eq("flagged")
    end

    it "flags nil description" do
      txn = build_txn(description: nil)
      AnomalyDetector.call(txn)
      expect(txn.anomaly_flags).to have_key("missing_description")
    end

    it "does not flag present description" do
      txn = build_txn(description: "Coffee")
      AnomalyDetector.call(txn)
      expect(txn.anomaly_flags).not_to have_key("missing_description")
    end
  end

  describe "duplicate detection" do
    it "flags duplicate transaction" do
      create(:transaction, user: user, date: Date.today, description: "Amazon", amount: -50.00)
      txn = build_txn(description: "Amazon", amount: -50.00)
      AnomalyDetector.call(txn)
      expect(txn.anomaly_flags).to have_key("duplicate")
    end

    it "does not flag unique transaction" do
      txn = build_txn(description: "Unique Purchase", amount: -99.00)
      AnomalyDetector.call(txn)
      expect(txn.anomaly_flags).not_to have_key("duplicate")
    end
  end

  describe "suspicious round amounts" do
    it "flags large round amount" do
      txn = build_txn(amount: 10_000.00)
      AnomalyDetector.call(txn)
      expect(txn.anomaly_flags).to have_key("suspicious_round")
    end

    it "does not flag small round amount" do
      txn = build_txn(amount: 100.00)
      AnomalyDetector.call(txn)
      expect(txn.anomaly_flags).not_to have_key("suspicious_round")
    end

    it "does not flag non-round large amount" do
      txn = build_txn(amount: 7543.21)
      AnomalyDetector.call(txn)
      expect(txn.anomaly_flags).not_to have_key("suspicious_round")
    end
  end

  describe "status set to flagged" do
    it "sets status to flagged when any flag present" do
      txn = build_txn(description: nil)
      AnomalyDetector.call(txn)
      expect(txn.status).to eq("flagged")
    end

    it "leaves status as pending when no flags" do
      txn = build_txn(description: "Normal purchase", amount: -25.00)
      AnomalyDetector.call(txn)
      expect(txn.status).to eq("pending")
      expect(txn.anomaly_flags).to be_empty
    end
  end
end
