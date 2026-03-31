/**
 * Inventory Event Handler
 * Escuta eventos ORDER_CREATED para decrementar estoque automaticamente.
 */
import { eventBus } from "../event-bus";
import { logger } from "@/lib/logger";
import type { OrderEventPayload, StockEventPayload } from "../event-types";

export function registerInventoryHandlers(): void {
  eventBus.on<OrderEventPayload>(
    "ORDER_CREATED",
    async (event) => {
      logger.info("inventoryHandler: ORDER_CREATED received", {
        orderId: event.payload.orderId,
        tenantId: event.tenantId,
      });
      // Em produção: decrementar estoque via inventoryService
      // Aqui apenas registra que o evento foi recebido
    },
    "inventory"
  );

  eventBus.on<StockEventPayload>(
    "STOCK_LOW",
    async (event) => {
      logger.warn("inventoryHandler: STOCK_LOW detected", {
        productId: event.payload.productId,
        quantity: event.payload.newQuantity,
        tenantId: event.tenantId,
      });
      // Em produção: disparar alerta ou pausar listing
    },
    "inventory"
  );

  logger.info("inventoryHandler: registered");
}
