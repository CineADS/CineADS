/**
 * Catalog Sync Engine
 * Orchestrates catalog comparison and repair between ERP and marketplace listings.
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { eventBus } from "@/events/event-bus";
import { cacheService } from "@/cache/cache.service";
import { CacheTTL } from "@/cache/cache-keys";
import { computeCatalogDiff, type ErpProductData, type MarketplaceListingData, type CatalogDiffResult } from "./catalog-diff";
import { repairListing, type RepairResult } from "./catalog-repair";

const LISTING_STATE_KEY = (t: string, p: string, m: string) => `listing-state:${t}:${p}:${m}`;

async function getErpData(tenantId: string, productId: string): Promise<ErpProductData | null> {
  const { data: product } = await supabase
    .from("products")
    .select("id, title, status, category_id")
    .eq("id", productId)
    .eq("tenant_id", tenantId)
    .single();

  if (!product) return null;

  const { data: variants } = await supabase
    .from("product_variants")
    .select("price, stock")
    .eq("product_id", productId);

  const price = variants?.reduce((max, v) => Math.max(max, v.price ?? 0), 0) ?? 0;
  const stock = variants?.reduce((sum, v) => sum + (v.stock ?? 0), 0) ?? 0;

  return {
    productId: product.id,
    title: product.title ?? "",
    price,
    stock,
    status: product.status,
    categoryId: product.category_id,
  };
}

function listingToMarketplaceData(listing: any): MarketplaceListingData {
  return {
    price: listing.price ?? 0,
    stock: listing.stock ?? 0,
    status: listing.status ?? "inactive",
  };
}

export const catalogSyncEngine = {
  /** Compare a single listing with ERP data */
  async syncListing(
    tenantId: string,
    productId: string,
    marketplace: string
  ): Promise<{ diff: CatalogDiffResult; repair?: RepairResult }> {
    const erp = await getErpData(tenantId, productId);
    if (!erp) throw new Error("Product not found");

    const { data: listing } = await supabase
      .from("marketplace_listings")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("product_id", productId)
      .eq("marketplace", marketplace)
      .maybeSingle();

    if (!listing) throw new Error("Listing not found");

    const diff = computeCatalogDiff(erp, listingToMarketplaceData(listing), marketplace);

    // Cache state
    cacheService.set(LISTING_STATE_KEY(tenantId, productId, marketplace), diff, CacheTTL.STANDARD);

    if (diff.hasDiff) {
      const repair = await repairListing(tenantId, diff, erp.price, erp.stock, erp.status);
      return { diff, repair };
    }

    return { diff };
  },

  /** Sync all listings for a product across all marketplaces */
  async syncProductListings(tenantId: string, productId: string) {
    const { data: listings } = await supabase
      .from("marketplace_listings")
      .select("marketplace")
      .eq("tenant_id", tenantId)
      .eq("product_id", productId);

    if (!listings?.length) return [];

    const results = [];
    for (const l of listings) {
      if (!l.marketplace) continue;
      try {
        const result = await this.syncListing(tenantId, productId, l.marketplace);
        results.push(result);
      } catch (err) {
        logger.error("catalogSyncEngine.syncProductListings error", { productId, marketplace: l.marketplace, err });
      }
    }
    return results;
  },

  /** Bulk sync entire marketplace catalog for a tenant */
  async syncMarketplaceCatalog(tenantId: string, marketplace: string) {
    logger.info("catalogSyncEngine.syncMarketplaceCatalog", { tenantId, marketplace });

    await eventBus.emit(
      "CATALOG_SYNC_STARTED",
      tenantId,
      { marketplace },
      "catalog-sync-engine",
      marketplace
    );

    const { data: listings } = await supabase
      .from("marketplace_listings")
      .select("product_id")
      .eq("tenant_id", tenantId)
      .eq("marketplace", marketplace)
      .neq("status", "inactive");

    if (!listings?.length) {
      await eventBus.emit("CATALOG_SYNC_COMPLETED", tenantId, { marketplace, total: 0, repaired: 0 }, "catalog-sync-engine", marketplace);
      return { total: 0, withDiff: 0, repaired: 0 };
    }

    let withDiff = 0;
    let repaired = 0;

    for (const l of listings) {
      try {
        const result = await this.syncListing(tenantId, l.product_id, marketplace);
        if (result.diff.hasDiff) {
          withDiff++;
          if (result.repair) repaired++;
        }
      } catch (err) {
        logger.error("catalogSyncEngine.syncMarketplaceCatalog item error", { productId: l.product_id, err });
      }
    }

    await eventBus.emit(
      "CATALOG_SYNC_COMPLETED",
      tenantId,
      { marketplace, total: listings.length, withDiff, repaired },
      "catalog-sync-engine",
      marketplace
    );

    return { total: listings.length, withDiff, repaired };
  },
};
