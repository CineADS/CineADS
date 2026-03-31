/**
 * Integration Events — tipos e interfaces para eventos de marketplace.
 * Usado por Sync Engine, Webhook Manager e Retry Engine.
 */

export type IntegrationEventType =
  | "ORDER_CREATED"
  | "ORDER_UPDATED"
  | "ORDER_CANCELLED"
  | "SHIPMENT_UPDATED"
  | "PRODUCT_CREATED"
  | "PRODUCT_UPDATED"
  | "STOCK_UPDATED"
  | "PRICE_UPDATED"
  | "INTEGRATION_ERROR"
  | "TOKEN_REFRESHED";

export type SyncOperation =
  | "sync_orders"
  | "sync_products"
  | "sync_stock"
  | "sync_prices";

export type SyncStatus = "pending" | "running" | "success" | "error" | "retrying";

export interface IntegrationEvent {
  type: IntegrationEventType;
  payload: Record<string, unknown>;
  marketplace: string;
  tenantId: string;
  createdAt: Date;
}

export interface SyncJob {
  id: string;
  tenantId: string;
  marketplace: string;
  operation: SyncOperation;
  status: SyncStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  payload?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncResult {
  success: boolean;
  operation: SyncOperation;
  marketplace: string;
  synced: number;
  errors: number;
  details?: Record<string, unknown>;
  durationMs: number;
}

/** Contrato que cada adapter de marketplace deve implementar */
export interface MarketplaceAdapter {
  readonly marketplace: string;

  fetchOrders(tenantId: string): Promise<SyncResult>;
  fetchProducts?(tenantId: string): Promise<SyncResult>;
  fetchStock?(tenantId: string): Promise<SyncResult>;
  updateStock?(tenantId: string, items: StockUpdateItem[]): Promise<SyncResult>;
  updatePrice?(tenantId: string, items: PriceUpdateItem[]): Promise<SyncResult>;
  refreshAccessToken?(tenantId: string): Promise<boolean>;
}

export interface StockUpdateItem {
  listingId: string;
  quantity: number;
}

export interface PriceUpdateItem {
  listingId: string;
  price: number;
}
