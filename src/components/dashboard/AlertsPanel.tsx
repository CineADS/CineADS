import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AlertTriangle, Package, Bell, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const typeStyles: Record<string, string> = {
  error: "border-destructive/30 bg-destructive/5",
  warning: "border-warning/30 bg-warning/5",
  info: "border-info/30 bg-info/5",
};

const iconStyles: Record<string, string> = {
  error: "text-destructive",
  warning: "text-warning",
  info: "text-info",
};

const typeToAlertType: Record<string, string> = {
  stock_critical: "warning",
  listing_paused: "info",
  order_delayed: "warning",
  integration_error: "error",
  order_risk: "warning",
};

export function AlertsPanel() {
  const { profile } = useAuth();

  const { data: notifications = [] } = useQuery({
    queryKey: ["dashboard-alerts", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="text-sm font-semibold">Alertas</h3>
      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mb-2 text-success" />
            <p className="text-sm">Tudo certo por aqui!</p>
          </div>
        ) : (
          notifications.map((n, i) => {
            const alertType = typeToAlertType[n.type] || "info";
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1, duration: 0.3 }}
                className={cn("flex items-center gap-3 rounded-lg border p-3 hover:shadow-sm transition-shadow", typeStyles[alertType])}
              >
                <AlertTriangle className={cn("h-4 w-4 shrink-0", iconStyles[alertType])} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{n.title}</span>
                  {n.message && <p className="text-xs text-muted-foreground truncate">{n.message}</p>}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
