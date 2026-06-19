require "rails_helper"

RSpec.describe Transaction, type: :model do
  let(:user) { create(:user) }

  it "is valid with valid attributes" do
    expect(build(:transaction, user: user)).to be_valid
  end

  it "requires date" do
    expect(build(:transaction, user: user, date: nil)).not_to be_valid
  end

  it "requires amount" do
    expect(build(:transaction, user: user, amount: nil)).not_to be_valid
  end

  it "rejects invalid status" do
    expect(build(:transaction, user: user, status: "garbage")).not_to be_valid
  end

  it "defaults status to pending" do
    expect(create(:transaction, user: user).status).to eq("pending")
  end

  describe "scopes" do
    let!(:flagged)      { create(:transaction, user: user, status: "flagged") }
    let!(:pending_txn)  { create(:transaction, user: user, status: "pending") }
    let!(:uncategorized){ create(:transaction, user: user, category: nil) }
    let!(:categorized)  { create(:transaction, user: user, category: "Shopping") }

    it "filters flagged" do
      expect(Transaction.flagged).to include(flagged)
      expect(Transaction.flagged).not_to include(pending_txn)
    end

    it "filters uncategorized" do
      expect(Transaction.uncategorized).to include(uncategorized)
      expect(Transaction.uncategorized).not_to include(categorized)
    end
  end
end
