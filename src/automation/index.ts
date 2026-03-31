/**
 * Automation Module — exports centrais do motor de automação.
 */
export { ruleEngine } from "./rule-engine";
export { ruleTemplates } from "./rule-triggers";
export type {
  AutomationRuleDTO,
  AutomationLogDTO,
  RuleType,
  RuleCondition,
  RuleAction,
  ActionType,
  ConditionOperator,
} from "./rule-types";
