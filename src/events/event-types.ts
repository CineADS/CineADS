/**
 * Event Types — tipos centrais do Event Bus interno.
 * Permite comunicação desacoplada entre módulos (orders, inventory, automation, analytics).
 */

export type DomainEventType =
  | "ORDER_CREATED"
  | "ORDER_UPDATED"
  | "ORDER_CANCELLED"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"
  | "PRODUCT_CREATED"
  | "PRODUCT_UPDATED"
  | "PRODUCT_DELETED"
  | "STOCK_UPDATED"
  | "STOCK_LOW"
  | "STOCK_OUT"
  | "PRICE_UPDATED"
  | "LISTING_CREATED"
  | "LISTING_UPDATED"
  | "LISTING_PAUSED"
  | "LISTING_ACTIVATED"
  | "LISTING_FAILED"
  | "INTEGRATION_ERROR"
  | "SYNC_COMPLETED"
  | "SYNC_FAILED"
  | "AUTOMATION_TRIGGERED"
  | "AUTOMATION_EXECUTED"
  | "CATEGORY_SYNC_STARTED"
  | "CATEGORY_SYNC_COMPLETED"
  | "CATEGORY_MAPPING_CREATED"
  | "CATALOG_SYNC_STARTED"
  | "CATALOG_SYNC_COMPLETED"
  | "CATALOG_REPAIR_TRIGGERED"
  | "CATALOG_REPAIR_COMPLETED";

export interface DomainEvent<T = Record<string, unknown>> {
  id: string;
  type: DomainEventType;
  tenantId: string;
  payload: T;
  marketplace?: string;
  source: string;
  createdAt: Date;
}

export type EventHandler<T = Record<string, unknown>> = (event: DomainEvent<T>) => Promise<void>;

// ─── Payloads tipados ─────────────────────────────────────
export interface OrderEventPayload {
  orderId: string;
  orderNumber?: string;
  marketplace?: string;
  status?: string;
  total?: number;
}

export interface StockEventPayload {
  productId: string;
  variantId?: string;
  sku?: string;
  previousQuantity?: number;
  newQuantity?: number;
  warehouseId?: string;
}

export interface PriceEventPayload {
  productId: string;
  variantId?: string;
  previousPrice?: number;
  newPrice?: number;
  marketplace?: string;
}

export interface ListingEventPayload {
  listingId: string;
  productId: string;
  marketplace: string;
  reason?: string;
}

export interface SyncEventPayload {
  jobId?: string;
  marketplace: string;
  operation: string;
  synced?: number;
  errors?: number;
  durationMs?: number;
}
