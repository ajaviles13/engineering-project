module Api
  module V1
    class RulesController < ApplicationController
      before_action :set_rule, only: %i[show update destroy]

      def index
        rules = current_user.rules.active.by_priority
        render json: { rules: rules.map { |r| serialize_rule(r) } }
      end

      def show
        render json: { rule: serialize_rule(@rule) }
      end

      def create
        new_rule = current_user.rules.build(rule_params)

        conflicts = current_user.rules.active.select { |r| r.overlaps_with?(new_rule) }
        if conflicts.any?
          names = conflicts.map(&:name).join(", ")
          render json: {
            error: "This rule overlaps with existing rule(s): #{names}. Modify the condition to avoid overlap."
          }, status: :unprocessable_entity
          return
        end

        new_rule.save!
        CustomRuleSweepJob.perform_async(new_rule.id)
        render json: { rule: serialize_rule(new_rule) }, status: :created
      end

      def update
        @rule.update!(rule_params)
        render json: { rule: serialize_rule(@rule) }
      end

      def destroy
        @rule.destroy!
        render json: { message: "Rule deleted" }
      end

      def reorder
        params[:rules].each_with_index do |rule_data, index|
          current_user.rules.where(id: rule_data[:id]).update_all(priority: index)
        end
        render json: { message: "Rules reordered" }
      end

      private

      def set_rule
        @rule = current_user.rules.find(params[:id])
      end

      def rule_params
        params.require(:rule).permit(
          :name, :condition_field, :condition_operator, :condition_value,
          :action_type, :action_value, :priority, :active
        )
      end

      def serialize_rule(rule)
        {
          id: rule.id,
          name: rule.name,
          condition_field: rule.condition_field,
          condition_operator: rule.condition_operator,
          condition_value: rule.condition_value,
          action_type: rule.action_type,
          action_value: rule.action_value,
          priority: rule.priority,
          active: rule.active,
          created_at: rule.created_at,
          updated_at: rule.updated_at
        }
      end
    end
  end
end
