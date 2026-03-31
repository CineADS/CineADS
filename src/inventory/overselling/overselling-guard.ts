/**
 * Overselling Guard — protege contra vendas acima do estoque disponível.
 * Calcula estoque líquido (total - reservado) e dispara alertas quando crítico.
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { eventBus } from "@/events/event-bus";

export interface AvailableStockResult {
  productVariantId: string;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  isCritical: boolean;
  isOutOfStock: boolean;
}

export const oversellingGuard = {
  /** Calcular estoque disponível (total - reservado) */
  async getAvailableStock(
    tenantId: string,
    productVariantId: string
  ): Promise<AvailableStockResult> {
    const [variantRes, reservationsRes] = await Promise.all([
      supabase
        .from("product_variants")
        .select("stock, product_id")
        .eq("id", productVariantId)
        .single(),
      supabase
        .from("stock_reservations")
        .select("reserved_quantity")
        .eq("tenant_id", tenantId)
        .eq("product_variant_id", productVariantId)
        .eq("status", "reserved"),
    ]);

    const totalStock = Number(variantRes.data?.stock) || 0;
    const reservedStock = (reservationsRes.data || []).reduce(
      (sum, r) => sum + (Number(r.reserved_quantity) || 0),
      0
    );
    const availableStock = Math.max(0, totalStock - reservedStock);

    return {
      productVariantId,
      totalStock,
      reservedStock,
      availableStock,
      isCritical: availableStock <= 5 && availableStock > 0,
      isOutOfStock: availableStock <= 0,
    };
  },

  /** Verificar se é seguro vender a quantidade solicitada */
  async canFulfill(
    tenantId: string,
    productVariantId: string,
    quantity: number
  ): Promise<{ allowed: boolean; available: number; reason?: string }> {
    const stock = await this.getAvailableStock(tenantId, productVariantId);

    if (stock.availableStock >= quantity) {
      return { allowed: true, available: stock.availableStock };
    }

    return {
      allowed: false,
      available: stock.availableStock,
      reason: `Estoque insuficiente: disponível ${stock.availableStock}, solicitado ${quantity}`,
    };
  },

  /** Verificar estoque e emitir alertas se necessário */
  async checkAndAlert(tenantId: string, productVariantId: string): Promise<void> {
    const stock = await this.getAvailableStock(tenantId, productVariantId);

    if (stock.isOutOfStock) {
      await eventBus.emit("STOCK_OUT", tenantId, {
        productVariantId,
        availableStock: 0,
      }, "overselling-guard");
      logger.warn("oversellingGuard: STOCK_OUT", { productVariantId });
    } else if (stock.isCritical) {
      await eventBus.emit("STOCK_LOW", tenantId, {
        productVariantId,
        availableStock: stock.availableStock,
      }, "overselling-guard");
      logger.warn("oversellingGuard: STOCK_LOW", { productVariantId, available: stock.availableStock });
    }
  },
};
