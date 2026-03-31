/**
 * Orders Service
 * Responsável por todas as operações de pedidos.
 * Tabelas: orders, order_items, order_shipping, order_timeline
 * Isolamento: tenant_id obrigatório em todas as queries.
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import type { OrderDTO, OrderItemDTO, PaginatedResult } from "@/types/dto";

interface ListOrdersParams {
  tenantId: string;
  status?: string;
  marketplace?: string;
  dateFrom?: string;
  dateTo?: string;
  minValue?: number;
  maxValue?: number;
  searchId?: string;
  searchName?: string;
  page?: number;
  pageSize?: number;
}

function mapOrderRow(row: any): OrderDTO {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customer: row.customer as OrderDTO["customer"],
    marketplace: row.marketplace,
    status: row.status,
    total: Number(row.total || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: row.order_items?.map((i: any): OrderItemDTO => ({
      id: i.id,
      title: i.title,
      quantity: i.quantity,
      price: Number(i.price || 0),
    })),
  };
}

export const ordersService = {
  /** Listagem paginada de pedidos com filtros */
  async listOrders(params: ListOrdersParams): Promise<PaginatedResult<OrderDTO>> {
    const { tenantId, status, marketplace, dateFrom, dateTo, minValue, maxValue, searchId, searchName, page = 0, pageSize = 50 } = params;
    logger.debug("ordersService.listOrders", { tenantId, status, page });

    let query = supabase
      .from("orders")
      .select("*, order_items(id, title, quantity, price)", { count: "exact" })
      .eq("tenant_id", tenantId);

    if (status && status !== "all") query = query.eq("status", status);
    if (marketplace) query = query.eq("marketplace", marketplace);
    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", dateTo);
    if (minValue) query = query.gte("total", minValue);
    if (maxValue) query = query.lte("total", maxValue);
    if (searchId) query = query.ilike("order_number", `%${searchId}%`);
    if (searchName) query = query.ilike("customer->>name", `%${searchName}%`);

    query = query.order("created_at", { ascending: false }).range(page * pageSize, (page + 1) * pageSize - 1);

    const { data, error, count } = await query;
    if (error) { logger.error("ordersService.listOrders failed", { error }); throw error; }

    const total = count || 0;
    return {
      data: (data || []).map(mapOrderRow),
      count: total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  /** Buscar pedido por ID */
  async getOrderById(orderId: string): Promise<OrderDTO> {
    logger.debug("ordersService.getOrderById", { orderId });
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*, product_variants(sku, combination)), order_shipping(*), order_timeline(*)")
      .eq("id", orderId)
      .single();
    if (error) { logger.error("ordersService.getOrderById failed", { error }); throw error; }
    return mapOrderRow(data);
  },

  /** Atualizar status do pedido */
  async updateOrderStatus(orderId: string, status: string): Promise<void> {
    logger.info("ordersService.updateOrderStatus", { orderId, status });
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) { logger.error("ordersService.updateOrderStatus failed", { error }); throw error; }
  },

  /** Buscar pedidos de um período (para KPIs) */
  async getOrdersForPeriod(tenantId: string, from: string, to?: string) {
    logger.debug("ordersService.getOrdersForPeriod", { tenantId, from, to });
    let query = supabase
      .from("orders")
      .select("total")
      .eq("tenant_id", tenantId)
      .gte("created_at", from)
      .neq("status", "cancelled");
    if (to) query = query.lt("created_at", to);
    const { data, error } = await query;
    if (error) { logger.error("ordersService.getOrdersForPeriod failed", { error }); throw error; }
    return data || [];
  },

  /** Pedidos recentes */
  async getRecentOrders(tenantId: string, limit = 10) {
    logger.debug("ordersService.getRecentOrders", { tenantId, limit });
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_number, customer, total, status, marketplace, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) { logger.error("ordersService.getRecentOrders failed", { error }); throw error; }
    return (data || []).map(mapOrderRow);
  },
};
