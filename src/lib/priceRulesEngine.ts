import { supabase } from "@/integrations/supabase/client";

export interface PriceRule {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  status: string;
  adjustment_type: string;
  adjustment_value: number;
  starts_at: string;
  ends_at?: string;
  min_margin_percent: number;
  min_price: number;
  scope: {
    marketplaces?: string[];
    categories?: string[];
    brands?: string[];
    price_from?: number;
    price_to?: number;
    skus?: string[];
  };
  products_affected: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PreviewItem {
  product_id: string;
  product_variant_id: string;
  product_name: string;
  sku: string;
  marketplace: string;
  listing_id: string;
  price_before: number;
  price_after: number;
  cost: number;
  margin_before: number;
  margin_after: number;
  blocked_by_margin: boolean;
}

export interface PreviewResult {
  affected: PreviewItem[];
  blocked: PreviewItem[];
  summary: {
    total_affected: number;
    total_blocked: number;
    avg_variation: number;
  };
}

export function calculateNewPrice(currentPrice: number, adjustmentType: string, adjustmentValue: number): number {
  switch (adjustmentType) {
    case "percent_increase": return currentPrice * (1 + adjustmentValue / 100);
    case "percent_decrease": return currentPrice * (1 - adjustmentValue / 100);
    case "fixed_increase": return currentPrice + adjustmentValue;
    case "fixed_decrease": return Math.max(0, currentPrice - adjustmentValue);
    case "fixed_price": return adjustmentValue;
    default: return currentPrice;
  }
}

export function checkMarginProtection(newPrice: number, cost: number, minMarginPercent: number, minPrice: number): boolean {
  if (newPrice < minPrice) return false;
  if (cost > 0) {
    const margin = ((newPrice - cost) / newPrice) * 100;
    if (margin < minMarginPercent) return false;
  }
  return true;
}

function calculateMargin(price: number, cost: number): number {
  if (price <= 0) return 0;
  return ((price - cost) / price) * 100;
}

export async function applyPriceRule(rule: PriceRule, tenantId: string): Promise<PreviewResult> {
  // 1. Get products matching scope
  let productsQuery = supabase
    .from("products")
    .select("id, title, sku, brand, category_id, product_variants(id, sku, price, cost)")
    .eq("tenant_id", tenantId)
    .eq("status", "active");

  if (rule.scope.brands && rule.scope.brands.length > 0) {
    productsQuery = productsQuery.in("brand", rule.scope.brands);
  }
  if (rule.scope.categories && rule.scope.categories.length > 0) {
    productsQuery = productsQuery.in("category_id", rule.scope.categories);
  }

  const { data: products } = await productsQuery;
  if (!products || products.length === 0) return { affected: [], blocked: [], summary: { total_affected: 0, total_blocked: 0, avg_variation: 0 } };

  // Filter by SKUs if specified
  let filteredProducts = products;
  if (rule.scope.skus && rule.scope.skus.length > 0) {
    const skuSet = new Set(rule.scope.skus.map(s => s.trim().toUpperCase()));
    filteredProducts = products.filter(p =>
      p.sku?.toUpperCase() && skuSet.has(p.sku.toUpperCase()) ||
      (p.product_variants as any[])?.some(v => v.sku?.toUpperCase() && skuSet.has(v.sku.toUpperCase()))
    );
  }

  // 2. Get marketplace listings for these products
  const productIds = filteredProducts.map(p => p.id);
  if (productIds.length === 0) return { affected: [], blocked: [], summary: { total_affected: 0, total_blocked: 0, avg_variation: 0 } };

  let listingsQuery = supabase
    .from("marketplace_listings")
    .select("id, product_id, price, status, marketplace_integrations(marketplace)")
    .in("product_id", productIds)
    .neq("status", "inactive");

  const { data: listings } = await listingsQuery;

  // Filter by marketplace scope
  let filteredListings = listings || [];
  if (rule.scope.marketplaces && rule.scope.marketplaces.length > 0 && !rule.scope.marketplaces.includes("all")) {
    filteredListings = filteredListings.filter((l: any) =>
      rule.scope.marketplaces!.includes(l.marketplace_integrations?.marketplace)
    );
  }

  // Filter by price range
  if (rule.scope.price_from != null) {
    filteredListings = filteredListings.filter((l: any) => (l.price || 0) >= rule.scope.price_from!);
  }
  if (rule.scope.price_to != null) {
    filteredListings = filteredListings.filter((l: any) => (l.price || 0) <= rule.scope.price_to!);
  }

  // 3. Build preview items
  const affected: PreviewItem[] = [];
  const blocked: PreviewItem[] = [];

  for (const listing of filteredListings as any[]) {
    const product = filteredProducts.find(p => p.id === listing.product_id);
    if (!product) continue;
    const variant = (product.product_variants as any[])?.[0];
    const currentPrice = listing.price || variant?.price || 0;
    const cost = variant?.cost || 0;
    const newPrice = Math.round(calculateNewPrice(currentPrice, rule.adjustment_type, rule.adjustment_value) * 100) / 100;
    const marginBefore = calculateMargin(currentPrice, cost);
    const marginAfter = calculateMargin(newPrice, cost);
    const passesProtection = checkMarginProtection(newPrice, cost, rule.min_margin_percent || 0, rule.min_price || 0);

    const item: PreviewItem = {
      product_id: product.id,
      product_variant_id: variant?.id || "",
      product_name: product.title,
      sku: variant?.sku || product.sku || "",
      marketplace: listing.marketplace_integrations?.marketplace || "—",
      listing_id: listing.id,
      price_before: currentPrice,
      price_after: newPrice,
      cost,
      margin_before: Math.round(marginBefore * 100) / 100,
      margin_after: Math.round(marginAfter * 100) / 100,
      blocked_by_margin: !passesProtection,
    };

    if (passesProtection) affected.push(item);
    else blocked.push(item);
  }

  const totalVariation = affected.length > 0
    ? affected.reduce((sum, i) => sum + ((i.price_after - i.price_before) / i.price_before) * 100, 0) / affected.length
    : 0;

  return {
    affected,
    blocked,
    summary: {
      total_affected: affected.length,
      total_blocked: blocked.length,
      avg_variation: Math.round(totalVariation * 10) / 10,
    },
  };
}
