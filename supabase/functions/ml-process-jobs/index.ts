import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * ml-process-jobs
 * Processa a fila sync_jobs inserida pelo ml-webhook.
 * Chamada a cada 2 minutos via pg_cron (service role).
 * Processa até 20 jobs por execução para não exceder o timeout.
 */

const STATUS_MAP: Record<string, string> = {
  payment_required:  "pending",
  payment_in_process:"pending",
  paid:              "paid",
  partially_paid:    "paid",
  confirmed:         "processing",
  cancelled:         "cancelled",
};

async function mlFetch(url: string, token: string): Promise<Response> {
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } });
}

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

async function processOrderJob(
  supabase: ReturnType<typeof createClient>,
  job: { id: string; tenant_id: string; payload: Record<string, unknown> }
): Promise<void> {
  const { tenant_id: tenantId, payload } = job;
  const mlOrderId = payload.orderId as string;

  const { data: integration } = await supabase
    .from("marketplace_integrations")
    .select("id, credentials")
    .eq("tenant_id", tenantId)
    .eq("marketplace", "Mercado Livre")
    .maybeSingle();

  if (!integration) throw new Error("Integration not found");

  const token = await getValidToken(supabase, integration as { id: string; credentials: Record<string, string> });
  const res   = await mlFetch(`https://api.mercadolibre.com/orders/${mlOrderId}`, token);

  if (!res.ok) throw new Error(`ML orders/${mlOrderId} returned ${res.status}`);

  const mlOrder = await res.json();
  const orderNumber = `ML-${mlOrder.id}`;
  const status      = STATUS_MAP[mlOrder.status] ?? "pending";

  const { data: existing } = await supabase
    .from("orders")
    .select("id, status")
    .eq("tenant_id", tenantId)
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (existing) {
    if (existing.status !== status) {
      await supabase.from("orders").update({ status }).eq("id", existing.id);
      await supabase.from("order_timeline").insert({
        order_id: existing.id, status,
        message: `Status atualizado via webhook: ${mlOrder.status}`,
      });
    }
    return;
  }

  const buyer = mlOrder.buyer ?? {};
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

  if (!newOrder) return;

  for (const item of mlOrder.order_items ?? []) {
    await supabase.from("order_items").insert({
      order_id: newOrder.id,
      title:    item.item?.title,
      quantity: item.quantity,
      price:    item.unit_price,
    });
  }

  await supabase.from("order_timeline").insert({
    order_id: newOrder.id, status,
    message: "Pedido recebido via webhook do Mercado Livre",
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");

  const supabaseUrl    = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Apenas service role pode chamar esta função
  const auth = req.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Pega até 20 jobs pendentes, priorizando HIGH
  const { data: jobs } = await supabase
    .from("sync_jobs")
    .select("id, tenant_id, type, payload, retry_count, max_retries")
    .eq("status", "pending")
    .eq("type", "SYNC_ORDERS")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(20);

  if (!jobs || jobs.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }

  let processed = 0;
  let failed    = 0;

  for (const job of jobs) {
    // Marca como "running" para evitar processamento duplicado
    await supabase.from("sync_jobs")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", job.id);

    try {
      await processOrderJob(supabase, job as { id: string; tenant_id: string; payload: Record<string, unknown> });
      await supabase.from("sync_jobs")
        .update({ status: "done", processed_at: new Date().toISOString() })
        .eq("id", job.id);
      processed++;
    } catch (err) {
      const retryCount = (job.retry_count ?? 0) + 1;
      const maxRetries = job.max_retries ?? 3;
      const newStatus  = retryCount >= maxRetries ? "failed" : "pending";

      await supabase.from("sync_jobs").update({
        status:        newStatus,
        retry_count:   retryCount,
        error_message: String(err),
        updated_at:    new Date().toISOString(),
      }).eq("id", job.id);

      console.error(`[ml-process-jobs] Job ${job.id} failed:`, err);
      failed++;
    }
  }

  return new Response(JSON.stringify({ processed, failed, total: jobs.length }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
});
