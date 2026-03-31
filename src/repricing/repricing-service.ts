/**
 * Repricing Service — camada de serviço para o Repricing Engine.
 * Integra com Event Bus para reagir a eventos de preço.
 */
import { logger } from "@/lib/logger";
import { eventBus } from "@/events/event-bus";
import { repricingEngine } from "./repricing-engine";
import type { DomainEvent } from "@/events/event-types";

export const repricingService = {
  /** Registrar handler no Event Bus para eventos de preço */
  initialize(): void {
    eventBus.on(
      "PRICE_UPDATED",
      async (event: DomainEvent) => {
        const { productId, competitorPrice, cost, marketplace } = event.payload as any;
        // Só processar eventos de fontes externas (não do próprio repricing)
        if (event.source === "repricing-engine") return;

        if (competitorPrice && productId) {
          await repricingEngine.handlePriceChange(
            event.tenantId,
            productId,
            marketplace || event.marketplace || "all",
            Number(competitorPrice),
            Number(cost) || 0
          );
        }
      },
      "repricing-service"
    );

    logger.info("repricingService initialized");
  },

  /** Desregistrar handlers */
  dispose(): void {
    eventBus.offModule("repricing-service");
  },
};
