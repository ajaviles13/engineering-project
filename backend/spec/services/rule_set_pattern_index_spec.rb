require "rails_helper"

RSpec.describe RuleSetPatternIndex do
  describe ".duplicate_conflicts" do
    it "detects the same keyword in different categories" do
      content = {
        "categories" => {
          "Travel" => {
            "Lodging" => { "keywords" => ["housing"], "merchants" => [] }
          },
          "Office Expenses" => {
            "Rent" => { "keywords" => ["housing"], "merchants" => [] }
          }
        }
      }

      conflicts = described_class.duplicate_conflicts(content)
      expect(conflicts.length).to eq(1)
      expect(conflicts.first.pattern).to eq("housing")
    end
  end

  describe ".changed_patterns" do
    it "returns newly added keywords" do
      before_content = {
        "categories" => {
          "Travel" => {
            "Lodging" => { "keywords" => [], "merchants" => [] }
          }
        }
      }
      after_content = {
        "categories" => {
          "Travel" => {
            "Lodging" => { "keywords" => ["housing"], "merchants" => [] }
          }
        }
      }

      expect(described_class.changed_patterns(before_content, after_content)).to eq(
        "housing" => "Travel > Lodging"
      )
    end
  end
end
