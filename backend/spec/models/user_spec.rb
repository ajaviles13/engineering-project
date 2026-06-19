require "rails_helper"

RSpec.describe User, type: :model do
  it "is valid with email and password" do
    expect(build(:user)).to be_valid
  end

  it "requires email" do
    expect(build(:user, email: nil)).not_to be_valid
  end

  it "requires unique email" do
    create(:user, email: "test@example.com")
    expect(build(:user, email: "test@example.com")).not_to be_valid
  end

  it "has many transactions" do
    user = create(:user)
    t1 = create(:transaction, user: user)
    t2 = create(:transaction, user: user)
    expect(user.transactions).to include(t1, t2)
  end
end
