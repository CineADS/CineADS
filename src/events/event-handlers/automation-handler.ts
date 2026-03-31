/**
 * Automation Event Handler
 * Escuta eventos de domínio e delega para o Rule Engine avaliar regras de automação.
 */
import { eventBus } from "../event-bus";
import { logger } from "@/lib/logger";
import type { DomainEvent } from "../event-types";

export function registerAutomationHandlers(): void {
  const automationEvents = [
    "ORDER_CREATED",
    "ORDER_UPDATED",
    "STOCK_UPDATED",
    "STOCK_LOW",
    "STOCK_OUT",
    "PRICE_UPDATED",
    "INTEGRATION_ERROR",
    "SYNC_FAILED",
  ] as const;

  for (const eventType of automationEvents) {
    eventBus.on(
      eventType,
      async (event: DomainEvent) => {
        logger.debug("automationHandler: evaluating rules", {
          eventType: event.type,
          tenantId: event.tenantId,
        });
        // Em produção: chamar ruleEngine.evaluateRules(event)
        // Importação dinâmica para evitar circular dependency
        try {
          const { ruleEngine } = await import("@/automation/rule-engine");
          await ruleEngine.evaluateEvent(event);
        } catch (err) {
          logger.error("automationHandler: rule evaluation failed", {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      },
      "automation"
    );
  }

  logger.info("automationHandler: registered for", { events: automationEvents.length });
}
