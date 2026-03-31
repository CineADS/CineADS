/**
 * Webhook Manager
 * Processa eventos recebidos de marketplaces (via Edge Functions/webhooks).
 * Valida, registra logs e delega para Sync Engine.
 */
import { logger } from "@/lib/logger";
import { supabase } from "@/integrations/supabase/client";
import { syncEngine } from "./sync-engine";
import type { IntegrationEvent, IntegrationEventType } from "../types/integration-events";

type EventHandler = (event: IntegrationEvent) => Promise<void>;

const handlers = new Map<IntegrationEventType, EventHandler[]>();

export const webhookManager = {
  /** Registrar handler para tipo de evento */
  on(eventType: IntegrationEventType, handler: EventHandler): void {
    const existing = handlers.get(eventType) || [];
    existing.push(handler);
    handlers.set(eventType, existing);
    logger.debug("webhookManager.on", { eventType });
  },

  /** Processar evento recebido */
  async processEvent(event: IntegrationEvent): Promise<void> {
    logger.info("webhookManager.processEvent", {
      type: event.type,
      marketplace: event.marketplace,
      tenantId: event.tenantId,
    });

    // Validate
    if (!event.type || !event.marketplace || !event.tenantId) {
      logger.error("webhookManager: invalid event", { event });
      return;
    }

    // Log to integration_logs
    try {
      await supabase.from("integration_logs").insert([{
        tenant_id: event.tenantId,
        marketplace: event.marketplace,
        type: "info",
        message: `Webhook: ${event.type}`,
        details: JSON.parse(JSON.stringify(event.payload)),
      }]);
    } catch (err) {
      logger.error("webhookManager: failed to log event", { err });
    }

    // Run registered handlers
    const eventHandlers = handlers.get(event.type) || [];
    for (const handler of eventHandlers) {
      try {
        await handler(event);
      } catch (err) {
        logger.error("webhookManager: handler error", { type: event.type, err });
      }
    }
  },

  /** Register default handlers that delegate to sync engine */
  registerDefaults(): void {
    this.on("ORDER_CREATED", async (event) => {
      await syncEngine.syncOrders(event.tenantId, event.marketplace);
    });

    this.on("ORDER_UPDATED", async (event) => {
      await syncEngine.syncOrders(event.tenantId, event.marketplace);
    });

    this.on("STOCK_UPDATED", async (event) => {
      await syncEngine.syncStock(event.tenantId, event.marketplace);
    });

    this.on("PRICE_UPDATED", async (event) => {
      await syncEngine.syncPrices(event.tenantId, event.marketplace);
    });

    logger.info("webhookManager: default handlers registered");
  },
};
