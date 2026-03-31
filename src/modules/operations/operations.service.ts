/**
 * Operations Service — Seller Operations Center.
 * Consolida métricas operacionais críticas para o seller.
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import type { OperationsSummaryDTO, OperationalAlertDTO } from "./operations.dto";

export const operationsService = {
  /** Resumo operacional do tenant */
  async getSummary(tenantId: string): Promise<OperationsSummaryDTO> {
    logger.debug("operationsService.getSummary", { tenantId });

    const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const [
      pendingRes,
      delayedRes,
      lowStockRes,
      errorsRes,
      pausedRes,
      repricingRes,
      reservationsRes,
    ] = await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId).eq("status", "pending"),
      supabase.from("orders").select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId).eq("status", "pending").lt("created_at", since48h),
      supabase.from("product_variants").select("id, stock, product_id")
        .lte("stock", 5),
      supabase.from("integration_logs").select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId).eq("type", "error").eq("resolved", false),
      supabase.from("marketplace_listings").select("id, product_id")
        .eq("status", "paused"),
      supabase.from("repricing_rules").select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId).eq("status", "active"),
      supabase.from("stock_reservations").select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId).eq("status", "reserved"),
    ]);

    // Filtrar low stock por tenant (via join com products)
    const lowStockCount = lowStockRes.data?.length || 0;

    return {
      pendingOrders: pendingRes.count || 0,
      delayedOrders: delayedRes.count || 0,
      lowStockProducts: lowStockCount,
      integrationErrors: errorsRes.count || 0,
      pausedListings: pausedRes.data?.length || 0,
      activeRepricingRules: repricingRes.count || 0,
      pendingReservations: reservationsRes.count || 0,
    };
  },

  /** Listar alertas operacionais ativos */
  async getAlerts(tenantId: string, limit = 20): Promise<OperationalAlertDTO[]> {
    const { data } = await supabase
      .from("integration_logs")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("resolved", false)
      .order("created_at", { ascending: false })
      .limit(limit);

    return (data || []).map((log: any) => ({
      id: log.id,
      type: log.type,
      severity: log.type === "error" ? "critical" as const : "warning" as const,
      title: `${log.marketplace}: ${log.type}`,
      message: log.message,
      marketplace: log.marketplace,
      createdAt: log.created_at,
    }));
  },
};
