/**
 * Marketplace Service
 * Responsável por integrações, listings e logs de marketplace.
 * Tabelas: marketplace_integrations, marketplace_listings, integration_logs
 * Isolamento: tenant_id obrigatório. Preparado para múltiplos marketplaces.
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import type { MarketplaceIntegrationDTO, IntegrationLogDTO } from "@/types/dto";

export const marketplaceService = {
  /** Listar integrações de marketplace do tenant */
  async listIntegrations(tenantId: string): Promise<MarketplaceIntegrationDTO[]> {
    logger.debug("marketplaceService.listIntegrations", { tenantId });
    const { data, error } = await supabase
      .from("marketplace_integrations")
      .select("*")
      .eq("tenant_id", tenantId);
    if (error) { logger.error("marketplaceService.listIntegrations failed", { error }); throw error; }
    return (data || []).map(i => ({
      id: i.id,
      marketplace: i.marketplace,
      status: i.status,
      credentials: i.credentials as Record<string, unknown> | null,
      settings: i.settings as Record<string, unknown> | null,
      createdAt: i.created_at,
      updatedAt: i.updated_at,
    }));
  },

  /** Buscar listings de marketplace para produtos específicos */
  async getListingsForProducts(productIds: string[]) {
    if (productIds.length === 0) return [];
    logger.debug("marketplaceService.getListingsForProducts", { count: productIds.length });
    const { data, error } = await supabase
      .from("marketplace_listings")
      .select("product_id, integration_id, marketplace_integrations(marketplace)")
      .in("product_id", productIds)
      .neq("status", "inactive");
    if (error) { logger.error("marketplaceService.getListingsForProducts failed", { error }); throw error; }
    return data || [];
  },

  /** Buscar logs de integração */
  async listIntegrationLogs(tenantId: string, limit = 50): Promise<IntegrationLogDTO[]> {
    logger.debug("marketplaceService.listIntegrationLogs", { tenantId, limit });
    const { data, error } = await supabase
      .from("integration_logs")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) { logger.error("marketplaceService.listIntegrationLogs failed", { error }); throw error; }
    return (data || []).map(l => ({
      id: l.id,
      marketplace: l.marketplace,
      type: l.type,
      message: l.message,
      details: l.details as Record<string, unknown> | null,
      resolved: l.resolved ?? false,
      createdAt: l.created_at || "",
    }));
  },

  /** Sincronizar pedidos (invoca Edge Function) */
  async syncOrders(tenantId: string): Promise<void> {
    logger.info("marketplaceService.syncOrders", { tenantId });
    const { error } = await supabase.functions.invoke("ml-sync-orders", { body: { tenantId } });
    if (error) { logger.error("marketplaceService.syncOrders failed", { error }); throw error; }
  },

  /** Sincronizar estoque (invoca Edge Function) */
  async syncStock(tenantId: string): Promise<void> {
    logger.info("marketplaceService.syncStock", { tenantId });
    const { error } = await supabase.functions.invoke("ml-sync-stock", { body: { tenantId } });
    if (error) { logger.error("marketplaceService.syncStock failed", { error }); throw error; }
  },
};
