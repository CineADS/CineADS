import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { tenantId, newStock } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: integration } = await supabase
      .from("marketplace_integrations")
      .select("id, credentials")
      .eq("tenant_id", tenantId)
      .eq("marketplace", "Mercado Livre")
      .single();

    if (!integration) {
      return new Response(
        JSON.stringify({ error: "Integration not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const creds = integration.credentials as Record<string, string>;

    const { data: listings } = await supabase
      .from("marketplace_listings")
      .select("listing_id")
      .eq("integration_id", integration.id)
      .not("listing_id", "is", null);

    let updated = 0;
    for (const listing of listings || []) {
      const res = await fetch(
        `https://api.mercadolibre.com/items/${listing.listing_id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${creds.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ available_quantity: newStock }),
        }
      );
      if (res.ok) updated++;
      else {
        const errText = await res.text();
        console.error(`Failed to update ${listing.listing_id}:`, res.status, errText);
      }
    }

    return new Response(
      JSON.stringify({ success: true, updated }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("ml-sync-stock error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
