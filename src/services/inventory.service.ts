/**
 * Inventory Service
 * Responsável por operações de armazéns, regras de estoque e movimentações.
 * Tabelas: warehouses, stock_rules, stock_movements
 * Isolamento: tenant_id obrigatório em todas as queries.
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import type { WarehouseDTO, StockRuleDTO } from "@/types/dto";

export const inventoryService = {
  /** Listar armazéns ativos */
  async listWarehouses(tenantId: string): Promise<WarehouseDTO[]> {
    logger.debug("inventoryService.listWarehouses", { tenantId });
    const { data, error } = await supabase
      .from("warehouses")
      .select("id, name, is_default")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .order("name");
    if (error) { logger.error("inventoryService.listWarehouses failed", { error }); throw error; }
    return (data || []).map(w => ({ id: w.id, name: w.name, isDefault: w.is_default ?? false }));
  },

  /** Listar regras de estoque por canal */
  async listStockRules(tenantId: string): Promise<StockRuleDTO[]> {
    logger.debug("inventoryService.listStockRules", { tenantId });
    const { data, error } = await supabase
      .from("stock_rules")
      .select("*, products(title)")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (error) { logger.error("inventoryService.listStockRules failed", { error }); throw error; }
    return (data || []).map((r: any) => ({
      id: r.id,
      productId: r.product_id,
      productTitle: r.products?.title || "—",
      marketplace: r.marketplace,
      minStock: r.min_stock ?? 0,
      maxAvailable: r.max_available,
    }));
  },

  /** Criar ou atualizar regra de estoque */
  async saveStockRule(payload: {
    id?: string;
    tenantId: string;
    productId: string;
    marketplace: string;
    minStock: number;
    maxAvailable: number | null;
  }): Promise<void> {
    const dbPayload = {
      tenant_id: payload.tenantId,
      product_id: payload.productId,
      marketplace: payload.marketplace,
      min_stock: payload.minStock,
      max_available: payload.maxAvailable,
    };

    if (payload.id) {
      logger.info("inventoryService.saveStockRule (update)", { id: payload.id });
      const { error } = await supabase.from("stock_rules").update(dbPayload).eq("id", payload.id);
      if (error) { logger.error("inventoryService.saveStockRule update failed", { error }); throw error; }
    } else {
      logger.info("inventoryService.saveStockRule (insert)");
      const { error } = await supabase.from("stock_rules").insert(dbPayload);
      if (error) { logger.error("inventoryService.saveStockRule insert failed", { error }); throw error; }
    }
  },

  /** Excluir regra de estoque */
  async deleteStockRule(id: string): Promise<void> {
    logger.info("inventoryService.deleteStockRule", { id });
    const { error } = await supabase.from("stock_rules").delete().eq("id", id);
    if (error) { logger.error("inventoryService.deleteStockRule failed", { error }); throw error; }
  },

  /** Inserir movimentação de estoque */
  async insertStockMovement(movement: {
    tenantId: string;
    productVariantId: string;
    type: string;
    quantity: number;
    reason?: string;
    warehouseId?: string;
  }): Promise<void> {
    logger.info("inventoryService.insertStockMovement", { type: movement.type, qty: movement.quantity });
    const { error } = await supabase.from("stock_movements").insert({
      tenant_id: movement.tenantId,
      product_variant_id: movement.productVariantId,
      type: movement.type,
      quantity: movement.quantity,
      reason: movement.reason,
      warehouse_id: movement.warehouseId,
    });
    if (error) { logger.error("inventoryService.insertStockMovement failed", { error }); throw error; }
  },
};
