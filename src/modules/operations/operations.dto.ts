/**
 * Operations DTOs — tipos para o Seller Operations Center.
 */

export interface OperationsSummaryDTO {
  pendingOrders: number;
  delayedOrders: number;
  lowStockProducts: number;
  integrationErrors: number;
  pausedListings: number;
  activeRepricingRules: number;
  pendingReservations: number;
}

export interface OperationalAlertDTO {
  id: string;
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  marketplace?: string;
  link?: string;
  createdAt: string;
}
