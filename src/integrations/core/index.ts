/**
 * Integration Core — bootstrap da camada de integração.
 * Registra adapters de marketplace e handlers de webhook.
 */
import { syncEngine } from "./sync-engine";
import { webhookManager } from "./webhook-manager";
import { mercadoLivreAdapter } from "../marketplace/mercado-livre.integration";
import { logger } from "@/lib/logger";

let initialized = false;

export function initializeIntegrations(): void {
  if (initialized) return;

  // Register marketplace adapters
  syncEngine.registerAdapter(mercadoLivreAdapter);

  // Register default webhook handlers
  webhookManager.registerDefaults();

  initialized = true;
  logger.info("Integrations initialized", {
    marketplaces: syncEngine.getRegisteredMarketplaces(),
  });
}

export { syncEngine } from "./sync-engine";
export { smartSync } from "./smart-sync";
export { webhookManager } from "./webhook-manager";
export { retryEngine } from "./retry-engine";
