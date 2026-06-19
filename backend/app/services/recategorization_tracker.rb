class RecategorizationTracker
  TTL = 24 * 60 * 60  # 24 hours in seconds

  def self.key(user_id) = "recategorization:#{user_id}"

  def self.start(user_id, patterns, total)
    Sidekiq.redis do |conn|
      conn.set(key(user_id), {
        running: true,
        completed: false,
        total: total,
        processed: 0,
        patterns: patterns,
        started_at: Time.current.iso8601,
        completed_at: nil
      }.to_json, ex: TTL)
    end
  end

  def self.increment(user_id, count)
    Sidekiq.redis do |conn|
      raw = conn.get(key(user_id))
      next unless raw

      data = JSON.parse(raw)
      data["processed"] = (data["processed"] || 0) + count
      conn.set(key(user_id), data.to_json, ex: TTL)
    end
  end

  def self.finish(user_id)
    Sidekiq.redis do |conn|
      raw = conn.get(key(user_id))
      next unless raw

      data = JSON.parse(raw)
      data["running"] = false
      data["completed"] = true
      data["processed"] = data["total"]
      data["completed_at"] = Time.current.iso8601
      conn.set(key(user_id), data.to_json, ex: TTL)
    end
  end

  def self.dismiss(user_id)
    Sidekiq.redis { |conn| conn.del(key(user_id)) }
  end

  def self.get(user_id)
    Sidekiq.redis do |conn|
      raw = conn.get(key(user_id))
      next default_status unless raw

      data = JSON.parse(raw, symbolize_names: true)
      total = data[:total].to_i
      processed = data[:processed].to_i
      progress = total > 0 ? [(processed.to_f / total * 100).round(1), 100.0].min : 0.0

      data.merge(progress: progress)
    end
  end

  def self.default_status
    { running: false, completed: false, progress: 0.0, total: 0, processed: 0, patterns: [] }
  end
end
