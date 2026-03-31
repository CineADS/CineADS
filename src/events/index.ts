/**
 * Events Module — bootstrap do sistema de eventos.
 * Registra todos os handlers de domínio.
 */
import { registerInventoryHandlers } from "./event-handlers/inventory-handler";
import { registerAnalyticsHandlers } from "./event-handlers/analytics-handler";
import { registerAutomationHandlers } from "./event-handlers/automation-handler";
import { logger } from "@/lib/logger";

let initialized = false;

export function initializeEventBus(): void {
  if (initialized) return;

  registerInventoryHandlers();
  registerAnalyticsHandlers();
  registerAutomationHandlers();

  initialized = true;
  logger.info("Event Bus initialized with all domain handlers");
}

export { eventBus } from "./event-bus";
export type { DomainEvent, DomainEventType, EventHandler } from "./event-types";
