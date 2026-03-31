/**
 * Listing Queue
 * Enqueues listing jobs into the existing job queue system.
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export type ListingJobType =
  | "CREATE_LISTING"
  | "UPDATE_PRICE"
  | "UPDATE_STOCK"
  | "PAUSE_LISTING"
  | "RESUME_LISTING";

interface ListingJobPayload {
  tenantId: string;
  productId: string;
  marketplace: string;
  listingId?: string;
  price?: number;
  stock?: number;
}

export async function enqueueListingJob(
  type: ListingJobType,
  payload: ListingJobPayload,
  priority: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM"
): Promise<string> {
  logger.info("enqueueListingJob", { type, productId: payload.productId, marketplace: payload.marketplace });

  const { data, error } = await supabase
    .from("sync_jobs")
    .insert({
      tenant_id: payload.tenantId,
      type,
      marketplace: payload.marketplace,
      payload: payload as any,
      priority,
      status: "PENDING",
    })
    .select("id")
    .single();

  if (error) {
    logger.error("enqueueListingJob failed", { error });
    throw error;
  }

  return data.id;
}

export async function enqueueBulkListingJobs(
  tenantId: string,
  productIds: string[],
  marketplace: string
): Promise<number> {
  const rows = productIds.map((productId) => ({
    tenant_id: tenantId,
    type: "CREATE_LISTING" as const,
    marketplace,
    payload: { tenantId, productId, marketplace } as any,
    priority: "LOW" as const,
    status: "PENDING" as const,
  }));

  const { error } = await supabase.from("sync_jobs").insert(rows);
  if (error) {
    logger.error("enqueueBulkListingJobs failed", { error });
    throw error;
  }

  return rows.length;
}
