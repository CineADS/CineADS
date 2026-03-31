/**
 * Mercado Livre Orders Service
 * Handles order import from ML API and maps to internal ERP format.
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { eventBus } from "@/events/event-bus";

export interface MlOrderImportResult {
  imported: number;
  updated: number;
  errors: number;
  details?: Record<string, unknown>;
}

/**
 * Trigger order sync via edge function
 */
export async function syncMlOrders(tenantId: string): Promise<MlOrderImportResult> {
  logger.info("ml-orders: triggering sync", { tenantId });
  try {
    const { data, error } = await supabase.functions.invoke("ml-sync-orders", {
      body: { tenantId },
    });
    if (error) throw error;

    const result: MlOrderImportResult = {
      imported: data?.synced ?? 0,
      updated: data?.updated ?? 0,
      errors: data?.errors ?? 0,
      details: data,
    };

    if (result.imported > 0) {
      await eventBus.emit(
        "ORDER_CREATED",
        tenantId,
        { source: "mercado_livre", count: result.imported },
        "ml-orders-service",
        "Mercado Livre"
      );
    }

    return result;
  } catch (err) {
    logger.error("ml-orders: sync failed", { err });
    return { imported: 0, updated: 0, errors: 1, details: { error: String(err) } };
  }
}

/**
 * Get ML integration diagnostic status
 */
export async function getMlStatus(): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await supabase.functions.invoke("ml-status");
    if (error) throw error;
    return data;
  } catch (err) {
    logger.error("ml-orders: status check failed", { err });
    return null;
  }
}

/**
 * Execute a listing operation on ML
 */
export async function mlListingOperation(
  tenantId: string,
  action: "CREATE_LISTING" | "UPDATE_PRICE" | "UPDATE_STOCK" | "PAUSE_LISTING" | "RESUME_LISTING",
  payload: Record<string, unknown>
) {
  try {
    const { data, error } = await supabase.functions.invoke("ml-listing-ops", {
      body: { tenantId, action, payload },
    });
    if (error) throw error;
    return data;
  } catch (err) {
    logger.error("ml-listing-ops failed", { action, err });
    throw err;
  }
}
