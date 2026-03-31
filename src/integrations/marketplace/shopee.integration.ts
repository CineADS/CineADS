/**
 * Shopee Integration Adapter
 * Implementa MarketplaceAdapter para a API da Shopee.
 */
import { logger } from "@/lib/logger";
import type {
  MarketplaceAdapter,
  SyncResult,
  StockUpdateItem,
  PriceUpdateItem,
} from "../types/integration-events";

const MARKETPLACE = "Shopee";

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

export const shopeeAdapter: MarketplaceAdapter = {
  marketplace: MARKETPLACE,

  async fetchOrders(tenantId: string): Promise<SyncResult> {
    const start = Date.now();
    logger.info("shopee.fetchOrders", { tenantId });
    // TODO: implementar integração real com Shopee Open Platform
    return stub("sync_orders", start, "Shopee integration pending");
  },

  async fetchProducts(tenantId: string): Promise<SyncResult> {
    const start = Date.now();
    logger.info("shopee.fetchProducts", { tenantId });
    return stub("sync_products", start, "Shopee integration pending");
  },

  async fetchStock(tenantId: string): Promise<SyncResult> {
    const start = Date.now();
    logger.info("shopee.fetchStock", { tenantId });
    return stub("sync_stock", start, "Shopee integration pending");
  },

  async updateStock(tenantId: string, items: StockUpdateItem[]): Promise<SyncResult> {
    const start = Date.now();
    logger.info("shopee.updateStock", { tenantId, count: items.length });
    return stub("sync_stock", start, "Shopee integration pending");
  },

  async updatePrice(tenantId: string, items: PriceUpdateItem[]): Promise<SyncResult> {
    const start = Date.now();
    logger.info("shopee.updatePrice", { tenantId, count: items.length });
    return stub("sync_prices", start, "Shopee integration pending");
  },

  async refreshAccessToken(tenantId: string): Promise<boolean> {
    logger.info("shopee.refreshAccessToken", { tenantId });
    return false;
  },
};
