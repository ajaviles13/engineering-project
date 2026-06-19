module Api
  module V1
    class RuleSetsController < ApplicationController
      def show
        rule_set = current_user.rule_set || current_user.create_rule_set!(content: RuleSet.default_content)
        render json: { rule_set: rule_set.content }
      end

      def update
        rule_set = current_user.rule_set || current_user.build_rule_set
        previous_content = rule_set.persisted? ? rule_set.content.deep_dup : {}

        rule_set.content = rule_set_params
        conflicts = rule_set.duplicate_pattern_conflicts
        if conflicts.any?
          return render json: {
            errors: conflicts.map { |conflict|
              "\"#{conflict.pattern}\" is already used by #{conflict.existing_category}"
            }
          }, status: :unprocessable_entity
        end

        # Hash of { "pattern" => "Parent > Child" } for patterns that changed
        changed_patterns = rule_set.changed_patterns_from(previous_content)
        rule_set.save!

        if changed_patterns.any?
          RuleSetRecategorizationJob.perform_async(current_user.id, changed_patterns)
        end

        render json: {
          rule_set: rule_set.content,
          recategorization_enqueued: changed_patterns.any?,
          recategorization_patterns: changed_patterns.keys  # array for frontend display
        }
      end

      def reset
        rule_set = current_user.rule_set || current_user.build_rule_set
        rule_set.content = RuleSet.default_content
        rule_set.save!
        render json: { rule_set: rule_set.content }
      end

      private

      def rule_set_params
        params.require(:rule_set).permit!.to_h
      end
    end
  end
end
