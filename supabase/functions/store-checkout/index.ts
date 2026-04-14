import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Permite requests da vitrine pública (qualquer origem por enquanto)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutItem {
  product: { id: string; title: string; price: number };
  qty: number;
}

interface CheckoutBody {
  tenant_id: string;
  items: CheckoutItem[];
  customer: { name: string; email: string; phone?: string };
  payment_method: "pix" | "credit_card";
  total: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body: CheckoutBody = await req.json();
    const { tenant_id, items, customer, payment_method, total } = body;

    if (!tenant_id || !items?.length || !customer?.name || !customer?.email || !total) {
      return json({ error: "Dados incompletos" }, 400);
    }

    // Cliente admin — acessa o banco sem RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Busca a API Key do vendedor (fica em store_settings, nunca exposta ao browser)
    const { data: tenant } = await supabase
      .from("tenants")
      .select("store_settings")
      .eq("id", tenant_id)
      .single();

    const apiKey: string | undefined = (tenant?.store_settings as any)?.infinitepay_api_key;

    if (!apiKey) {
      return json({ error: "Pagamento não configurado pelo vendedor" }, 422);
    }

    // Salva o pedido no banco com status "pending"
    const { data: order, error: orderError } = await supabase
      .from("store_orders")
      .insert({
        tenant_id,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone ?? null,
        items: items.map((i) => ({
          product_id: i.product.id,
          title: i.product.title,
          qty: i.qty,
          unit_price: i.product.price,
        })),
        subtotal: total,
        shipping: 0,
        total,
        payment_method,
        status: "pending",
      })
      .select("id")
      .single();

    if (orderError) throw orderError;

    // Abate estoque de forma atômica via função SQL
    for (const item of items) {
      await supabase.rpc("decrement_stock", {
        p_product_id: item.product.id,
        p_tenant_id: tenant_id,
        p_qty: item.qty,
      });
    }

    // ─── Chamada à API InfinitePay ──────────────────────────────────────────
    // Docs: https://docs.infinitepay.io
    // A chave do vendedor é usada aqui no servidor — nunca chega ao browser
    const amountInCents = Math.round(total * 100);

    const ipPayload = {
      amount: amountInCents,
      capture_method: payment_method === "pix" ? "pix" : "credit",
      metadata: {
        origin: "cineads-loja",
        order_id: order.id,
        customer_name: customer.name,
        customer_email: customer.email,
      },
    };

    const ipRes = await fetch("https://api.infinitepay.io/v2/transactions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(ipPayload),
    });

    const ipData = await ipRes.json();

    if (!ipRes.ok) {
      // Pedido criado, mas pagamento falhou — marca para o vendedor revisar
      await supabase
        .from("store_orders")
        .update({ status: "payment_error" })
        .eq("id", order.id);

      console.error("InfinitePay error:", ipData);
      return json({ error: "Erro ao processar pagamento. Tente novamente." }, 422);
    }

    // Salva o ID da transação no pedido
    const transactionId = ipData.id ?? ipData.transaction_id;
    const pixCode = ipData.pix?.qr_code ?? null;
    const pixQrImage = ipData.pix?.qr_code_image ?? null;
    const paymentUrl = ipData.payment_link ?? ipData.checkout_url ?? null;

    await supabase
      .from("store_orders")
      .update({
        payment_transaction_id: transactionId,
        pix_code: pixCode,
        payment_url: paymentUrl,
        status: "awaiting_payment",
      })
      .eq("id", order.id);

    return json({
      order_id: order.id,
      payment_method,
      pix_code: pixCode,
      pix_qr_image: pixQrImage,
      payment_url: paymentUrl,
    });
  } catch (err) {
    console.error("store-checkout:", err);
    return json({ error: "Erro interno. Tente novamente." }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
