/**
 * Alert Engine — gera alertas baseados em eventos do Event Bus.
 * Persiste alertas como notificações no banco para o seller.
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { eventBus } from "@/events/event-bus";
import { ALERT_CONFIG, type AlertType } from "./alert-types";
import type { DomainEvent } from "@/events/event-types";

const EVENT_TO_ALERT: Record<string, AlertType> = {
  STOCK_LOW: "LOW_STOCK",
  STOCK_OUT: "STOCK_OUT",
  SYNC_FAILED: "SYNC_FAILED",
  INTEGRATION_ERROR: "INTEGRATION_ERROR",
  LISTING_PAUSED: "LISTING_PAUSED",
};

async function createAlert(
  tenantId: string,
  alertType: AlertType,
  message: string,
  marketplace?: string
): Promise<void> {
  const config = ALERT_CONFIG[alertType];

  try {
    await supabase.from("notifications").insert([{
      tenant_id: tenantId,
      type: config.severity,
      title: config.titleTemplate,
      message,
      link: marketplace ? `/integrations` : undefined,
    }]);
    logger.info("alertEngine: alert created", { tenantId, alertType });
  } catch (err) {
    logger.error("alertEngine: failed to create alert", { err, alertType });
  }
}

export const alertEngine = {
  /** Registrar handlers no Event Bus */
  initialize(): void {
    for (const [eventType, alertType] of Object.entries(EVENT_TO_ALERT)) {
      eventBus.on(
        eventType as any,
        async (event: DomainEvent) => {
          const payload = event.payload as any;
          const message = payload.message || payload.reason || `${alertType} em ${event.marketplace || "sistema"}`;
          await createAlert(event.tenantId, alertType, message, event.marketplace);
        },
        "alert-engine"
      );
    }

    logger.info("alertEngine initialized", { events: Object.keys(EVENT_TO_ALERT) });
  },

  /** Gerar alerta manualmente */
  async emit(
    tenantId: string,
    alertType: AlertType,
    message: string,
    marketplace?: string
  ): Promise<void> {
    await createAlert(tenantId, alertType, message, marketplace);
  },

  /** Desregistrar handlers */
  dispose(): void {
    eventBus.offModule("alert-engine");
  },
};
