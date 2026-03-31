/**
 * Mercado Livre Integration Adapter
 * Full implementation with listing operations via edge functions.
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import type {
  MarketplaceAdapter,
  SyncResult,
  StockUpdateItem,
  PriceUpdateItem,
} from "../types/integration-events";

const MARKETPLACE = "Mercado Livre";

function buildResult(
  operation: string,
  success: boolean,
  synced: number,
  startMs: number,
  details?: Record<string, unknown>
): SyncResult {
  return {
    success,
    operation: operation as SyncResult["operation"],
    marketplace: MARKETPLACE,
    synced,
    errors: success ? 0 : 1,
    details,
    durationMs: Date.now() - startMs,
  };
}

async function invokeListingOps(tenantId: string, action: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("ml-listing-ops", {
    body: { tenantId, action, payload },
  });
  if (error) throw error;
  return data;
}

export const mercadoLivreAdapter: MarketplaceAdapter = {
  marketplace: MARKETPLACE,

  async fetchOrders(tenantId: string): Promise<SyncResult> {
    const start = Date.now();
    logger.info("ml.fetchOrders", { tenantId });
    try {
      const { data, error } = await supabase.functions.invoke("ml-sync-orders", {
        body: { tenantId },
      });
      if (error) throw error;
      return buildResult("sync_orders", true, data?.synced ?? 0, start, data);
    } catch (err) {
      logger.error("ml.fetchOrders failed", { err });
      return buildResult("sync_orders", false, 0, start, { error: String(err) });
    }
  },

  async fetchStock(tenantId: string): Promise<SyncResult> {
    const start = Date.now();
    return buildResult("sync_stock", true, 0, start, { note: "ML stock is push-based" });
  },

  async updateStock(tenantId: string, items: StockUpdateItem[]): Promise<SyncResult> {
    const start = Date.now();
    logger.info("ml.updateStock", { tenantId, count: items.length });
    let synced = 0;
    let errors = 0;
    for (const item of items) {
      try {
        await invokeListingOps(tenantId, "UPDATE_STOCK", {
          listingId: item.listingId,
          quantity: item.quantity,
        });
        synced++;
      } catch {
        errors++;
      }
    }
    return buildResult("sync_stock", errors === 0, synced, start, { errors });
  },

  async updatePrice(tenantId: string, items: PriceUpdateItem[]): Promise<SyncResult> {
    const start = Date.now();
    logger.info("ml.updatePrice", { tenantId, count: items.length });
    let synced = 0;
    let errors = 0;
    for (const item of items) {
      try {
        await invokeListingOps(tenantId, "UPDATE_PRICE", {
          listingId: item.listingId,
          price: item.price,
        });
        synced++;
      } catch {
        errors++;
      }
    }
    return buildResult("sync_prices", errors === 0, synced, start, { errors });
  },

  async refreshAccessToken(tenantId: string): Promise<boolean> {
    logger.info("ml.refreshAccessToken", { tenantId });
    try {
      const { error } = await supabase.functions.invoke("ml-refresh-token", {
        body: { tenantId },
      });
      if (error) throw error;
      return true;
    } catch (err) {
      logger.error("ml.refreshAccessToken failed", { err });
      return false;
    }
  },
};

// ─── Extended listing operations ─────────────────────────────
export async function mlCreateListing(tenantId: string, productId: string, item: Record<string, unknown>) {
  return invokeListingOps(tenantId, "CREATE_LISTING", { productId, item });
}

export async function mlPauseListing(tenantId: string, listingId: string) {
  return invokeListingOps(tenantId, "PAUSE_LISTING", { listingId });
}

export async function mlResumeListing(tenantId: string, listingId: string) {
  return invokeListingOps(tenantId, "RESUME_LISTING", { listingId });
}
