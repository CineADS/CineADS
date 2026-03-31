/**
 * Rule Engine — Motor de automação para sellers.
 * Avalia regras cadastradas contra eventos de domínio e executa ações configuradas.
 * Regras são persistidas na tabela automation_rules.
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import type { DomainEvent } from "@/events/event-types";
import type {
  RuleCondition,
  RuleAction,
  AutomationRuleDTO,
  AutomationLogDTO,
} from "./rule-types";

function evaluateCondition(
  condition: RuleCondition,
  payload: Record<string, unknown>
): boolean {
  const value = payload[condition.field];
  switch (condition.operator) {
    case "equals":
      return value === condition.value;
    case "not_equals":
      return value !== condition.value;
    case "greater_than":
      return Number(value) > Number(condition.value);
    case "less_than":
      return Number(value) < Number(condition.value);
    case "greater_or_equal":
      return Number(value) >= Number(condition.value);
    case "less_or_equal":
      return Number(value) <= Number(condition.value);
    case "contains":
      return String(value).includes(String(condition.value));
    case "not_contains":
      return !String(value).includes(String(condition.value));
    default:
      return false;
  }
}

function allConditionsMet(
  conditions: RuleCondition[],
  payload: Record<string, unknown>
): boolean {
  if (conditions.length === 0) return true;
  return conditions.every((c) => evaluateCondition(c, payload));
}

async function executeAction(
  action: RuleAction,
  event: DomainEvent,
  rule: AutomationRuleDTO
): Promise<void> {
  logger.info("ruleEngine.executeAction", {
    actionType: action.type,
    ruleName: rule.name,
    tenantId: event.tenantId,
  });

  switch (action.type) {
    case "notify_user":
      await supabase.from("notifications").insert({
        tenant_id: event.tenantId,
        title: (action.params.title as string) || `Automação: ${rule.name}`,
        message: (action.params.message as string) || `Regra "${rule.name}" disparada por ${event.type}`,
        type: "automation",
        user_id: action.params.userId as string || null,
      });
      break;

    case "create_log":
      await supabase.from("integration_logs").insert({
        tenant_id: event.tenantId,
        marketplace: event.marketplace || "system",
        type: "automation",
        message: `Regra "${rule.name}": ${action.params.message || event.type}`,
        details: event.payload as any,
      });
      break;

    case "pause_listing":
    case "activate_listing":
    case "adjust_price":
    case "send_email":
    case "enqueue_sync":
      // Stubs para ações futuras
      logger.info("ruleEngine: action stub", { type: action.type, rule: rule.name });
      break;

    default:
      logger.warn("ruleEngine: unknown action type", { type: action.type });
  }
}

export const ruleEngine = {
  /** Avaliar todas as regras ativas do tenant contra um evento */
  async evaluateEvent(event: DomainEvent): Promise<void> {
    const { data: rules, error } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("tenant_id", event.tenantId)
      .eq("status", "active");

    if (error) {
      logger.error("ruleEngine.evaluateEvent: failed to fetch rules", { error });
      return;
    }

    if (!rules || rules.length === 0) return;

    for (const row of rules) {
      const rule = mapRuleRow(row);
      // Verificar se a regra escuta este tipo de evento
      if (rule.triggerEvents.length > 0 && !rule.triggerEvents.includes(event.type)) {
        continue;
      }

      const payload = event.payload as Record<string, unknown>;
      if (!allConditionsMet(rule.conditions, payload)) {
        continue;
      }

      logger.info("ruleEngine: rule matched", { ruleName: rule.name, eventType: event.type });

      // Executar ações
      const executedActions: string[] = [];
      let status = "success";
      let errorMsg: string | null = null;

      for (const action of rule.actions) {
        try {
          await executeAction(action, event, rule);
          executedActions.push(action.type);
        } catch (err) {
          status = "error";
          errorMsg = err instanceof Error ? err.message : String(err);
          logger.error("ruleEngine: action failed", { action: action.type, error: errorMsg });
        }
      }

      // Registrar log da automação
      await supabase.from("automation_logs").insert([{
        tenant_id: event.tenantId,
        rule_id: rule.id,
        rule_name: rule.name,
        event_type: event.type,
        conditions_matched: payload as any,
        actions_executed: { actions: executedActions } as any,
        status,
        error_message: errorMsg,
      }]);

      // Atualizar contadores da regra
      await supabase
        .from("automation_rules")
        .update({
          last_triggered_at: new Date().toISOString(),
          trigger_count: rule.triggerCount + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", rule.id);
    }
  },

  /** Listar regras de automação do tenant */
  async listRules(tenantId: string): Promise<AutomationRuleDTO[]> {
    const { data, error } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("ruleEngine.listRules failed", { error });
      throw error;
    }
    return (data || []).map(mapRuleRow);
  },

  /** Listar logs de automação */
  async listLogs(tenantId: string, limit = 50): Promise<AutomationLogDTO[]> {
    const { data, error } = await supabase
      .from("automation_logs")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error("ruleEngine.listLogs failed", { error });
      throw error;
    }
    return (data || []).map((r: any) => ({
      id: r.id,
      tenantId: r.tenant_id,
      ruleId: r.rule_id,
      ruleName: r.rule_name,
      eventType: r.event_type,
      conditionsMatched: r.conditions_matched || {},
      actionsExecuted: r.actions_executed || {},
      status: r.status,
      errorMessage: r.error_message,
      createdAt: r.created_at,
    }));
  },
};

function mapRuleRow(row: any): AutomationRuleDTO {
  const conditions = row.conditions as any;
  const actions = row.actions as any;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description,
    ruleType: row.rule_type,
    triggerEvents: conditions?.triggerEvents || [],
    conditions: conditions?.conditions || [],
    actions: Array.isArray(actions) ? actions : actions?.actions || [],
    status: row.status,
    priority: row.priority,
    lastTriggeredAt: row.last_triggered_at,
    triggerCount: row.trigger_count || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
