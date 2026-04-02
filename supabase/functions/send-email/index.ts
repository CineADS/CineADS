import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.cineads.com.br",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// ─── Base layout ─────────────────────────────────────────────────────────────
function baseLayout(content: string, preview = "") {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>CineADS</title>
  ${preview ? `<span style="display:none;max-height:0;overflow:hidden;">${preview}</span>` : ""}
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#1a1a1a;border-radius:12px;overflow:hidden;border:1px solid #2a2a2a;">
          <!-- Header -->
          <tr>
            <td style="background:#111;padding:28px 40px;border-bottom:1px solid #2a2a2a;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                      Cine<span style="color:#e53e3e;">ADS</span>
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size:12px;color:#666;">Hub de Gestão</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#111;padding:24px 40px;border-top:1px solid #2a2a2a;">
              <p style="margin:0;font-size:12px;color:#555;text-align:center;">
                © ${new Date().getFullYear()} CineADS · Hub de Gestão de Marketplaces<br/>
                <a href="https://www.cineads.com.br" style="color:#e53e3e;text-decoration:none;">www.cineads.com.br</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Templates ────────────────────────────────────────────────────────────────
function confirmEmailTemplate(confirmUrl: string, name = "Usuário") {
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:24px;color:#fff;font-weight:700;">Confirme seu email</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#999;line-height:1.6;">
      Olá, <strong style="color:#fff;">${name}</strong>! Bem-vindo ao CineADS.<br/>
      Clique no botão abaixo para ativar sua conta.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
      <tr>
        <td style="background:#e53e3e;border-radius:8px;">
          <a href="${confirmUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#fff;text-decoration:none;">
            Confirmar email
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">
      Ou copie e cole este link no navegador:<br/>
      <a href="${confirmUrl}" style="color:#e53e3e;word-break:break-all;">${confirmUrl}</a>
    </p>
    <p style="margin:24px 0 0;font-size:12px;color:#444;padding:16px;background:#111;border-radius:8px;border-left:3px solid #e53e3e;">
      Se você não criou uma conta no CineADS, pode ignorar este email com segurança.
    </p>
  `, "Confirme seu email para acessar o CineADS")
}

function resetPasswordTemplate(resetUrl: string, name = "Usuário") {
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:24px;color:#fff;font-weight:700;">Redefinir senha</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#999;line-height:1.6;">
      Olá, <strong style="color:#fff;">${name}</strong>!<br/>
      Recebemos uma solicitação para redefinir a senha da sua conta CineADS.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
      <tr>
        <td style="background:#e53e3e;border-radius:8px;">
          <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#fff;text-decoration:none;">
            Redefinir senha
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">
      Ou copie e cole este link no navegador:<br/>
      <a href="${resetUrl}" style="color:#e53e3e;word-break:break-all;">${resetUrl}</a>
    </p>
    <p style="margin:24px 0 0;font-size:12px;color:#444;padding:16px;background:#111;border-radius:8px;border-left:3px solid #f6ad55;">
      ⚠️ Este link expira em <strong style="color:#f6ad55;">1 hora</strong>. Se você não solicitou a redefinição, ignore este email — sua senha permanece a mesma.
    </p>
  `, "Redefina sua senha do CineADS")
}

function welcomeTemplate(name = "Usuário", tenantName = "") {
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:24px;color:#fff;font-weight:700;">Bem-vindo ao CineADS! 🎉</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#999;line-height:1.6;">
      Olá, <strong style="color:#fff;">${name}</strong>!<br/>
      ${tenantName ? `Sua empresa <strong style="color:#fff;">${tenantName}</strong> está configurada e pronta para gerenciar seus marketplaces.` : "Sua conta está ativa e pronta para uso."}
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
      <tr>
        <td style="padding:20px;background:#111;border-radius:10px;border:1px solid #2a2a2a;">
          <p style="margin:0 0 16px;font-size:14px;font-weight:600;color:#fff;">Primeiros passos:</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${[
              ["1", "Conecte sua conta do Mercado Livre em Integrações"],
              ["2", "Importe seus produtos do catálogo"],
              ["3", "Gerencie pedidos em tempo real"],
              ["4", "Configure regras de precificação automática"],
            ].map(([n, text]) => `
              <tr>
                <td style="padding:6px 0;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:28px;height:28px;background:#e53e3e;border-radius:50%;text-align:center;vertical-align:middle;">
                        <span style="font-size:12px;font-weight:700;color:#fff;">${n}</span>
                      </td>
                      <td style="padding-left:12px;font-size:14px;color:#bbb;">${text}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            `).join("")}
          </table>
        </td>
      </tr>
    </table>
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#e53e3e;border-radius:8px;">
          <a href="https://www.cineads.com.br/dashboard" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#fff;text-decoration:none;">
            Acessar plataforma
          </a>
        </td>
      </tr>
    </table>
  `, "Bem-vindo ao CineADS — sua conta está ativa!")
}

function newOrderTemplate(order: { number: string; marketplace: string; customer: string; total: number; items: number; date: string }) {
  const formatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(order.total)
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:24px;color:#fff;font-weight:700;">Novo pedido recebido!</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#999;">
      Um novo pedido chegou em <strong style="color:#fff;">${order.marketplace}</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#111;border-radius:10px;border:1px solid #2a2a2a;overflow:hidden;">
      ${[
        ["Pedido", `#${order.number}`],
        ["Cliente", order.customer],
        ["Marketplace", order.marketplace],
        ["Itens", `${order.items} item(s)`],
        ["Total", formatted],
        ["Data", order.date],
      ].map(([label, value], i) => `
        <tr style="border-top:${i > 0 ? "1px solid #2a2a2a" : "none"};">
          <td style="padding:12px 20px;font-size:13px;color:#666;width:40%;">${label}</td>
          <td style="padding:12px 20px;font-size:13px;color:#fff;font-weight:500;">${value}</td>
        </tr>
      `).join("")}
    </table>
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#e53e3e;border-radius:8px;">
          <a href="https://www.cineads.com.br/orders" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#fff;text-decoration:none;">
            Ver pedido
          </a>
        </td>
      </tr>
    </table>
  `, `Novo pedido #${order.number} — ${formatted}`)
}

