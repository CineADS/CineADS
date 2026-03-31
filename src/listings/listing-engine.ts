/**
 * Listing Engine
 * Orchestrates listing creation, updates, and lifecycle across marketplaces.
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { eventBus } from "@/events/event-bus";
import { cacheService } from "@/cache/cache.service";
import { CacheTTL } from "@/cache/cache-keys";
import { validateForListing } from "./listing-validator";
import { enqueueListingJob } from "./listing-queue";

const LISTING_CACHE_KEY = (tenantId: string, productId: string, marketplace: string) =>
  `listing:${tenantId}:${productId}:${marketplace}`;

export const listingEngine = {
  /** Create a new listing — validates then enqueues */
  async createListing(
    tenantId: string,
    productId: string,
    marketplace: string
  ): Promise<{ queued: boolean; jobId?: string; errors?: string[] }> {
    logger.info("listingEngine.createListing", { tenantId, productId, marketplace });

    const validation = await validateForListing(tenantId, productId, marketplace);
    if (!validation.valid) {
      await eventBus.emit(
        "LISTING_FAILED",
        tenantId,
        { productId, marketplace, errors: validation.errors, missingAttributes: validation.missingAttributes },
        "listing-engine",
        marketplace
      );
      return { queued: false, errors: [...validation.errors, ...validation.missingAttributes.map((a) => `Atributo obrigatório: ${a}`)] };
    }

    // Get best price/stock from variants
    const { data: variants } = await supabase
      .from("product_variants")
      .select("price, stock")
      .eq("product_id", productId);

    const price = variants?.reduce((max, v) => Math.max(max, v.price ?? 0), 0) ?? 0;
    const stock = variants?.reduce((sum, v) => sum + (v.stock ?? 0), 0) ?? 0;

    // Upsert listing record
    const { data: integration } = await supabase
      .from("marketplace_integrations")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("marketplace", marketplace)
      .eq("status", "connected")
      .maybeSingle();

    if (!integration) {
      return { queued: false, errors: [`Integração ${marketplace} não conectada`] };
    }

    await supabase
      .from("marketplace_listings")
      .upsert(
        {
          tenant_id: tenantId,
          product_id: productId,
          integration_id: integration.id,
          marketplace,
          status: "pending",
          price,
          stock,
        },
        { onConflict: "tenant_id,product_id,marketplace" }
      );

    const jobId = await enqueueListingJob("CREATE_LISTING", { tenantId, productId, marketplace, price, stock });

    cacheService.delete(LISTING_CACHE_KEY(tenantId, productId, marketplace));

    await eventBus.emit(
      "LISTING_CREATED",
      tenantId,
      { productId, marketplace, price, stock },
      "listing-engine",
      marketplace
    );

    return { queued: true, jobId };
  },

  /** Update listing price */
  async updatePrice(tenantId: string, productId: string, marketplace: string, price: number) {
    logger.info("listingEngine.updatePrice", { tenantId, productId, marketplace, price });

    await supabase
      .from("marketplace_listings")
      .update({ price })
      .eq("tenant_id", tenantId)
      .eq("product_id", productId)
      .eq("marketplace", marketplace);

    const jobId = await enqueueListingJob("UPDATE_PRICE", { tenantId, productId, marketplace, price });
    cacheService.delete(LISTING_CACHE_KEY(tenantId, productId, marketplace));

    await eventBus.emit("LISTING_UPDATED", tenantId, { productId, marketplace, price }, "listing-engine", marketplace);
    return jobId;
  },

  /** Update listing stock */
  async updateStock(tenantId: string, productId: string, marketplace: string, stock: number) {
    logger.info("listingEngine.updateStock", { tenantId, productId, marketplace, stock });

    await supabase
      .from("marketplace_listings")
      .update({ stock })
      .eq("tenant_id", tenantId)
      .eq("product_id", productId)
      .eq("marketplace", marketplace);

    const jobId = await enqueueListingJob("UPDATE_STOCK", { tenantId, productId, marketplace, stock });
    cacheService.delete(LISTING_CACHE_KEY(tenantId, productId, marketplace));

    await eventBus.emit("LISTING_UPDATED", tenantId, { productId, marketplace, stock }, "listing-engine", marketplace);
    return jobId;
  },

  /** Pause a listing */
  async pauseListing(tenantId: string, productId: string, marketplace: string, reason?: string) {
    await supabase
      .from("marketplace_listings")
      .update({ status: "paused" })
      .eq("tenant_id", tenantId)
      .eq("product_id", productId)
      .eq("marketplace", marketplace);

    const jobId = await enqueueListingJob("PAUSE_LISTING", { tenantId, productId, marketplace });
    cacheService.delete(LISTING_CACHE_KEY(tenantId, productId, marketplace));

    await eventBus.emit("LISTING_PAUSED", tenantId, { productId, marketplace, reason }, "listing-engine", marketplace);
    return jobId;
  },

  /** Resume a listing */
  async resumeListing(tenantId: string, productId: string, marketplace: string) {
    await supabase
      .from("marketplace_listings")
      .update({ status: "active" })
      .eq("tenant_id", tenantId)
      .eq("product_id", productId)
      .eq("marketplace", marketplace);

    const jobId = await enqueueListingJob("RESUME_LISTING", { tenantId, productId, marketplace });
    cacheService.delete(LISTING_CACHE_KEY(tenantId, productId, marketplace));

    await eventBus.emit("LISTING_ACTIVATED", tenantId, { productId, marketplace }, "listing-engine", marketplace);
    return jobId;
  },

  /** Delete a listing */
  async deleteListing(tenantId: string, productId: string, marketplace: string) {
    await supabase
      .from("marketplace_listings")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("product_id", productId)
      .eq("marketplace", marketplace);

    cacheService.delete(LISTING_CACHE_KEY(tenantId, productId, marketplace));
  },
};
