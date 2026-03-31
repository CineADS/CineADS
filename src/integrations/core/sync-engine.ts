/**
 * Sync Engine — orquestra sincronizações entre ERP e marketplaces.
 * Utiliza adapters de marketplace (padrão Strategy) e registra logs.
 * Preparado para múltiplos marketplaces sem modificação.
 */
import { logger } from "@/lib/logger";
import { supabase } from "@/integrations/supabase/client";
import { retryEngine } from "./retry-engine";
import type {
  MarketplaceAdapter,
  SyncOperation,
  SyncResult,
  StockUpdateItem,
  PriceUpdateItem,
} from "../types/integration-events";

/** Registry de adapters por marketplace */
const adapters = new Map<string, MarketplaceAdapter>();

async function logResult(tenantId: string, result: SyncResult): Promise<void> {
  try {
    await supabase.from("integration_logs").insert([{
      tenant_id: tenantId,
      marketplace: result.marketplace,
      type: result.success ? "success" : "error",
      message: `${result.operation}: ${result.synced} sincronizado(s) em ${result.durationMs}ms`,
      details: JSON.parse(JSON.stringify(result.details ?? {})),
    }]);
  } catch (err) {
    logger.error("syncEngine.logResult failed", { err });
  }
}

function getAdapter(marketplace: string): MarketplaceAdapter {
  const adapter = adapters.get(marketplace);
  if (!adapter) throw new Error(`No adapter registered for marketplace: ${marketplace}`);
  return adapter;
}

async function runWithRetry(
  tenantId: string,
  marketplace: string,
  operation: SyncOperation,
  fn: () => Promise<SyncResult>
): Promise<SyncResult> {
  const start = Date.now();
  try {
    const result = await fn();
    await logResult(tenantId, result);
    if (!result.success) {
      const job = retryEngine.registerFailedSync({
        tenantId,
        marketplace,
        operation,
        error: JSON.stringify(result.details),
      });
      retryEngine.scheduleRetry(job.id, async () => {
        await fn();
      });
    }
    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error(`syncEngine.${operation} failed`, { marketplace, error: errorMsg });
    const failResult: SyncResult = {
      success: false,
      operation,
      marketplace,
      synced: 0,
      errors: 1,
      details: { error: errorMsg },
      durationMs: Date.now() - start,
    };
    await logResult(tenantId, failResult);
    retryEngine.registerFailedSync({ tenantId, marketplace, operation, error: errorMsg });
    return failResult;
  }
}

export const syncEngine = {
  /** Registrar adapter de marketplace */
  registerAdapter(adapter: MarketplaceAdapter): void {
    adapters.set(adapter.marketplace, adapter);
    logger.info("syncEngine.registerAdapter", { marketplace: adapter.marketplace });
  },

  /** Listar marketplaces registrados */
  getRegisteredMarketplaces(): string[] {
    return Array.from(adapters.keys());
  },

  /** Sincronizar pedidos de um marketplace */
  async syncOrders(tenantId: string, marketplace: string): Promise<SyncResult> {
    logger.info("syncEngine.syncOrders", { tenantId, marketplace });
    const adapter = getAdapter(marketplace);
    return runWithRetry(tenantId, marketplace, "sync_orders", () => adapter.fetchOrders(tenantId));
  },

  /** Sincronizar produtos (quando suportado) */
  async syncProducts(tenantId: string, marketplace: string): Promise<SyncResult> {
    logger.info("syncEngine.syncProducts", { tenantId, marketplace });
    const adapter = getAdapter(marketplace);
    if (!adapter.fetchProducts) {
      return { success: true, operation: "sync_products", marketplace, synced: 0, errors: 0, durationMs: 0, details: { note: "Not supported" } };
    }
    return runWithRetry(tenantId, marketplace, "sync_products", () => adapter.fetchProducts!(tenantId));
  },

  /** Sincronizar estoque */
  async syncStock(tenantId: string, marketplace: string, items?: StockUpdateItem[]): Promise<SyncResult> {
    logger.info("syncEngine.syncStock", { tenantId, marketplace });
    const adapter = getAdapter(marketplace);
    if (items && adapter.updateStock) {
      return runWithRetry(tenantId, marketplace, "sync_stock", () => adapter.updateStock!(tenantId, items));
    }
    if (adapter.fetchStock) {
      return runWithRetry(tenantId, marketplace, "sync_stock", () => adapter.fetchStock!(tenantId));
    }
    return { success: true, operation: "sync_stock", marketplace, synced: 0, errors: 0, durationMs: 0 };
  },

  /** Sincronizar preços */
  async syncPrices(tenantId: string, marketplace: string, items?: PriceUpdateItem[]): Promise<SyncResult> {
    logger.info("syncEngine.syncPrices", { tenantId, marketplace });
    const adapter = getAdapter(marketplace);
    if (items && adapter.updatePrice) {
      return runWithRetry(tenantId, marketplace, "sync_prices", () => adapter.updatePrice!(tenantId, items));
    }
    return { success: true, operation: "sync_prices", marketplace, synced: 0, errors: 0, durationMs: 0 };
  },

  /** Sincronizar tudo de um marketplace */
  async syncAll(tenantId: string, marketplace: string): Promise<SyncResult[]> {
    logger.info("syncEngine.syncAll", { tenantId, marketplace });
    const results: SyncResult[] = [];
    results.push(await this.syncOrders(tenantId, marketplace));
    results.push(await this.syncProducts(tenantId, marketplace));
    results.push(await this.syncStock(tenantId, marketplace));
    return results;
  },

  /** Renovar token de um marketplace */
  async refreshToken(tenantId: string, marketplace: string): Promise<boolean> {
    const adapter = getAdapter(marketplace);
    if (!adapter.refreshAccessToken) return false;
    return adapter.refreshAccessToken(tenantId);
  },
};
