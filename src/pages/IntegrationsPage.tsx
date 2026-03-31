import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ExternalLink, Loader2, RefreshCw, Unplug } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useMercadoLivreIntegration } from "@/hooks/useMercadoLivreIntegration";
import { toast } from "@/hooks/use-toast";
import { ML_CONFIG } from "@/lib/mlConfig";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import logoMercadoLivre from "@/assets/logos/mercadolivre.png";
import logoShopee from "@/assets/logos/shopee.png";
import logoAmazon from "@/assets/logos/amazon.png";
import logoMagalu from "@/assets/logos/magalu.png";
import logoAmericanas from "@/assets/logos/americanas.png";
import logoShopify from "@/assets/logos/shopify.png";

const otherMarketplaces = [
  { name: "Shopee", logo: logoShopee, description: "Marketplace em rápido crescimento no Brasil" },
  { name: "Amazon", logo: logoAmazon, description: "Marketplace global com presença no Brasil" },
  { name: "Magalu", logo: logoMagalu, description: "Magazine Luiza marketplace" },
  { name: "Americanas", logo: logoAmericanas, description: "B2W Digital marketplace" },
  { name: "Shopify", logo: logoShopify, description: "Plataforma de e-commerce própria" },
];

function MercadoLivreCard() {
  const { profile } = useAuth();
  const { isConnected, isError, nickname, autoSync, integration, refetch } = useMercadoLivreIntegration();
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const queryClient = useQueryClient();

  const handleConnect = () => {
    if (!profile?.tenant_id) {
      toast({
        title: "Sessão não pronta",
        description: "Aguarde alguns segundos e tente conectar novamente.",
        variant: "destructive",
      });
      return;
    }

    const authUrl = `${ML_CONFIG.authUrl}?response_type=code&client_id=${ML_CONFIG.clientId}&redirect_uri=${encodeURIComponent(ML_CONFIG.redirectUri)}&state=${profile.tenant_id}`;
    window.location.href = authUrl;
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ml-sync-orders", {
        body: { tenantId: profile?.tenant_id },
      });
      if (error) throw error;
      toast({
        title: "Sincronização concluída",
        description: `${data?.synced || 0} novo(s) pedido(s) importado(s)`,
      });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch {
      toast({ title: "Erro na sincronização", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleAutoSync = async (checked: boolean) => {
    if (!integration) return;
    const settings = (integration.settings as Record<string, any>) || {};
    await supabase
      .from("marketplace_integrations")
      .update({ settings: { ...settings, auto_sync: checked } })
      .eq("id", integration.id);
    refetch();
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      if (integration) {
        await supabase.from("marketplace_integrations").delete().eq("id", integration.id);
      }
      toast({ title: "Mercado Livre desconectado" });
      refetch();
    } catch {
      toast({ title: "Erro ao desconectar", variant: "destructive" });
    } finally {
      setDisconnecting(false);
    }
  };

  const statusBadge = isConnected
    ? { label: "Conectado", className: "bg-success/15 text-success border-success/30" }
    : isError
    ? { label: "Erro", className: "bg-destructive/15 text-destructive border-destructive/30" }
    : { label: "Desconectado", className: "bg-muted text-muted-foreground border-border" };

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white border border-border p-2 w-12 h-12 flex items-center justify-center shrink-0">
            <img src={logoMercadoLivre} alt="Mercado Livre" className="max-w-full max-h-full object-contain" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Mercado Livre</h3>
            <p className="text-xs text-muted-foreground">
              {isConnected && nickname ? `@${nickname}` : "Maior marketplace da América Latina"}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={`text-xs ${statusBadge.className}`}>
          {statusBadge.label}
        </Badge>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        {isConnected ? (
          <>
            <div className="flex items-center gap-2">
              <Switch checked={autoSync} onCheckedChange={handleToggleAutoSync} />
              <span className="text-xs text-muted-foreground">Sincronização automática</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}>
                {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                <span className="ml-1">Sincronizar</span>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                    <Unplug className="h-3 w-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Desconectar Mercado Livre?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso removerá a conexão e parará a sincronização automática. Você poderá reconectar a qualquer momento.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDisconnect} disabled={disconnecting}>
                      {disconnecting ? "Desconectando..." : "Desconectar"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Switch disabled />
              <span className="text-xs text-muted-foreground">Sincronização</span>
            </div>
            <Button size="sm" onClick={handleConnect}>
              Conectar <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Marketplaces</h1>
        <p className="text-sm text-muted-foreground">Gerencie suas integrações com marketplaces</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MercadoLivreCard />

        {otherMarketplaces.map((mp) => (
          <div key={mp.name} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white border border-border p-2 w-12 h-12 flex items-center justify-center shrink-0">
                  <img src={mp.logo} alt={mp.name} className="max-w-full max-h-full object-contain" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{mp.name}</h3>
                  <p className="text-xs text-muted-foreground">{mp.description}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                Em breve
              </Badge>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Switch disabled />
                <span className="text-xs text-muted-foreground">Sincronização</span>
              </div>
              <Button size="sm" variant="outline" disabled>
                Conectar <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Próximas integrações: Shopee → Amazon → Magalu. Conecte o Mercado Livre para começar!
        </p>
      </div>
    </div>
  );
}
