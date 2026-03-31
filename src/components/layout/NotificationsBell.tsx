import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { Bell, PackageX, PauseCircle, Clock, AlertTriangle, ShieldAlert, Check, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const typeIcons: Record<string, { icon: React.ElementType; className: string }> = {
  stock_critical: { icon: PackageX, className: "text-destructive" },
  listing_paused: { icon: PauseCircle, className: "text-warning" },
  order_delayed: { icon: Clock, className: "text-warning" },
  integration_error: { icon: AlertTriangle, className: "text-destructive" },
  order_risk: { icon: ShieldAlert, className: "text-warning" },
};

export function NotificationsBell() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications-unread", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
    refetchInterval: 30000,
  });

  const markAllRead = async () => {
    if (!profile?.tenant_id) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("tenant_id", profile.tenant_id)
      .eq("read", false);
    if (error) {
      toast.error("Erro ao marcar notificações");
      return;
    }
    toast.success("Todas marcadas como lidas");
    queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
  };

  const markOneRead = async (id: string, link?: string | null) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    if (link) {
      setOpen(false);
      navigate(link);
    }
  };

  const count = notifications.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h4 className="text-sm font-semibold">Notificações</h4>
          {count > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary hover:underline">
              Marcar todas como lidas
            </button>
          )}
        </div>
        <ScrollArea className="max-h-72">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Inbox className="h-8 w-8 mb-2" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            notifications.map((n) => {
              const config = typeIcons[n.type] || { icon: Bell, className: "text-muted-foreground" };
              const Icon = config.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => markOneRead(n.id, n.link)}
                  className="flex items-start gap-3 w-full px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-0"
                >
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.className}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    {n.message && <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </ScrollArea>
        <div className="border-t border-border px-4 py-2">
          <button
            onClick={() => { setOpen(false); navigate("/notifications"); }}
            className="text-xs text-primary hover:underline w-full text-center"
          >
            Ver todas as notificações
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
