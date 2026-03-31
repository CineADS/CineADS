/**
 * Listing Service
 * Public API for listing operations. Manages marketplace_listings table.
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { cacheService } from "@/cache/cache.service";
import { CacheTTL } from "@/cache/cache-keys";
import { listingEngine } from "./listing-engine";
import { enqueueBulkListingJobs } from "./listing-queue";
import { validateForListing } from "./listing-validator";

export interface ListingDTO {
  id: string;
  tenantId: string;
  productId: string;
  marketplace: string;
  externalListingId: string | null;
  status: string;
  price: number;
  stock: number;
  url: string | null;
  createdAt: string;
  updatedAt: string;
}

const CACHE_KEY = (t: string, p: string, m: string) => `listing:${t}:${p}:${m}`;

export const listingService = {
  /** Publish a single product to a marketplace */
  async publishProduct(tenantId: string, productId: string, marketplace: string) {
    return listingEngine.createListing(tenantId, productId, marketplace);
  },

  /** Update listing price */
  async updateListingPrice(tenantId: string, productId: string, marketplace: string, price: number) {
    return listingEngine.updatePrice(tenantId, productId, marketplace, price);
  },

  /** Update listing stock */
  async updateListingStock(tenantId: string, productId: string, marketplace: string, stock: number) {
    return listingEngine.updateStock(tenantId, productId, marketplace, stock);
  },

  /** Pause listing */
  async pauseListing(tenantId: string, productId: string, marketplace: string, reason?: string) {
    return listingEngine.pauseListing(tenantId, productId, marketplace, reason);
  },

  /** Resume listing */
  async resumeListing(tenantId: string, productId: string, marketplace: string) {
    return listingEngine.resumeListing(tenantId, productId, marketplace);
  },

  /** Get listing for a product+marketplace (cached) */
  async getListing(tenantId: string, productId: string, marketplace: string): Promise<ListingDTO | null> {
    const cacheKey = CACHE_KEY(tenantId, productId, marketplace);
    const cached = cacheService.get<ListingDTO>(cacheKey);
    if (cached) return cached;

    const { data, error } = await supabase
      .from("marketplace_listings")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("product_id", productId)
      .eq("marketplace", marketplace)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const dto = mapToDTO(data);
    cacheService.set(cacheKey, dto, CacheTTL.STANDARD);
    return dto;
  },

  /** List all listings for a tenant */
  async listListings(tenantId: string, marketplace?: string): Promise<ListingDTO[]> {
    let query = supabase
      .from("marketplace_listings")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false });

    if (marketplace) query = query.eq("marketplace", marketplace);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapToDTO);
  },

  /** Bulk publish entire catalog to a marketplace */
  async publishCatalog(
    tenantId: string,
    marketplace: string
  ): Promise<{ total: number; queued: number; skipped: number }> {
    logger.info("listingService.publishCatalog", { tenantId, marketplace });

    const { data: products } = await supabase
      .from("products")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("status", "active");

    if (!products?.length) return { total: 0, queued: 0, skipped: 0 };

    // Filter to products that pass validation
    const validProductIds: string[] = [];
    for (const p of products) {
      const v = await validateForListing(tenantId, p.id, marketplace);
      if (v.valid) validProductIds.push(p.id);
    }

    if (validProductIds.length > 0) {
      await enqueueBulkListingJobs(tenantId, validProductIds, marketplace);
    }

    return {
      total: products.length,
      queued: validProductIds.length,
      skipped: products.length - validProductIds.length,
    };
  },
};

function mapToDTO(row: any): ListingDTO {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    productId: row.product_id,
    marketplace: row.marketplace,
    externalListingId: row.listing_id,
    status: row.status,
    price: row.price ?? 0,
    stock: row.stock ?? 0,
    url: row.url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
