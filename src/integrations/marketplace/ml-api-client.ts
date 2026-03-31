/**
 * Mercado Livre API Client with automatic token refresh.
 * Wraps all ML API calls ensuring a valid access_token.
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface MlTokenData {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

const TOKEN_MARGIN_MS = 5 * 60 * 1000; // refresh 5 min before expiry

async function getIntegration(tenantId: string) {
  const { data, error } = await supabase
    .from("marketplace_integrations")
    .select("id, credentials, status")
    .eq("tenant_id", tenantId)
    .eq("marketplace", "Mercado Livre")
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function refreshToken(tenantId: string): Promise<string> {
  logger.info("ml-api-client: refreshing token", { tenantId });
  const { data, error } = await supabase.functions.invoke("ml-refresh-token", {
    body: { tenantId },
  });
  if (error) {
    logger.error("ml-api-client: refresh failed", { error });
    throw new Error("Token refresh failed");
  }
  // After refresh, re-read the updated token
  const integration = await getIntegration(tenantId);
  const creds = integration?.credentials as unknown as MlTokenData | null;
  if (!creds?.access_token) throw new Error("No access_token after refresh");
  return creds.access_token;
}

async function getValidToken(tenantId: string): Promise<string> {
  const integration = await getIntegration(tenantId);
  if (!integration || integration.status === "disconnected") {
    throw new Error("Mercado Livre não conectado");
  }

  const creds = integration.credentials as unknown as MlTokenData | null;
  if (!creds?.access_token) throw new Error("No access_token found");

  const expiresAt = creds.expires_at ? new Date(creds.expires_at).getTime() : 0;
  const isExpired = Date.now() > expiresAt - TOKEN_MARGIN_MS;

  if (isExpired) {
    return refreshToken(tenantId);
  }
  return creds.access_token;
}

/**
 * Execute an ML API request with automatic token management.
 * Retries once on 401 after refreshing the token.
 */
export async function mlApiFetch(
  tenantId: string,
  url: string,
  init?: RequestInit
): Promise<Response> {
  let token = await getValidToken(tenantId);

  const doFetch = (t: string) =>
    fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
        Authorization: `Bearer ${t}`,
      },
    });

  let res = await doFetch(token);

  // If 401, refresh and retry once
  if (res.status === 401) {
    logger.warn("ml-api-client: 401 received, refreshing token and retrying");
    try {
      token = await refreshToken(tenantId);
      res = await doFetch(token);
    } catch (err) {
      await logFailure(tenantId, url, err);
      throw err;
    }
  }

  if (!res.ok) {
    const body = await res.text();
    logger.error("ml-api-client: request failed", { url, status: res.status, body });
  }

  return res;
}

async function logFailure(tenantId: string, url: string, err: unknown) {
  try {
    await supabase.from("integration_logs").insert({
      tenant_id: tenantId,
      marketplace: "Mercado Livre",
      type: "error",
      message: `API call failed: ${url}`,
      details: { error: String(err) } as any,
    });
  } catch {
    // silent
  }
}
