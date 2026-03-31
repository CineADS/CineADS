/**
 * Automation Rule Types
 * Define os tipos de regras, condições e ações disponíveis no motor de automação.
 */
import type { DomainEventType } from "@/events/event-types";

export type RuleType =
  | "stock_alert"
  | "stock_pause_listing"
  | "order_delayed"
  | "price_adjustment"
  | "sync_error_alert"
  | "custom";

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "greater_or_equal"
  | "less_or_equal"
  | "contains"
  | "not_contains";

export type ActionType =
  | "notify_user"
  | "pause_listing"
  | "activate_listing"
  | "adjust_price"
  | "send_email"
  | "create_log"
  | "enqueue_sync";

export interface RuleCondition {
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean;
}

export interface RuleAction {
  type: ActionType;
  params: Record<string, unknown>;
}

export interface AutomationRuleDTO {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  ruleType: RuleType;
  triggerEvents: DomainEventType[];
  conditions: RuleCondition[];
  actions: RuleAction[];
  status: string;
  priority: string;
  lastTriggeredAt: string | null;
  triggerCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationLogDTO {
  id: string;
  tenantId: string;
  ruleId: string | null;
  ruleName: string | null;
  eventType: string;
  conditionsMatched: Record<string, unknown>;
  actionsExecuted: Record<string, unknown>;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}
