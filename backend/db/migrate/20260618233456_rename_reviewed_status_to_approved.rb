class RenameReviewedStatusToApproved < ActiveRecord::Migration[8.1]
  def up
    execute "UPDATE transactions SET status = 'approved' WHERE status = 'reviewed'"
  end

  def down
    execute "UPDATE transactions SET status = 'reviewed' WHERE status = 'approved'"
  end
end
