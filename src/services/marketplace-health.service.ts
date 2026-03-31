/**
 * Marketplace Health Service
 * Centralized health checks for marketplace integrations.
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface MarketplaceHealthDTO {
  marketplace: string;
  connected: boolean;
  tokenValid: boolean;
  tokenExpiresAt: string | null;
  nickname: string | null;
  categoriesSynced: number;
  listingsAccessible: boolean;
  activeListings: number;
  ordersAccessible: boolean;
  ordersSynced: number;
  webhookActive: boolean;
  lastCategorySync: string | null;
  lastOrderSync: string | null;
  errorsLast24h: number;
}

const SUPPORTED_MARKETPLACES = [
  "Mercado Livre",
  "Shopee",
  "Amazon",
  "Magalu",
  "Americanas",
  "Shopify",
] as const;

export const marketplaceHealthService = {
  async getHealth(tenantId: string, marketplace: string): Promise<MarketplaceHealthDTO> {
    logger.debug("marketplaceHealthService.getHealth", { tenantId, marketplace });

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [integrationRes, categoriesRes, listingsRes, ordersRes, syncStateRes, errorsRes] =
      await Promise.all([
        supabase
          .from("marketplace_integrations")
          .select("id, status, credentials, settings, updated_at")
          .eq("tenant_id", tenantId)
          .eq("marketplace", marketplace)
          .maybeSingle(),
        supabase
          .from("category_mappings")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("marketplace", marketplace),
        supabase
          .from("marketplace_listings")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("marketplace", marketplace)
          .eq("status", "active"),
        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("marketplace", marketplace),
        supabase
          .from("sync_state")
          .select("entity, last_synced_at")
          .eq("tenant_id", tenantId)
          .eq("marketplace", marketplace),
        supabase
          .from("integration_logs")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("marketplace", marketplace)
          .eq("type", "error")
          .eq("resolved", false)
          .gte("created_at", since24h),
      ]);

    const integration = integrationRes.data;
    const creds = integration?.credentials as Record<string, string> | null;
    const settings = integration?.settings as Record<string, any> | null;

    const expiresAt = creds?.expires_at ? new Date(creds.expires_at).getTime() : 0;
    const tokenValid = integration?.status === "connected" && Date.now() < expiresAt;

    const syncStates = syncStateRes.data || [];
    const categorySync = syncStates.find((s: any) => s.entity === "categories");
    const orderSync = syncStates.find((s: any) => s.entity === "orders");

    return {
      marketplace,
      connected: integration?.status === "connected",
      tokenValid,
      tokenExpiresAt: creds?.expires_at || null,
      nickname: creds?.ml_nickname || settings?.nickname || null,
      categoriesSynced: categoriesRes.count || 0,
      listingsAccessible: (listingsRes.count || 0) > 0 || integration?.status === "connected",
      activeListings: listingsRes.count || 0,
      ordersAccessible: (ordersRes.count || 0) > 0 || integration?.status === "connected",
      ordersSynced: ordersRes.count || 0,
      webhookActive: settings?.webhook_active === true || integration?.status === "connected",
      lastCategorySync: categorySync?.last_synced_at || null,
      lastOrderSync: orderSync?.last_synced_at || null,
      errorsLast24h: errorsRes.count || 0,
    };
  },

  async getAllHealth(tenantId: string): Promise<MarketplaceHealthDTO[]> {
    const results = await Promise.all(
      SUPPORTED_MARKETPLACES.map((m) => this.getHealth(tenantId, m))
    );
    return results;
  },

  getSupportedMarketplaces() {
    return [...SUPPORTED_MARKETPLACES];
  },
};
