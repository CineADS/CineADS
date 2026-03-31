import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, CheckCircle2, ExternalLink, Settings } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const emailNotifTypes = [
  { key: "stock_critical_email", label: "Estoque crítico", desc: "Quando um produto atinge o estoque mínimo" },
  { key: "listing_paused_email", label: "Anúncio pausado", desc: "Quando um anúncio é pausado no marketplace" },
  { key: "order_delayed_email", label: "Pedido sem movimentação", desc: "Pedidos parados há mais de 48h" },
  { key: "integration_error_email", label: "Erro de integração", desc: "Falhas de sincronização com marketplaces" },
  { key: "order_risk_email", label: "Risco de cancelamento", desc: "Pedidos que podem ser cancelados" },
];

export default function NotificationsSettingsPage() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("notifications");
  const [emailForAlerts, setEmailForAlerts] = useState(profile?.email || "");
  const [frequency, setFrequency] = useState("immediate");
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(emailNotifTypes.map((t) => [t.key, true]))
  );

  // Fetch existing notification settings
  const { data: settings } = useQuery({
    queryKey: ["notification-settings", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("notification_settings" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (settings) {
      setEmailForAlerts(settings.alert_email || profile?.email || "");
      setFrequency(settings.frequency || "immediate");
      const newToggles: Record<string, boolean> = {};
      emailNotifTypes.forEach((nt) => {
        newToggles[nt.key] = settings[nt.key] !== undefined ? settings[nt.key] : true;
      });
      setToggles(newToggles);
    }
  }, [settings, profile?.email]);

  const saveSettings = useMutation({
    mutationFn: async () => {
      if (!user?.id || !profile?.tenant_id) return;
      const payload = {
        user_id: user.id,
        tenant_id: profile.tenant_id,
        alert_email: emailForAlerts,
        frequency,
        ...toggles,
      };
      const { error } = await supabase
        .from("notification_settings" as any)
        .upsert(payload as any, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
      toast.success("Configurações salvas!");
    },
    onError: (err: any) => toast.error("Erro: " + err.message),
  });

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id || !user?.id) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id && !!user?.id,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user?.id || !profile?.tenant_id) return;
      const unread = (notifications || []).filter((n) => !n.read);
      for (const n of unread) {
        await supabase.from("notifications").update({ read: true }).eq("id", n.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Todas marcadas como lidas");
    },
  });

  const unreadCount = (notifications || []).filter((n) => !n.read).length;

  const typeConfig: Record<string, string> = {
    order: "bg-primary/15 text-primary border-primary/30",
    stock: "bg-warning/15 text-warning border-warning/30",
    system: "bg-muted text-muted-foreground border-border",
    alert: "bg-destructive/15 text-destructive border-destructive/30",
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notificações</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} não lida(s)` : "Todas lidas"}
          </p>
        </div>
        {tab === "notifications" && unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
            <CheckCircle2 className="mr-1 h-3 w-3" /> Marcar todas como lidas
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="notifications">
            <Bell className="mr-1.5 h-3.5 w-3.5" /> Notificações
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-1.5 h-3.5 w-3.5" /> Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (notifications || []).length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-lg font-medium">Nenhuma notificação</p>
              <p className="text-sm text-muted-foreground">Você será notificado sobre eventos importantes.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(notifications || []).map((n: any) => (
                <div
                  key={n.id}
                  className={`rounded-xl border bg-card p-4 flex items-start gap-3 transition-colors ${
                    n.read ? "border-border opacity-70" : "border-primary/30 bg-primary/5"
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    <Bell className={`h-4 w-4 ${n.read ? "text-muted-foreground" : "text-primary"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{n.title}</span>
                      <Badge variant="outline" className={`text-[10px] ${typeConfig[n.type] || typeConfig.system}`}>
                        {n.type}
                      </Badge>
                    </div>
                    {n.message && <p className="text-sm text-muted-foreground">{n.message}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(n.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {n.link && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={n.link}><ExternalLink className="h-3 w-3" /></a>
                      </Button>
                    )}
                    {!n.read && (
                      <Button variant="ghost" size="sm" onClick={() => markRead.mutate(n.id)}>
                        <CheckCircle2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-6 space-y-6">
            <div>
              <h3 className="font-semibold mb-1">Configurações de Email</h3>
              <p className="text-xs text-muted-foreground">Defina quais alertas deseja receber por email</p>
            </div>

            <div className="space-y-2">
              <Label>Email para alertas</Label>
              <Input value={emailForAlerts} onChange={(e) => setEmailForAlerts(e.target.value)} />
            </div>

            <div className="space-y-4">
              {emailNotifTypes.map((nt) => (
                <div key={nt.key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{nt.label}</p>
                    <p className="text-xs text-muted-foreground">{nt.desc}</p>
                  </div>
                  <Switch
                    checked={toggles[nt.key]}
                    onCheckedChange={(v) => setToggles((prev) => ({ ...prev, [nt.key]: v }))}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Frequência de resumo</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Imediato</SelectItem>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="never">Nunca</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>
              {saveSettings.isPending ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
