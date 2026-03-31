/**
 * Repricing Rules — tipos e estratégias de repricing.
 */

export type RepricingStrategy = "MATCH_LOWEST" | "BEAT_LOWEST" | "FIXED_MARGIN";

export interface RepricingRule {
  id: string;
  tenantId: string;
  productId: string | null;
  marketplace: string;
  strategy: RepricingStrategy;
  minPrice: number;
  maxPrice: number | null;
  targetMargin: number;
  competitorPrice: number | null;
  currentPrice: number | null;
  lastRepricedAt: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface RepricingResult {
  ruleId: string;
  productId: string | null;
  marketplace: string;
  previousPrice: number;
  newPrice: number;
  strategy: RepricingStrategy;
  reason: string;
  blocked: boolean;
  blockReason?: string;
}

export function calculateReprice(
  strategy: RepricingStrategy,
  competitorPrice: number,
  cost: number,
  targetMargin: number,
  minPrice: number,
  maxPrice: number | null
): { newPrice: number; blocked: boolean; reason: string } {
  let newPrice: number;
  let reason: string;

  switch (strategy) {
    case "MATCH_LOWEST":
      newPrice = competitorPrice;
      reason = `Igualou preço do concorrente: R$${competitorPrice.toFixed(2)}`;
      break;
    case "BEAT_LOWEST":
      newPrice = Math.round((competitorPrice * 0.99) * 100) / 100; // 1% abaixo
      reason = `1% abaixo do concorrente: R$${competitorPrice.toFixed(2)}`;
      break;
    case "FIXED_MARGIN":
      newPrice = cost > 0 ? Math.round((cost / (1 - targetMargin / 100)) * 100) / 100 : competitorPrice;
      reason = `Margem fixa de ${targetMargin}% sobre custo R$${cost.toFixed(2)}`;
      break;
    default:
      newPrice = competitorPrice;
      reason = "Estratégia desconhecida";
  }

  // Proteção de preço mínimo
  if (newPrice < minPrice) {
    return { newPrice: minPrice, blocked: true, reason: `Preço calculado R$${newPrice.toFixed(2)} abaixo do mínimo R$${minPrice.toFixed(2)}` };
  }

  // Proteção de preço máximo
  if (maxPrice && newPrice > maxPrice) {
    return { newPrice: maxPrice, blocked: true, reason: `Preço calculado R$${newPrice.toFixed(2)} acima do máximo R$${maxPrice.toFixed(2)}` };
  }

  return { newPrice, blocked: false, reason };
}
