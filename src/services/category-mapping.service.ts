/**
 * Category Mapping Service
 * Maps internal categories to marketplace categories.
 * Validates required attributes before product listing.
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { eventBus } from "@/events/event-bus";
import { categorySyncService } from "./category-sync.service";

export interface CategoryMappingDTO {
  id: string;
  internalCategoryId: string;
  marketplace: string;
  marketplaceCategoryId: string;
  marketplaceCategoryName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListingValidationResult {
  valid: boolean;
  missingAttributes: string[];
  mappedCategoryId: string | null;
}

export const categoryMappingService = {
  /** Create a mapping between internal and marketplace category */
  async createMapping(
    tenantId: string,
    internalCategoryId: string,
    marketplace: string,
    marketplaceCategoryId: string,
    marketplaceCategoryName?: string
  ): Promise<CategoryMappingDTO> {
    logger.info("categoryMappingService.createMapping", {
      tenantId,
      internalCategoryId,
      marketplace,
      marketplaceCategoryId,
    });

    const { data, error } = await supabase
      .from("category_mappings")
      .upsert(
        {
          tenant_id: tenantId,
          internal_category_id: internalCategoryId,
          marketplace,
          marketplace_category_id: marketplaceCategoryId,
          marketplace_category_name: marketplaceCategoryName || null,
        },
        { onConflict: "tenant_id,internal_category_id,marketplace" }
      )
      .select()
      .single();

    if (error) {
      logger.error("categoryMappingService.createMapping failed", { error });
      throw error;
    }

    await eventBus.emit(
      "CATEGORY_MAPPING_CREATED",
      tenantId,
      {
        internalCategoryId,
        marketplace,
        marketplaceCategoryId,
      },
      "category-mapping-service",
      marketplace
    );

    return mapToDTO(data);
  },

  /** Get mapping for a specific internal category + marketplace */
  async getMapping(
    tenantId: string,
    internalCategoryId: string,
    marketplace: string
  ): Promise<CategoryMappingDTO | null> {
    const { data, error } = await supabase
      .from("category_mappings")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("internal_category_id", internalCategoryId)
      .eq("marketplace", marketplace)
      .maybeSingle();

    if (error) throw error;
    return data ? mapToDTO(data) : null;
  },

  /** List all mappings for a tenant */
  async listMappings(
    tenantId: string,
    marketplace?: string
  ): Promise<CategoryMappingDTO[]> {
    let query = supabase
      .from("category_mappings")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (marketplace) {
      query = query.eq("marketplace", marketplace);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapToDTO);
  },

  /** Delete a mapping */
  async deleteMapping(mappingId: string): Promise<void> {
    const { error } = await supabase
      .from("category_mappings")
      .delete()
      .eq("id", mappingId);

    if (error) throw error;
  },

  /**
   * Validate a product before listing on a marketplace.
   * Checks: category mapping exists + required attributes are filled.
   */
  async validateForListing(
    tenantId: string,
    productId: string,
    internalCategoryId: string,
    marketplace: string,
    productAttributes: Record<string, string>
  ): Promise<ListingValidationResult> {
    // 1) Check mapping exists
    const mapping = await this.getMapping(tenantId, internalCategoryId, marketplace);
    if (!mapping) {
      return {
        valid: false,
        missingAttributes: [],
        mappedCategoryId: null,
      };
    }

    // 2) Get required attributes for the marketplace category
    const attrs = await categorySyncService.getCategoryAttributes(
      marketplace,
      mapping.marketplaceCategoryId
    );

    const requiredAttrs = attrs.filter((a: any) => a.required);
    const missingAttributes = requiredAttrs
      .filter((a: any) => !productAttributes[a.attribute_id])
      .map((a: any) => a.name);

    return {
      valid: missingAttributes.length === 0,
      missingAttributes,
      mappedCategoryId: mapping.marketplaceCategoryId,
    };
  },
};

function mapToDTO(row: any): CategoryMappingDTO {
  return {
    id: row.id,
    internalCategoryId: row.internal_category_id,
    marketplace: row.marketplace,
    marketplaceCategoryId: row.marketplace_category_id,
    marketplaceCategoryName: row.marketplace_category_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
