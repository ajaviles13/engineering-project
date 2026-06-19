require "faker"

puts "Seeding database..."

user = User.find_or_create_by!(email: "demo@bookkeeping.com") do |u|
  u.password = "password123"
  u.password_confirmation = "password123"
end

puts "Created user: #{user.email}"

categories = {}
Category::DEFAULT_CATEGORIES.each do |cat|
  categories[cat[:name]] = user.categories.find_or_create_by!(name: cat[:name]) do |c|
    c.color = cat[:color]
  end
end

puts "Created #{categories.size} categories"

[
  { name: "Amazon → Shopping", field: "description", op: "contains", value: "Amazon", category: "Shopping" },
  { name: "Uber → Transportation", field: "description", op: "contains", value: "Uber", category: "Transportation" },
  { name: "Netflix → Entertainment", field: "description", op: "contains", value: "Netflix", category: "Entertainment" },
  { name: "Payroll → Income", field: "description", op: "contains", value: "Payroll", category: "Income" },
  { name: "High Value Flag (>$5000)", field: "amount", op: "gt", value: "5000", category: "High Value" }
].each_with_index do |rule_data, i|
  cat = categories[rule_data[:category]]
  next unless cat
  user.rules.find_or_create_by!(name: rule_data[:name]) do |r|
    r.condition_field = rule_data[:field]
    r.condition_operator = rule_data[:op]
    r.condition_value = rule_data[:value]
    r.category = cat
    r.action_type = "categorize"
    r.action_value = cat.name
    r.priority = i
    r.active = true
  end
end

puts "Created sample rules"

DESCRIPTIONS = [
  "Amazon Purchase", "Uber Ride", "Netflix Subscription", "Starbucks Coffee",
  "Whole Foods Market", "Target Store", "Walmart Supercenter", "Shell Gas Station",
  "CVS Pharmacy", "Chipotle Mexican Grill", "Payroll Direct Deposit", "Rent Payment",
  "Electric Bill", "Internet Service", "Apple iTunes", "Spotify Premium",
  "Gym Membership", "Doctor Visit Copay", "Dental Cleaning", "Home Depot"
].freeze

puts "Seeding 50,000 transactions..."
inserted = 0

50.times do |batch_num|
  records = 1000.times.map do
    date = Faker::Date.between(from: 2.years.ago, to: Date.today)
    desc = DESCRIPTIONS.sample
    amount = case desc
    when "Payroll Direct Deposit" then rand(3000.0..8000.0).round(2)
    when "Rent Payment"           then -rand(1200.0..3000.0).round(2)
    when "Amazon Purchase"        then -rand(10.0..500.0).round(2)
    else                               -rand(5.0..300.0).round(2)
    end

    {
      user_id: user.id,
      date: date,
      description: desc,
      amount: amount,
      category: nil,
      status: "pending",
      source: "csv",
      anomaly_flags: {},
      created_at: Time.current,
      updated_at: Time.current
    }
  end

  Transaction.insert_all(records)
  inserted += records.size
  print "." if (batch_num % 10).zero?
end

puts "\nInserted #{inserted} transactions"
puts "Login: demo@bookkeeping.com / password123"
