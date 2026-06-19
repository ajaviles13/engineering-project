class CustomRuleSweepJob
  include Sidekiq::Job

  sidekiq_options queue: "default", retry: 2

  BATCH_SIZE = 500

  def perform(rule_id, last_id = 0)
    rule = Rule.find_by(id: rule_id)
    return unless rule&.active?

    user = rule.user
    engine_class = RulesEngine

    scope = user.transactions
      .where.not(status: "approved")
      .where("id > ?", last_id)
      .order(:id)

    batch = scope.limit(BATCH_SIZE).to_a
    return if batch.empty?

    batch.each do |txn|
      txn.association(:user).target = user
      engine = engine_class.new(txn)
      next unless engine.apply_rule_if_matches(rule)
      txn.save! if txn.changed?
    end

    self.class.perform_async(rule_id, batch.last.id) if batch.size == BATCH_SIZE
  end
end
