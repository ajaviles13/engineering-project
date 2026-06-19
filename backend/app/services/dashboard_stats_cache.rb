# Kept for explicit invalidation hooks after transaction/import mutations.
# Dashboard stats are computed live on each request (no read-through cache) so
# stale aggregate data cannot be served after writes.
class DashboardStatsCache
  CACHE_KEY_PREFIX = "dashboard_stats_"

  def self.key(user_id)
    "#{CACHE_KEY_PREFIX}#{user_id}"
  end

  def self.invalidate(user_id)
    Rails.cache.delete(key(user_id))
  end
end
