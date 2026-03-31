import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useParams, Link } from "react-router-dom";
import { marketplaceHealthService, type MarketplaceHealthDTO } from "@/services/marketplace-health.service";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Clock, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import logoMercadoLivre from "@/assets/logos/mercadolivre.png";
import logoShopee from "@/assets/logos/shopee.png";
import logoAmazon from "@/assets/logos/amazon.png";
import logoMagalu from "@/assets/logos/magalu.png";
import logoAmericanas from "@/assets/logos/americanas.png";
import logoShopify from "@/assets/logos/shopify.png";

const logos: Record<string, string> = {
  "Mercado Livre": logoMercadoLivre,
  Shopee: logoShopee,
  Amazon: logoAmazon,
  Magalu: logoMagalu,
  Americanas: logoAmericanas,
  Shopify: logoShopify,
};

const marketplaceSlugMap: Record<string, string> = {
  "mercado-livre": "Mercado Livre",
  shopee: "Shopee",
  amazon: "Amazon",
  magalu: "Magalu",
  americanas: "Americanas",
  shopify: "Shopify",
};

function StatusIcon({ ok, warning }: { ok: boolean; warning?: boolean }) {
  if (ok) return <CheckCircle2 className="h-5 w-5 text-success" />;
  if (warning) return <AlertTriangle className="h-5 w-5 text-warning" />;
  return <XCircle className="h-5 w-5 text-destructive" />;
}

function HealthRow({ label, ok, detail, warning }: { label: string; ok: boolean; detail?: string; warning?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <StatusIcon ok={ok} warning={warning} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
    </div>
  );
}

function formatDate(d: string | null) {
  if (!d) return "Nunca";
  return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export default function MarketplaceHealthPage() {
  const { profile } = useAuth();
  const { marketplace: slug } = useParams<{ marketplace: string }>();
  const marketplace = slug ? marketplaceSlugMap[slug] : undefined;

  const { data: health, isLoading } = useQuery({
    queryKey: ["marketplace-health", profile?.tenant_id, marketplace],
    queryFn: () => marketplaceHealthService.getHealth(profile!.tenant_id!, marketplace!),
    enabled: !!profile?.tenant_id && !!marketplace,
    refetchInterval: 30_000,
  });

  if (!marketplace) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Marketplace não encontrado.</p>
        <Link to="/integrations" className="text-primary text-sm mt-2 inline-block">← Voltar</Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const h = health!;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/integrations" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="rounded-lg bg-white border border-border p-2 w-10 h-10 flex items-center justify-center">
          <img src={logos[marketplace]} alt={marketplace} className="max-w-full max-h-full object-contain" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{marketplace}</h1>
          <p className="text-sm text-muted-foreground">Diagnóstico de saúde da integração</p>
        </div>
        {h.nickname && (
          <Badge variant="outline" className="ml-auto text-xs">
            Conta: {h.nickname}
          </Badge>
        )}
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 text-center">
          <StatusIcon ok={h.connected} />
          <p className="text-sm font-semibold mt-2">{h.connected ? "Conectado" : "Desconectado"}</p>
          <p className="text-xs text-muted-foreground">Status da conta</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 text-center">
          <StatusIcon ok={h.tokenValid} warning={h.connected && !h.tokenValid} />
          <p className="text-sm font-semibold mt-2">{h.tokenValid ? "Token válido" : "Token inválido"}</p>
          <p className="text-xs text-muted-foreground">
            {h.tokenExpiresAt ? `Expira: ${formatDate(h.tokenExpiresAt)}` : "Sem token"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 text-center">
          {h.errorsLast24h === 0 ? (
            <CheckCircle2 className="h-5 w-5 text-success mx-auto" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-warning mx-auto" />
          )}
          <p className="text-sm font-semibold mt-2">{h.errorsLast24h} erros</p>
          <p className="text-xs text-muted-foreground">Últimas 24h</p>
        </div>
      </div>

      {/* Detailed Health Checks */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">Verificações de Saúde</h3>
        <HealthRow label="Conexão OAuth" ok={h.connected} detail={h.connected ? "Ativo" : "Não conectado"} />
        <HealthRow label="Token de Acesso" ok={h.tokenValid} warning={h.connected && !h.tokenValid} detail={h.tokenValid ? "Válido" : "Expirado ou ausente"} />
        <HealthRow label="Categorias Sincronizadas" ok={h.categoriesSynced > 0} detail={`${h.categoriesSynced} mapeadas`} />
        <HealthRow label="Acesso à API de Anúncios" ok={h.listingsAccessible} detail={`${h.activeListings} ativos`} />
        <HealthRow label="Acesso à API de Pedidos" ok={h.ordersAccessible} detail={`${h.ordersSynced} sincronizados`} />
        <HealthRow label="Webhook Ativo" ok={h.webhookActive} detail={h.webhookActive ? "Recebendo eventos" : "Inativo"} />
      </div>

      {/* Sync Timestamps */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">Últimas Sincronizações</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Categorias</p>
              <p className="text-xs text-muted-foreground">{formatDate(h.lastCategorySync)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Pedidos</p>
              <p className="text-xs text-muted-foreground">{formatDate(h.lastOrderSync)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
