/**
 * Analytics Service
 * Responsável por métricas de vendas, produtos e marketplace.
 * Consulta orders, order_items, products e transactions.
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface SalesByMarketplace {
  marketplace: string;
  totalOrders: number;
  totalRevenue: number;
}

export interface TopProduct {
  productTitle: string;
  totalSold: number;
  totalRevenue: number;
}

export interface RevenueByPeriod {
  date: string;
  revenue: number;
  orders: number;
}

export interface ProfitMarginDTO {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  marginPercent: number;
}

export interface HubAnalyticsSummary {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  activeListings: number;
  salesByMarketplace: SalesByMarketplace[];
}

export const analyticsService = {
  /** Resumo geral do HUB */
  async getHubSummary(tenantId: string): Promise<HubAnalyticsSummary> {
    logger.debug("analyticsService.getHubSummary", { tenantId });

    const [ordersRes, productsRes, listingsRes] = await Promise.all([
      supabase
        .from("orders")
        .select("marketplace, total", { count: "exact" })
        .eq("tenant_id", tenantId),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "active"),
      supabase
        .from("marketplace_listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
    ]);

    const orders = ordersRes.data || [];
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);

    // Agrupar vendas por marketplace
    const byMkt = new Map<string, { orders: number; revenue: number }>();
    for (const o of orders) {
      const mkt = o.marketplace || "direto";
      const entry = byMkt.get(mkt) || { orders: 0, revenue: 0 };
      entry.orders++;
      entry.revenue += Number(o.total || 0);
      byMkt.set(mkt, entry);
    }

    return {
      totalOrders: ordersRes.count || orders.length,
      totalRevenue,
      totalProducts: productsRes.count || 0,
      activeListings: listingsRes.count || 0,
      salesByMarketplace: Array.from(byMkt.entries()).map(([marketplace, data]) => ({
        marketplace,
        totalOrders: data.orders,
        totalRevenue: data.revenue,
      })),
    };
  },

  /** Vendas por período (últimos N dias) */
  async getRevenueByPeriod(
    tenantId: string,
    days = 30
  ): Promise<RevenueByPeriod[]> {
    logger.debug("analyticsService.getRevenueByPeriod", { tenantId, days });

    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
      .from("orders")
      .select("created_at, total")
      .eq("tenant_id", tenantId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true });

    if (error) {
      logger.error("analyticsService.getRevenueByPeriod failed", { error });
      throw error;
    }

    const byDate = new Map<string, { revenue: number; orders: number }>();
    for (const row of data || []) {
      const date = row.created_at.substring(0, 10);
      const entry = byDate.get(date) || { revenue: 0, orders: 0 };
      entry.revenue += Number(row.total || 0);
      entry.orders++;
      byDate.set(date, entry);
    }

    return Array.from(byDate.entries()).map(([date, d]) => ({
      date,
      revenue: d.revenue,
      orders: d.orders,
    }));
  },

  /** Produtos mais vendidos */
  async getTopProducts(tenantId: string, limit = 10): Promise<TopProduct[]> {
    logger.debug("analyticsService.getTopProducts", { tenantId, limit });

    const { data, error } = await supabase
      .from("order_items")
      .select("title, quantity, price, orders!inner(tenant_id)")
      .eq("orders.tenant_id", tenantId);

    if (error) {
      logger.error("analyticsService.getTopProducts failed", { error });
      throw error;
    }

    const byProduct = new Map<string, { sold: number; revenue: number }>();
    for (const item of data || []) {
      const title = item.title || "Sem título";
      const entry = byProduct.get(title) || { sold: 0, revenue: 0 };
      entry.sold += item.quantity;
      entry.revenue += Number(item.price || 0) * item.quantity;
      byProduct.set(title, entry);
    }

    return Array.from(byProduct.entries())
      .map(([productTitle, d]) => ({
        productTitle,
        totalSold: d.sold,
        totalRevenue: d.revenue,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);
  },
};
