/**
 * Products Service
 * Responsável por operações de produtos, categorias e regras de preço.
 * Tabelas: products, product_variants, product_images, categories, price_rules
 * Isolamento: tenant_id obrigatório em todas as queries.
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import type { ProductDTO, ProductVariantDTO, ProductImageDTO, CategoryDTO, PriceRuleDTO, PaginatedResult } from "@/types/dto";

interface ListProductsParams {
  tenantId: string;
  categoryId?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

function mapProductRow(row: any): ProductDTO {
  return {
    id: row.id,
    title: row.title,
    sku: row.sku,
    ean: row.ean,
    brand: row.brand,
    model: row.model,
    status: row.status,
    categoryId: row.category_id,
    description: row.description,
    createdAt: row.created_at,
    variants: row.product_variants?.map((v: any): ProductVariantDTO => ({
      id: v.id,
      sku: v.sku,
      price: Number(v.price || 0),
      cost: Number(v.cost || 0),
      stock: v.stock ?? 0,
      combination: v.combination,
      warehouseStocks: v.warehouse_stocks,
    })),
    images: row.product_images?.map((img: any): ProductImageDTO => ({
      url: img.url,
      isPrimary: img.is_primary ?? false,
    })),
  };
}

export const productsService = {
  /** Listagem paginada de produtos */
  async listProducts(params: ListProductsParams): Promise<PaginatedResult<ProductDTO>> {
    const { tenantId, categoryId, page = 0, pageSize = 50 } = params;
    logger.debug("productsService.listProducts", { tenantId, categoryId, page });

    let query = supabase
      .from("products")
      .select("*, product_variants(id, sku, price, cost, stock, combination, warehouse_stocks), product_images(url, is_primary)", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (categoryId && categoryId !== "all") query = query.eq("category_id", categoryId);

    const { data, error, count } = await query;
    if (error) { logger.error("productsService.listProducts failed", { error }); throw error; }

    const total = count || 0;
    return {
      data: (data || []).map(mapProductRow),
      count: total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  /** Contagem de produtos ativos */
  async getActiveProductsCount(tenantId: string, beforeDate?: string): Promise<number> {
    logger.debug("productsService.getActiveProductsCount", { tenantId, beforeDate });
    let query = supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "active");
    if (beforeDate) query = query.lte("created_at", beforeDate);
    const { count, error } = await query;
    if (error) { logger.error("productsService.getActiveProductsCount failed", { error }); throw error; }
    return count || 0;
  },

  /** Atualização em massa de status */
  async bulkUpdateProductStatus(ids: string[], status: string): Promise<void> {
    logger.info("productsService.bulkUpdateProductStatus", { count: ids.length, status });
    const { error } = await supabase.from("products").update({ status }).in("id", ids);
    if (error) { logger.error("productsService.bulkUpdateProductStatus failed", { error }); throw error; }
  },

  /** Exclusão em massa */
  async bulkDeleteProducts(ids: string[]): Promise<void> {
    logger.info("productsService.bulkDeleteProducts", { count: ids.length });
    const { error } = await supabase.from("products").delete().in("id", ids);
    if (error) { logger.error("productsService.bulkDeleteProducts failed", { error }); throw error; }
  },

  /** Listar categorias do tenant */
  async listCategories(tenantId: string): Promise<CategoryDTO[]> {
    logger.debug("productsService.listCategories", { tenantId });
    const { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .order("name");
    if (error) { logger.error("productsService.listCategories failed", { error }); throw error; }
    return (data || []).map(c => ({ id: c.id, name: c.name }));
  },

  /** Listar regras de preço ativas */
  async listActivePriceRules(tenantId: string): Promise<PriceRuleDTO[]> {
    logger.debug("productsService.listActivePriceRules", { tenantId });
    const { data, error } = await supabase
      .from("price_rules")
      .select("id, name, ends_at, scope")
      .eq("tenant_id", tenantId)
      .eq("status", "active");
    if (error) { logger.error("productsService.listActivePriceRules failed", { error }); throw error; }
    return (data || []).map(r => ({ id: r.id, name: r.name, endsAt: r.ends_at, scope: (r.scope || {}) as Record<string, unknown> }));
  },

  /** Produtos para visão de estoque */
  async listProductsForInventory(tenantId: string): Promise<ProductDTO[]> {
    logger.debug("productsService.listProductsForInventory", { tenantId });
    const { data, error } = await supabase
      .from("products")
      .select("id, title, sku, status, product_variants(id, sku, stock, combination, price, cost, warehouse_stocks)")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("title");
    if (error) { logger.error("productsService.listProductsForInventory failed", { error }); throw error; }
    return (data || []).map(mapProductRow);
  },
};
