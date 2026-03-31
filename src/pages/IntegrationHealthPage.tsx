import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, Clock, RefreshCw, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import logoMercadoLivre from "@/assets/logos/mercadolivre.png";
import logoShopee from "@/assets/logos/shopee.png";
import logoAmazon from "@/assets/logos/amazon.png";
import logoMagalu from "@/assets/logos/magalu.png";
import logoAmericanas from "@/assets/logos/americanas.png";
import logoShopify from "@/assets/logos/shopify.png";

const logos: Record<string, string> = { "Mercado Livre": logoMercadoLivre, Shopee: logoShopee, Amazon: logoAmazon, Magalu: logoMagalu, Americanas: logoAmericanas, Shopify: logoShopify };

const slugMap: Record<string, string> = { "Mercado Livre": "mercado-livre", Shopee: "shopee", Amazon: "amazon", Magalu: "magalu", Americanas: "americanas", Shopify: "shopify" };

const statusConfig = {
  connected: { label: "Conectado", icon: CheckCircle2, color: "text-success", bg: "bg-success/15 border-success/30" },
  error: { label: "Erro", icon: XCircle, color: "text-destructive", bg: "bg-destructive/15 border-destructive/30" },
  syncing: { label: "Sincronizando", icon: Clock, color: "text-warning", bg: "bg-warning/15 border-warning/30" },
  disconnected: { label: "Desconectado", icon: XCircle, color: "text-muted-foreground", bg: "bg-muted border-border" },
};

const typeColors: Record<string, string> = { error: "text-destructive", warning: "text-warning", info: "text-info", success: "text-success" };

export default function IntegrationHealthPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: integrations } = useQuery({
    queryKey: ["integrations-health", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase.from("marketplace_integrations").select("*").eq("tenant_id", profile.tenant_id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ["integration-logs", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase.from("integration_logs").select("*").eq("tenant_id", profile.tenant_id).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.tenant_id,
  });

  const resolveLog = async (logId: string) => {
    await supabase.from("integration_logs").update({ resolved: true }).eq("id", logId);
    toast.success("Log marcado como resolvido");
    queryClient.invalidateQueries({ queryKey: ["integration-logs"] });
  };

  const allMarketplaces = ["Mercado Livre", "Shopee", "Amazon", "Magalu", "Americanas", "Shopify"];
  const marketplaceData = allMarketplaces.map((name) => {
    const int = (integrations || []).find((i) => i.marketplace === name);
    return { name, status: (int?.status || "disconnected") as keyof typeof statusConfig, logo: logos[name] };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Status das Integrações</h1>
        <p className="text-sm text-muted-foreground">Monitore a saúde de cada integração</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {marketplaceData.map((int) => {
          const cfg = statusConfig[int.status];
          const StatusIcon = cfg.icon;
          return (
            <Link
              key={int.name}
              to={`/integrations/${slugMap[int.name]}/health`}
              className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-white border border-border p-1.5 w-9 h-9 flex items-center justify-center shrink-0">
                    <img src={int.logo} alt={int.name} className="max-w-full max-h-full object-contain" />
                  </div>
                  <h3 className="font-semibold text-sm">{int.name}</h3>
                </div>
                <Badge variant="outline" className={`text-xs gap-1 ${cfg.bg} ${cfg.color}`}>
                  <StatusIcon className="h-3 w-3" /> {cfg.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Clique para ver diagnóstico completo →</p>
            </Link>
          );
        })}
      </div>

      {/* Logs */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Log de Eventos</h3>
        {logsLoading ? (
          <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : (logs || []).length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-success mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum erro de integração registrado. Tudo funcionando!</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Marketplace</TableHead><TableHead>Tipo</TableHead><TableHead>Mensagem</TableHead><TableHead className="w-24">Ação</TableHead></TableRow></TableHeader>
              <TableBody>
                {(logs || []).map((log: any) => (
                  <TableRow key={log.id} className={log.resolved ? "opacity-50" : ""}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}</TableCell>
                    <TableCell className="text-sm">{log.marketplace}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-xs ${typeColors[log.type] || ""}`}>{log.type}</Badge></TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{log.message}</TableCell>
                    <TableCell>
                      {!log.resolved && log.type === "error" && (
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => resolveLog(log.id)}>
                          <RefreshCw className="h-3 w-3 mr-1" /> Retentar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
