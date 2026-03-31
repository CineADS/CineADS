/**
 * Analytics Event Handler
 * Escuta eventos de domínio para atualizar métricas e cache de analytics.
 */
import { eventBus } from "../event-bus";
import { logger } from "@/lib/logger";
import type { OrderEventPayload, SyncEventPayload } from "../event-types";

export function registerAnalyticsHandlers(): void {
  eventBus.on<OrderEventPayload>(
    "ORDER_CREATED",
    async (event) => {
      logger.info("analyticsHandler: tracking ORDER_CREATED", {
        orderId: event.payload.orderId,
        marketplace: event.payload.marketplace,
      });
      // Em produção: incrementar contadores de vendas
    },
    "analytics"
  );

  eventBus.on<SyncEventPayload>(
    "SYNC_COMPLETED",
    async (event) => {
      logger.info("analyticsHandler: tracking SYNC_COMPLETED", {
        marketplace: event.payload.marketplace,
        synced: event.payload.synced,
      });
    },
    "analytics"
  );

  logger.info("analyticsHandler: registered");
}