function lowStockTemplate(items: Array<{ name: string; sku: string; stock: number; min: number }>) {
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:24px;color:#fff;font-weight:700;">⚠️ Alerta de estoque baixo</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#999;">
      Os seguintes produtos estão com estoque abaixo do mínimo configurado:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-radius:10px;overflow:hidden;border:1px solid #2a2a2a;">
      <tr style="background:#111;">
        <th style="padding:12px 16px;font-size:12px;color:#666;text-align:left;font-weight:600;">PRODUTO</th>
        <th style="padding:12px 16px;font-size:12px;color:#666;text-align:center;font-weight:600;">SKU</th>
        <th style="padding:12px 16px;font-size:12px;color:#f6ad55;text-align:center;font-weight:600;">ESTOQUE</th>
        <th style="padding:12px 16px;font-size:12px;color:#666;text-align:center;font-weight:600;">MÍNIMO</th>
      </tr>
      ${items.map((item, i) => `
        <tr style="background:${i % 2 === 0 ? "#1a1a1a" : "#111"};border-top:1px solid #2a2a2a;">
          <td style="padding:12px 16px;font-size:13px;color:#fff;">${item.name}</td>
          <td style="padding:12px 16px;font-size:12px;color:#666;text-align:center;font-family:monospace;">${item.sku}</td>
          <td style="padding:12px 16px;font-size:13px;color:#f6ad55;font-weight:700;text-align:center;">${item.stock}</td>
          <td style="padding:12px 16px;font-size:13px;color:#555;text-align:center;">${item.min}</td>
        </tr>
      `).join("")}
    </table>
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#e53e3e;border-radius:8px;">
          <a href="https://www.cineads.com.br/stock" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#fff;text-decoration:none;">
            Gerenciar estoque
          </a>
        </td>
      </tr>
    </table>
  `, `${items.length} produto(s) com estoque baixo`)
}

// ─── Send via Resend API ──────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "CineADS <noreply@cineads.com.br>",
      to: [to],
      subject,
      html,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend error: ${err}`)
  }
  return res.json()
}

// ─── Handler ──────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })

  try {
    const body = await req.json()
    const { type, to, data } = body

    if (!type || !to) {
      return new Response(JSON.stringify({ error: "Missing type or to" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    let subject = ""
    let html = ""

    switch (type) {
      case "confirm_email":
        subject = "Confirme seu email — CineADS"
        html = confirmEmailTemplate(data.confirm_url, data.name)
        break
      case "reset_password":
        subject = "Redefinição de senha — CineADS"
        html = resetPasswordTemplate(data.reset_url, data.name)
        break
      case "welcome":
        subject = `Bem-vindo ao CineADS, ${data.name || ""}!`
        html = welcomeTemplate(data.name, data.tenant_name)
        break
      case "new_order":
        subject = `Novo pedido #${data.number} — ${data.marketplace}`
        html = newOrderTemplate(data)
        break
      case "low_stock":
        subject = `⚠️ Alerta: ${data.items?.length} produto(s) com estoque baixo`
        html = lowStockTemplate(data.items)
        break
      default:
        return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
    }

    const result = await sendEmail(to, subject, html)
    return new Response(JSON.stringify({ ok: true, id: result.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (err) {
    console.error("[send-email]", err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
