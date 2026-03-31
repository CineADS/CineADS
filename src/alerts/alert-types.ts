/**
 * Alert Types — tipos de alertas do sistema.
 */

export type AlertSeverity = "critical" | "warning" | "info";

export type AlertType =
  | "LOW_STOCK"
  | "STOCK_OUT"
  | "SYNC_FAILED"
  | "ORDER_DELAYED"
  | "API_LIMIT_REACHED"
  | "LISTING_PAUSED"
  | "REPRICING_BLOCKED"
  | "RESERVATION_EXPIRED"
  | "INTEGRATION_ERROR";

export interface Alert {
  id: string;
  tenantId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  marketplace?: string;
  productId?: string;
  metadata?: Record<string, unknown>;
  resolved: boolean;
  createdAt: Date;
}

export const ALERT_CONFIG: Record<AlertType, { severity: AlertSeverity; titleTemplate: string }> = {
  LOW_STOCK: { severity: "warning", titleTemplate: "Estoque baixo" },
  STOCK_OUT: { severity: "critical", titleTemplate: "Estoque zerado" },
  SYNC_FAILED: { severity: "critical", titleTemplate: "Falha na sincronização" },
  ORDER_DELAYED: { severity: "warning", titleTemplate: "Pedido atrasado" },
  API_LIMIT_REACHED: { severity: "warning", titleTemplate: "Limite de API atingido" },
  LISTING_PAUSED: { severity: "info", titleTemplate: "Anúncio pausado" },
  REPRICING_BLOCKED: { severity: "warning", titleTemplate: "Repricing bloqueado" },
  RESERVATION_EXPIRED: { severity: "info", titleTemplate: "Reserva expirada" },
  INTEGRATION_ERROR: { severity: "critical", titleTemplate: "Erro de integração" },
};
