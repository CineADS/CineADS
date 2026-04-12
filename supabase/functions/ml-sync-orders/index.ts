import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.cineads.com.br",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const STATUS_MAP: Record<string, string> = {
  payment_required:  "pending",
  payment_in_process:"pending",
  paid:              "paid",
  partially_paid:    "paid",
  confirmed:         "processing",
  shipped:           "shipped",
  delivered:         "delivered",
  cancelled:         "cancelled",
  invalid:           "cancelled",
  null_transaction:  "cancelled",
};

// ─── ML fetch with rate-limit retry ────────────────────────────────────────
async function mlFetch(url: string, token: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 60_000 * (i + 1)));
      continue;
    }
    return res;
  }
  throw new Error("ML rate limit exceeded");
}

// ─── Token refresh ──────────────────────────────────────────────────────────
async function getValidToken(
  supabase: ReturnType<typeof createClient>,
  integration: { id: string; credentials: Record<string, string> }
): Promise<string> {
  const creds = integration.credentials;
  if (!creds.expires_at || new Date(creds.expires_at) > new Date()) {
    return creds.access_token;
  }

  const res = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      client_id:     Deno.env.get("ML_CLIENT_ID")!,
      client_secret: Deno.env.get("ML_CLIENT_SECRET")!,
      refresh_token: creds.refresh_token,
    }),
  });

  const tokens = await res.json();
  if (!tokens.access_token) {
    await supabase.from("marketplace_integrations")
      .update({ status: "error" }).eq("id", integration.id);
    throw new Error("Token refresh failed");
  }

  await supabase.from("marketplace_integrations").update({
    credentials: {
      ...creds,
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at:    new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    },
    status: "connected",
  }).eq("id", integration.id);

  return tokens.access_token;
}

// ─── Upsert single ML order ─────────────────────────────────────────────────
async function upsertOrder(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  mlOrder: Record<string, unknown>
): Promise<"created" | "updated" | "skipped"> {
  const orderNumber = `ML-${mlOrder.id}`;
  const status      = STATUS_MAP[mlOrder.status as string] ?? "pending";

  const { data: existing } = await supabase
    .from("orders")
    .select("id, status")
    .eq("tenant_id", tenantId)
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (existing) {
    // Atualiza apenas status se mudou
    if (existing.status !== status) {
      await supabase.from("orders").update({ status }).eq("id", existing.id);
      await supabase.from("order_timeline").insert({
        order_id: existing.id, status,
        message: `Status atualizado via sync: ${mlOrder.status}`,
      });
      return "updated";
    }
    return "skipped";
  }

  const buyer  = mlOrder.buyer as Record<string, unknown> ?? {};
  const { data: newOrder } = await supabase.from("orders").insert({
    tenant_id:    tenantId,
    order_number: orderNumber,
    marketplace:  "Mercado Livre",
    status,
    total:        mlOrder.total_amount,
    created_at:   mlOrder.date_created,
    customer: {
      name:  `${buyer.first_name ?? ""} ${buyer.last_name ?? ""}`.trim() || "Cliente",
      ml_id: buyer.id,
    },
  }).select().single();

  if (!newOrder) return "skipped";

  const items = (mlOrder.order_items as unknown[]) ?? [];
  for (const item of items) {
    const i = item as Record<string, unknown>;
    const itemData = i.item as Record<string, unknown> ?? {};
    await supabase.from("order_items").insert({
      order_id: newOrder.id,
      title:    itemData.title,
      quantity: i.quantity,
      price:    i.unit_price,
    });
  }

  await supabase.from("order_timeline").insert({
    order_id: newOrder.id, status,
    message: "Pedido importado do Mercado Livre",
  });

  return "created";
}

// ─── Sync all orders for a tenant (paginated) ───────────────────────────────
async function syncTenant(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  daysBack: number
): Promise<{ created: number; updated: number; total: number }> {
  const { data: integration } = await supabase
    .from("marketplace_integrations")
    .select("id, credentials")
    .eq("tenant_id", tenantId)
    .eq("marketplace", "Mercado Livre")
    .maybeSingle();

  if (!integration) throw new Error("Integration not found");

  const token    = await getValidToken(supabase, integration as { id: string; credentials: Record<string, string> });
  const creds    = integration.credentials as Record<string, string>;
  const since    = new Date(Date.now() - daysBack * 86_400_000).toISOString();
  const LIMIT    = 50;
  let offset     = 0;
  let totalFound = 0;
  let created    = 0;
  let updated    = 0;

  do {
    const url = `https://api.mercadolibre.com/orders/search?seller=${creds.ml_user_id}&sort=date_desc&order.date_created.from=${since}&limit=${LIMIT}&offset=${offset}`;
    const res = await mlFetch(url, token);

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`ML API ${res.status}: ${err}`);
    }

    const data     = await res.json();
    totalFound     = data.paging?.total ?? (data.results?.length ?? 0);
    const orders   = data.results ?? [];

    for (const mlOrder of orders) {
      const result = await upsertOrder(supabase, tenantId, mlOrder);
      if (result === "created") created++;
      if (result === "updated") updated++;
    }

    offset += LIMIT;
  } while (offset < totalFound);

  return { created, updated, total: totalFound };
}

// ─── Handler ────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl      = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader       = req.headers.get("Authorization") ?? "";
    const cronSecret       = Deno.env.get("CRON_SECRET");
    const isServiceRole    = (cronSecret && authHeader === `Bearer ${cronSecret}`)
                          || authHeader === `Bearer ${serviceRoleKey}`;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let tenantId: string;
    let daysBack = 1;

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    daysBack = Number(body.daysBack ?? 1);

    if (isServiceRole) {
      // Chamada interna (pg_cron) — tenantId obrigatório no body
      tenantId = body.tenantId as string;
      if (!tenantId) {
        return new Response(JSON.stringify({ error: "tenantId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Chamada do frontend — valida JWT
      if (!authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error } = await callerClient.auth.getUser();
      if (error || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profile } = await supabase
        .from("profiles").select("tenant_id").eq("id", user.id).maybeSingle();

      tenantId = body.tenantId as string;
      if (!profile || profile.tenant_id !== tenantId) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const stats = await syncTenant(supabase, tenantId, daysBack);

    await supabase.from("integration_logs").insert({
      tenant_id: tenantId,
      marketplace: "Mercado Livre",
      type: "success",
      message: `Sync concluído: ${stats.created} novo(s), ${stats.updated} atualizado(s) de ${stats.total} pedido(s)`,
      details: stats,
    });

    return new Response(JSON.stringify({ success: true, ...stats }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[ml-sync-orders]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
