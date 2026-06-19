class RuleSet < ApplicationRecord
  belongs_to :user

  STARTER_PATH = Rails.root.join("config/rule_set_starter.yaml")

  def self.default_content
    @default_content ||= normalize_yaml(YAML.safe_load_file(STARTER_PATH))
  end

  def self.normalize_yaml(raw)
    categories = {}
    raw["categories"].each do |parent_name, children|
      categories[parent_name] = {}
      children.each do |child_name, child_data|
        next unless child_data.is_a?(Hash)

        keywords = (child_data["rules"] || [])
          .select { |r| r.is_a?(Hash) && r["type"] == "keyword" }
          .map { |r| r["value"] }
        merchants = (child_data["merchants"] || []).map(&:to_s)

        categories[parent_name][child_name] = {
          "accounting_account" => child_data["accounting_account"],
          "keywords" => keywords,
          "merchants" => merchants
        }
      end
    end

    {
      "version" => raw["version"],
      "settings" => raw["settings"],
      "categories" => categories
    }
  end

  def duplicate_pattern_conflicts
    RuleSetPatternIndex.duplicate_conflicts(content)
  end

  def changed_patterns_from(previous_content)
    RuleSetPatternIndex.changed_patterns(previous_content, content)
  end
end
