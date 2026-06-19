class RuleSetRecategorizationJob
  include Sidekiq::Job

  sidekiq_options queue: "default", retry: 3

  BATCH_SIZE = 500

  # pattern_to_category: Hash { "normalized_pattern" => "Parent > Child" }
  # Sidekiq serializes it as a JSON object; received as a String-keyed hash.
  def perform(user_id, pattern_to_category = {}, last_id = 0, finalize = false)
    user = User.find_by(id: user_id)
    return unless user

    if finalize
      RecategorizationTracker.finish(user_id)
        DashboardStatsCache.invalidate(user_id)
      return
    end

    patterns = Array(pattern_to_category.keys)
    return if patterns.empty?

    user.rule_set  # preload into AR association cache — avoids N+1 inside RulesEngine

    scope = user.transactions.matching_for_recategorization(patterns)

    # On the first pass, count total matching rows and initialize progress tracking
    if last_id == 0
      total = scope.count
      RecategorizationTracker.start(user_id, patterns, total)
    end

    batch = scope.where("transactions.id > ?", last_id).order(:id).limit(BATCH_SIZE).to_a
    if batch.empty?
      self.class.perform_async(user_id, pattern_to_category, 0, true)
      return
    end

    batch.each do |txn|
      txn.association(:user).target = user  # reuse loaded user + rule_set, no N+1
      previous_category = txn.category
      previous_status   = txn.status  # preserve status — auto-tagging must not change it

      # 1. Try RulesEngine first (matches on description keywords)
      RulesEngine.call(txn)
      txn.status = previous_status  # RulesEngine sets approved; undo that

      # 2. If description-based rules didn't fire, check if the EXISTING category
      #    itself matches one of the changed patterns — direct category migration.
      if txn.category == previous_category
        direct_category = direct_category_match(txn.category, pattern_to_category)
        txn.category = direct_category if direct_category
      end

      txn.save! if txn.category != previous_category
    end

    RecategorizationTracker.increment(user_id, batch.size)
    self.class.perform_async(user_id, pattern_to_category, batch.last.id, false)
  end

  private

  # Returns the mapped category only when the current category is a flat/legacy label
  # (e.g. "Entertainment", "Shopping") that directly matches a changed pattern.
  # Skips proper "Parent > Child" hierarchical categories — those are only changed
  # by RulesEngine's description-keyword matching to avoid false positives.
  def direct_category_match(current_category, pattern_to_category)
    return nil if current_category.blank?
    return nil if current_category.include?(" > ")  # already a valid hierarchical category

    normalized_cat = current_category.downcase.strip
    best = pattern_to_category
      .select { |pattern, _| normalized_cat.include?(pattern.downcase) }
      .max_by { |pattern, _| pattern.length }

    best&.last
  end
end
