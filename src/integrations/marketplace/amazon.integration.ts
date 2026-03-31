/**
 * Amazon Integration Adapter
 * Implementa MarketplaceAdapter para a API da Amazon SP-API.
 */
import { logger } from "@/lib/logger";
import type {
  MarketplaceAdapter,
  SyncResult,
  StockUpdateItem,
  PriceUpdateItem,
} from "../types/integration-events";

const MARKETPLACE = "Amazon";

function stub(operation: string, start: number, note: string): SyncResult {
  return {
    success: true,
    operation: operation as SyncResult["operation"],
    marketplace: MARKETPLACE,
    synced: 0,
    errors: 0,
    details: { note },
    durationMs: Date.now() - start,
  };
}

export const amazonAdapter: MarketplaceAdapter = {
  marketplace: MARKETPLACE,

  async fetchOrders(tenantId: string): Promise<SyncResult> {
    const start = Date.now();
    logger.info("amazon.fetchOrders", { tenantId });
    return stub("sync_orders", start, "Amazon SP-API integration pending");
  },

  async fetchProducts(tenantId: string): Promise<SyncResult> {
    const start = Date.now();
    logger.info("amazon.fetchProducts", { tenantId });
    return stub("sync_products", start, "Amazon SP-API integration pending");
  },

  async fetchStock(tenantId: string): Promise<SyncResult> {
    const start = Date.now();
    logger.info("amazon.fetchStock", { tenantId });
    return stub("sync_stock", start, "Amazon SP-API integration pending");
  },

  async updateStock(tenantId: string, items: StockUpdateItem[]): Promise<SyncResult> {
    const start = Date.now();
    logger.info("amazon.updateStock", { tenantId, count: items.length });
    return stub("sync_stock", start, "Amazon SP-API integration pending");
  },

  async updatePrice(tenantId: string, items: PriceUpdateItem[]): Promise<SyncResult> {
    const start = Date.now();
    logger.info("amazon.updatePrice", { tenantId, count: items.length });
    return stub("sync_prices", start, "Amazon SP-API integration pending");
  },

  async refreshAccessToken(tenantId: string): Promise<boolean> {
    logger.info("amazon.refreshAccessToken", { tenantId });
    return false;
  },
};
