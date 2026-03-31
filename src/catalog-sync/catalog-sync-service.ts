/**
 * Catalog Sync Service
 * Public API for catalog reconciliation.
 */
import { logger } from "@/lib/logger";
import { cacheService } from "@/cache/cache.service";
import { CacheTTL } from "@/cache/cache-keys";
import { catalogSyncEngine } from "./catalog-sync-engine";
import { computeCatalogDiff, type CatalogDiffResult, type ErpProductData, type MarketplaceListingData } from "./catalog-diff";
import { supabase } from "@/integrations/supabase/client";

const LISTING_STATE_KEY = (t: string, p: string, m: string) => `listing-state:${t}:${p}:${m}`;

export const catalogSyncService = {
  /** Check consistency for a single product+marketplace */
  async checkProductConsistency(tenantId: string, productId: string, marketplace: string): Promise<CatalogDiffResult> {
    const cached = cacheService.get<CatalogDiffResult>(LISTING_STATE_KEY(tenantId, productId, marketplace));
    if (cached) return cached;

    const result = await catalogSyncEngine.syncListing(tenantId, productId, marketplace);
    return result.diff;
  },

  /** Repair a single product listing */
  async repairProductListing(tenantId: string, productId: string, marketplace: string) {
    return catalogSyncEngine.syncListing(tenantId, productId, marketplace);
  },

  /** Sync all listings for a tenant on a marketplace */
  async syncTenantCatalog(tenantId: string, marketplace: string) {
    return catalogSyncEngine.syncMarketplaceCatalog(tenantId, marketplace);
  },
};
