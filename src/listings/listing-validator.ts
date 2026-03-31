/**
 * Listing Validator
 * Validates products before publishing to marketplaces.
 */
import { logger } from "@/lib/logger";
import { categoryMappingService } from "@/services/category-mapping.service";
import { supabase } from "@/integrations/supabase/client";

export interface ListingValidationResult {
  valid: boolean;
  missingAttributes: string[];
  errors: string[];
}

export async function validateForListing(
  tenantId: string,
  productId: string,
  marketplace: string
): Promise<ListingValidationResult> {
  const errors: string[] = [];

  // 1) Fetch product
  const { data: product, error: pErr } = await supabase
    .from("products")
    .select("id, title, category_id, status")
    .eq("id", productId)
    .eq("tenant_id", tenantId)
    .single();

  if (pErr || !product) {
    return { valid: false, missingAttributes: [], errors: ["Produto não encontrado"] };
  }

  if (product.status !== "active") {
    errors.push("Produto não está ativo");
  }

  // 2) Check variants exist with price > 0
  const { data: variants } = await supabase
    .from("product_variants")
    .select("id, price, stock, sku")
    .eq("product_id", productId);

  if (!variants?.length) {
    errors.push("Produto sem variações cadastradas");
  } else {
    const hasPrice = variants.some((v) => (v.price ?? 0) > 0);
    if (!hasPrice) errors.push("Nenhuma variação com preço definido");

    const hasStock = variants.some((v) => (v.stock ?? 0) > 0);
    if (!hasStock) errors.push("Nenhuma variação com estoque disponível");
  }

  // 3) Category mapping
  if (!product.category_id) {
    errors.push("Produto sem categoria definida");
    return { valid: false, missingAttributes: [], errors };
  }

  const productAttrs: Record<string, string> = {};
  const { data: attrs } = await supabase
    .from("product_attributes")
    .select("attribute_key, attribute_value")
    .eq("product_id", productId)
    .eq("marketplace", marketplace);

  (attrs || []).forEach((a) => {
    if (a.attribute_value) productAttrs[a.attribute_key] = a.attribute_value;
  });

  const validation = await categoryMappingService.validateForListing(
    tenantId,
    productId,
    product.category_id,
    marketplace,
    productAttrs
  );

  if (!validation.mappedCategoryId) {
    errors.push(`Categoria não mapeada para ${marketplace}`);
  }

  return {
    valid: errors.length === 0 && validation.valid,
    missingAttributes: validation.missingAttributes,
    errors,
  };
}
