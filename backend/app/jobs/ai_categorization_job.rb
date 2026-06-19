class AiCategorizationJob
  include Sidekiq::Job

  sidekiq_options queue: "ai", retry: 3

  def perform(transaction_id)
    transaction = Transaction.find_by(id: transaction_id)
    return unless transaction
    return if transaction.category.present?

    rule_set = transaction.user.rule_set
    return unless rule_set

    categories_with_context = build_categories_context(rule_set.content)
    return if categories_with_context.empty?

    category_names = categories_with_context.keys

    client = Anthropic::Client.new
    response = client.messages(
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      tools: [categorize_tool(category_names)],
      tool_choice: { type: "tool", name: "categorize_transaction" },
      messages: [
        {
          role: "user",
          content: build_prompt(transaction, categories_with_context)
        }
      ]
    )

    tool_use = response.content.find { |c| c.type == "tool_use" }
    return unless tool_use

    category = tool_use.input["category"]
    confidence = tool_use.input["confidence"].to_f

    if category.present? && category_names.include?(category) && confidence >= 0.6
      transaction.update!(
        category: category,
        status: transaction.status == "pending" ? "approved" : transaction.status
      )
      DashboardStatsCache.invalidate(transaction.user_id)
    end
  rescue Anthropic::Error => e
    Rails.logger.error("AI categorization failed for transaction #{transaction_id}: #{e.message}")
  end

  private

  # Returns { "Parent > Child" => ["keyword1", "merchant1", ...], ... }
  def build_categories_context(content)
    context = {}
    content.fetch("categories", {}).each do |parent, children|
      next unless children.is_a?(Hash)
      children.each do |child, data|
        next unless data.is_a?(Hash)
        patterns = Array(data["keywords"]) + Array(data["merchants"])
        context["#{parent} > #{child}"] = patterns
      end
    end
    context
  end

  def categorize_tool(categories)
    {
      name: "categorize_transaction",
      description: "Categorize a financial transaction into the most appropriate category",
      input_schema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: categories,
            description: "The most appropriate category for this transaction"
          },
          confidence: {
            type: "number",
            description: "Confidence score between 0 and 1"
          },
          reasoning: {
            type: "string",
            description: "Brief explanation of why this category was chosen"
          }
        },
        required: ["category", "confidence"]
      }
    }
  end

  def build_prompt(transaction, categories_with_context)
    lines = categories_with_context.map do |category, patterns|
      hints = patterns.first(5).join(", ")
      hints.present? ? "  - #{category} (e.g. #{hints})" : "  - #{category}"
    end.join("\n")

    <<~PROMPT
      Categorize this financial transaction into one of the categories below.

      Transaction:
        Description: #{transaction.description.presence || "(none)"}
        Amount: $#{transaction.amount.abs}
        Date: #{transaction.date}

      Categories (with example keywords):
      #{lines}

      Choose the single best matching category name exactly as shown.
    PROMPT
  end
end
