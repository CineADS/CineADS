/**
 * Smart Sync — sincronização incremental usando sync_state.
 * Consulta apenas mudanças desde a última sincronização.
 * Reduz drasticamente o volume de chamadas de API.
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { syncEngine } from "./sync-engine";
import { rateLimitManager } from "../rate-limit/rate-limit-manager";
import type { SyncResult, SyncOperation } from "../types/integration-events";

export interface SyncState {
  tenantId: string;
  marketplace: string;
  entity: string;
  lastSyncedAt: string;
  lastCursor?: string;
  metadata?: Record<string, unknown>;
}

async function getSyncState(
  tenantId: string,
  marketplace: string,
  entity: string
): Promise<SyncState | null> {
  const { data, error } = await supabase
    .from("sync_state")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("marketplace", marketplace)
    .eq("entity", entity)
    .maybeSingle();

  if (error) {
    logger.error("smartSync.getSyncState failed", { error });
    return null;
  }
  if (!data) return null;
  return {
    tenantId: (data as any).tenant_id,
    marketplace: (data as any).marketplace,
    entity: (data as any).entity,
    lastSyncedAt: (data as any).last_synced_at,
    lastCursor: (data as any).last_cursor,
    metadata: (data as any).metadata,
  };
}

async function updateSyncState(
  tenantId: string,
  marketplace: string,
  entity: string,
  cursor?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from("sync_state")
    .upsert(
      {
        tenant_id: tenantId,
        marketplace,
        entity,
        last_synced_at: new Date().toISOString(),
        last_cursor: cursor ?? null,
        metadata: metadata ?? {},
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "tenant_id,marketplace,entity" }
    );

  if (error) {
    logger.error("smartSync.updateSyncState failed", { error });
  }
}

export const smartSync = {
  /** Sincronizar pedidos incrementalmente */
  async syncOrdersSince(tenantId: string, marketplace: string): Promise<SyncResult> {
    const state = await getSyncState(tenantId, marketplace, "orders");
    const since = state?.lastSyncedAt;

    logger.info("smartSync.syncOrdersSince", { tenantId, marketplace, since });
    await rateLimitManager.acquireToken(marketplace);

    const result = await syncEngine.syncOrders(tenantId, marketplace);
    if (result.success) {
      await updateSyncState(tenantId, marketplace, "orders");
    }
    return result;
  },

  /** Sincronizar produtos incrementalmente */
  async syncProductsSince(tenantId: string, marketplace: string): Promise<SyncResult> {
    const state = await getSyncState(tenantId, marketplace, "products");
    const since = state?.lastSyncedAt;

    logger.info("smartSync.syncProductsSince", { tenantId, marketplace, since });
    await rateLimitManager.acquireToken(marketplace);

    const result = await syncEngine.syncProducts(tenantId, marketplace);
    if (result.success) {
      await updateSyncState(tenantId, marketplace, "products");
    }
    return result;
  },

  /** Sincronizar estoque incrementalmente */
  async syncStockSince(tenantId: string, marketplace: string): Promise<SyncResult> {
    const state = await getSyncState(tenantId, marketplace, "stock");

    logger.info("smartSync.syncStockSince", { tenantId, marketplace, since: state?.lastSyncedAt });
    await rateLimitManager.acquireToken(marketplace);

    const result = await syncEngine.syncStock(tenantId, marketplace);
    if (result.success) {
      await updateSyncState(tenantId, marketplace, "stock");
    }
    return result;
  },

  /** Sincronizar preços incrementalmente */
  async syncPricesSince(tenantId: string, marketplace: string): Promise<SyncResult> {
    const state = await getSyncState(tenantId, marketplace, "prices");

    logger.info("smartSync.syncPricesSince", { tenantId, marketplace, since: state?.lastSyncedAt });
    await rateLimitManager.acquireToken(marketplace);

    const result = await syncEngine.syncPrices(tenantId, marketplace);
    if (result.success) {
      await updateSyncState(tenantId, marketplace, "prices");
    }
    return result;
  },

  /** Obter estado de sincronização */
  getSyncState,

  /** Obter todos os estados de um tenant */
  async getAllSyncStates(tenantId: string): Promise<SyncState[]> {
    const { data, error } = await supabase
      .from("sync_state")
      .select("*")
      .eq("tenant_id", tenantId);

    if (error) {
      logger.error("smartSync.getAllSyncStates failed", { error });
      return [];
    }
    return (data || []).map((r: any) => ({
      tenantId: r.tenant_id,
      marketplace: r.marketplace,
      entity: r.entity,
      lastSyncedAt: r.last_synced_at,
      lastCursor: r.last_cursor,
      metadata: r.metadata,
    }));
  },

  /** Forçar full sync (resetar estado) */
  async resetSyncState(tenantId: string, marketplace: string, entity?: string): Promise<void> {
    let query = supabase
      .from("sync_state")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("marketplace", marketplace);

    if (entity) query = query.eq("entity", entity);
    await query;

    logger.info("smartSync.resetSyncState", { tenantId, marketplace, entity });
  },
};
