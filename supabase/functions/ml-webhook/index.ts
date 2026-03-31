import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { resource, topic, user_id, application_id } = body;

    console.log("ML webhook received:", JSON.stringify({ topic, resource, user_id }));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find tenant by ML user_id stored in credentials
    const { data: integrations } = await supabase
      .from("marketplace_integrations")
      .select("id, tenant_id, credentials")
      .eq("marketplace", "Mercado Livre")
      .eq("status", "connected");

    const integration = (integrations || []).find((i: any) => {
      const creds = i.credentials as Record<string, string>;
      return creds?.ml_user_id === String(user_id);
    });

    if (!integration) {
      console.warn("No integration found for ML user_id:", user_id);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantId = integration.tenant_id;
    let jobType = "";
    let jobPayload: Record<string, unknown> = { resource, topic, user_id };

    switch (topic) {
      case "orders_v2":
      case "orders":
        jobType = "SYNC_ORDERS";
        jobPayload.orderId = resource.replace("/orders/", "");
        break;

      case "items":
        jobType = "SYNC_LISTING";
        jobPayload.itemId = resource.replace("/items/", "");
        break;

      case "shipments":
        jobType = "SYNC_SHIPMENT";
        jobPayload.shipmentId = resource.replace("/shipments/", "");
        break;

      case "questions":
        jobType = "SYNC_QUESTIONS";
        break;

      default:
        console.log("Unhandled ML webhook topic:", topic);
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Enqueue sync job
    await supabase.from("sync_jobs").insert({
      tenant_id: tenantId,
      marketplace: "Mercado Livre",
      type: jobType,
      priority: topic === "orders_v2" || topic === "orders" ? "HIGH" : "MEDIUM",
      payload: jobPayload,
    });

    await supabase.from("integration_logs").insert({
      tenant_id: tenantId,
      marketplace: "Mercado Livre",
      type: "info",
      message: `Webhook recebido: ${topic}`,
      details: { resource, topic },
    });

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ml-webhook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
