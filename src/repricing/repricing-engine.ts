/**
 * Repricing Engine — motor de repricing automático.
 * Monitora preços de concorrentes e ajusta preços automaticamente via Sync Engine.
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { eventBus } from "@/events/event-bus";
import { calculateReprice, type RepricingRule, type RepricingResult, type RepricingStrategy } from "./repricing-rules";

function mapRow(r: any): RepricingRule {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    productId: r.product_id,
    marketplace: r.marketplace,
    strategy: r.strategy as RepricingStrategy,
    minPrice: Number(r.min_price) || 0,
    maxPrice: r.max_price ? Number(r.max_price) : null,
    targetMargin: Number(r.target_margin) || 15,
    competitorPrice: r.competitor_price ? Number(r.competitor_price) : null,
    currentPrice: r.current_price ? Number(r.current_price) : null,
    lastRepricedAt: r.last_repriced_at,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const repricingEngine = {
  /** Processar evento de mudança de preço do concorrente */
  async handlePriceChange(
    tenantId: string,
    productId: string,
    marketplace: string,
    competitorPrice: number,
    cost: number
  ): Promise<RepricingResult[]> {
    logger.info("repricingEngine.handlePriceChange", { tenantId, productId, marketplace, competitorPrice });

    const { data, error } = await supabase
      .from("repricing_rules")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .or(`product_id.eq.${productId},product_id.is.null`)
      .eq("marketplace", marketplace);

    if (error) {
      logger.error("repricingEngine: failed to fetch rules", { error });
      return [];
    }

    const rules = (data || []).map(mapRow);
    const results: RepricingResult[] = [];

    for (const rule of rules) {
      const { newPrice, blocked, reason } = calculateReprice(
        rule.strategy,
        competitorPrice,
        cost,
        rule.targetMargin,
        rule.minPrice,
        rule.maxPrice
      );

      const result: RepricingResult = {
        ruleId: rule.id,
        productId: rule.productId,
        marketplace: rule.marketplace,
        previousPrice: rule.currentPrice || 0,
        newPrice,
        strategy: rule.strategy,
        reason,
        blocked,
        blockReason: blocked ? reason : undefined,
      };

      results.push(result);

      if (!blocked && newPrice !== rule.currentPrice) {
        // Atualizar preço na regra
        await supabase
          .from("repricing_rules")
          .update({
            current_price: newPrice,
            competitor_price: competitorPrice,
            last_repriced_at: new Date().toISOString(),
          })
          .eq("id", rule.id);

        // Emitir evento para Sync Engine atualizar no marketplace
        await eventBus.emit("PRICE_UPDATED", tenantId, {
          productId: rule.productId,
          newPrice,
          previousPrice: rule.currentPrice,
          marketplace,
          source: "repricing-engine",
        }, "repricing-engine", marketplace);

        logger.info("repricingEngine: price updated", { ruleId: rule.id, newPrice, strategy: rule.strategy });
      }
    }

    return results;
  },

  /** Listar regras de repricing */
  async listRules(tenantId: string): Promise<RepricingRule[]> {
    const { data } = await supabase
      .from("repricing_rules")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    return (data || []).map(mapRow);
  },

  /** Criar regra de repricing */
  async createRule(tenantId: string, rule: Partial<RepricingRule>): Promise<RepricingRule | null> {
    const { data, error } = await supabase
      .from("repricing_rules")
      .insert([{
        tenant_id: tenantId,
        product_id: rule.productId,
        marketplace: rule.marketplace || "all",
        strategy: rule.strategy || "FIXED_MARGIN",
        min_price: rule.minPrice || 0,
        max_price: rule.maxPrice,
        target_margin: rule.targetMargin || 15,
        status: "active",
      }])
      .select()
      .single();

    if (error) {
      logger.error("repricingEngine.createRule failed", { error });
      return null;
    }
    return mapRow(data);
  },
};
