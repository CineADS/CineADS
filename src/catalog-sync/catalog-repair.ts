/**
 * Catalog Repair
 * Repairs inconsistencies detected by catalog-diff using the listing queue.
 */
import { logger } from "@/lib/logger";
import { enqueueListingJob } from "@/listings/listing-queue";
import { eventBus } from "@/events/event-bus";
import type { CatalogDiffResult } from "./catalog-diff";

export type RepairAction = "UPDATE_PRICE" | "UPDATE_STOCK" | "RESUME_LISTING" | "PAUSE_LISTING";

export interface RepairResult {
  productId: string;
  marketplace: string;
  actions: RepairAction[];
  jobIds: string[];
}

export async function repairListing(
  tenantId: string,
  diff: CatalogDiffResult,
  erpPrice: number,
  erpStock: number,
  erpStatus: string
): Promise<RepairResult> {
  const actions: RepairAction[] = [];
  const jobIds: string[] = [];

  await eventBus.emit(
    "CATALOG_REPAIR_TRIGGERED",
    tenantId,
    { productId: diff.productId, marketplace: diff.marketplace, fields: diff.fields.map((f) => f.field) },
    "catalog-repair",
    diff.marketplace
  );

  for (const f of diff.fields) {
    try {
      if (f.field === "price") {
        const jobId = await enqueueListingJob("UPDATE_PRICE", {
          tenantId, productId: diff.productId, marketplace: diff.marketplace, price: erpPrice,
        }, "HIGH");
        actions.push("UPDATE_PRICE");
        jobIds.push(jobId);
      }

      if (f.field === "stock") {
        const jobId = await enqueueListingJob("UPDATE_STOCK", {
          tenantId, productId: diff.productId, marketplace: diff.marketplace, stock: erpStock,
        }, "HIGH");
        actions.push("UPDATE_STOCK");
        jobIds.push(jobId);
      }

      if (f.field === "status") {
        if (erpStatus === "active") {
          const jobId = await enqueueListingJob("RESUME_LISTING", {
            tenantId, productId: diff.productId, marketplace: diff.marketplace,
          });
          actions.push("RESUME_LISTING");
          jobIds.push(jobId);
        } else {
          const jobId = await enqueueListingJob("PAUSE_LISTING", {
            tenantId, productId: diff.productId, marketplace: diff.marketplace,
          });
          actions.push("PAUSE_LISTING");
          jobIds.push(jobId);
        }
      }
    } catch (err) {
      logger.error("catalog-repair: failed to enqueue", { field: f.field, err });
    }
  }

  await eventBus.emit(
    "CATALOG_REPAIR_COMPLETED",
    tenantId,
    { productId: diff.productId, marketplace: diff.marketplace, actions },
    "catalog-repair",
    diff.marketplace
  );

  return { productId: diff.productId, marketplace: diff.marketplace, actions, jobIds };
}
