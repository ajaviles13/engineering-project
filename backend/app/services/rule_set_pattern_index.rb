class RuleSetPatternIndex
  PatternConflict = Struct.new(:pattern, :category, :existing_category, keyword_init: true)

  def self.normalize(pattern)
    pattern.to_s.downcase.strip
  end

  def self.build(content)
    index = {}
    each_pattern(content) do |pattern, category|
      key = normalize(pattern)
      next if key.blank?

      index[key] = category
    end
    index
  end

  def self.each_pattern(content)
    content.fetch("categories", {}).each do |parent, children|
      next unless children.is_a?(Hash)

      children.each do |child, data|
        next unless data.is_a?(Hash)

        category = "#{parent} > #{child}"
        Array(data["keywords"]).each { |pattern| yield(pattern, category) }
        Array(data["merchants"]).each { |pattern| yield(pattern, category) }
      end
    end
  end

  def self.duplicate_conflicts(content)
    seen = {}
    conflicts = []

    each_pattern(content) do |pattern, category|
      key = normalize(pattern)
      next if key.blank?

      if seen[key]
        conflicts << PatternConflict.new(
          pattern: pattern,
          category: category,
          existing_category: seen[key]
        )
      else
        seen[key] = category
      end
    end

    conflicts
  end

  # Returns { "normalized_pattern" => "Parent > Child" } for every pattern whose
  # category changed (or that is newly added) between before and after.
  def self.changed_patterns(before_content, after_content)
    before_index = build(before_content)
    after_index  = build(after_content)

    after_index.select { |key, category| before_index[key] != category }
  end

  def self.all_patterns(content)
    build(content).keys
  end
end
