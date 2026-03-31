/**
 * Inventory Sync — sincroniza estoque entre marketplaces.
 * Usa o estoque disponível (total - reservado) para atualizar anúncios.
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { oversellingGuard } from "./overselling-guard";
import { eventBus } from "@/events/event-bus";

export const inventorySync = {
  /** Calcular estoque disponível para um marketplace e enfileirar atualização */
  async syncVariantToMarketplaces(tenantId: string, productVariantId: string): Promise<void> {
    logger.info("inventorySync.syncVariantToMarketplaces", { tenantId, productVariantId });

    const stock = await oversellingGuard.getAvailableStock(tenantId, productVariantId);

    // Buscar listings vinculados a esse variant via produto
    const { data: variant } = await supabase
      .from("product_variants")
      .select("product_id")
      .eq("id", productVariantId)
      .single();

    if (!variant) return;

    const { data: listings } = await supabase
      .from("marketplace_listings")
      .select("id, integration_id, marketplace_integrations(marketplace)")
      .eq("product_id", variant.product_id)
      .neq("status", "inactive");

    if (!listings || listings.length === 0) return;

    // Emitir evento de stock para cada marketplace
    for (const listing of listings) {
      const marketplace = (listing as any).marketplace_integrations?.marketplace;
      await eventBus.emit("STOCK_UPDATED", tenantId, {
        productVariantId,
        listingId: listing.id,
        availableStock: stock.availableStock,
        marketplace,
      }, "inventory-sync", marketplace);
    }

    logger.info("inventorySync: synced to marketplaces", {
      productVariantId,
      availableStock: stock.availableStock,
      listingCount: listings.length,
    });
  },

  /** Sincronizar estoque de todos os variants de um produto */
  async syncProductToMarketplaces(tenantId: string, productId: string): Promise<void> {
    const { data: variants } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", productId);

    if (!variants) return;

    for (const v of variants) {
      await this.syncVariantToMarketplaces(tenantId, v.id);
    }
  },
};
