import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, PackageX, PauseCircle, Clock, AlertTriangle, ShieldAlert, CheckCheck, Inbox, Zap } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { motion } from "framer-motion";

const typeIcons: Record<string, { icon: React.ElementType; className: string; label: string }> = {
  stock_critical:    { icon: PackageX,     className: "text-destructive", label: "Estoque Crítico" },
  listing_paused:    { icon: PauseCircle,  className: "text-warning",     label: "Anúncio Pausado" },
  order_delayed:     { icon: Clock,        className: "text-warning",     label: "Pedido Atrasado" },
  integration_error: { icon: AlertTriangle,className: "text-destructive", label: "Erro Integração" },
  order_risk:        { icon: ShieldAlert,  className: "text-warning",     label: "Risco Pedido" },
  automation:        { icon: Zap,          className: "text-primary",     label: "Automação" },
};

export default function NotificationsPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  useEffect(() => { setPage(0); }, [typeFilter, readFilter]);

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ["all-notifications", profile?.tenant_id, typeFilter, readFilter, page],
    queryFn: async () => {
      if (!profile?.tenant_id) return { data: [], count: 0 };
      let query = supabase
        .from("notifications")
        .select("*", { count: "exact" })
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false });

      if (typeFilter !== "all") query = query.eq("type", typeFilter);
      if (readFilter === "unread") query = query.eq("read", false);
      if (readFilter === "read") query = query.eq("read", true);

      const { data, error, count } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    enabled: !!profile?.tenant_id,
  });

  const notifications = notificationsData?.data || [];
  const totalCount = notificationsData?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const filtered = notifications;

  const markAllRead = async () => {
    if (!profile?.tenant_id) return;
    await supabase.from("notifications").update({ read: true }).eq("tenant_id", profile.tenant_id).eq("read", false);
    toast.success("Todas marcadas como lidas");
    queryClient.invalidateQueries({ queryKey: ["all-notifications"] });
    queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
        <p className="text-sm text-muted-foreground">{totalCount} notificações</p>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="automation">Automação</SelectItem>
              <SelectItem value="stock_critical">Estoque Crítico</SelectItem>
              <SelectItem value="listing_paused">Anúncio Pausado</SelectItem>
              <SelectItem value="order_delayed">Pedido Atrasado</SelectItem>
              <SelectItem value="integration_error">Erro Integração</SelectItem>
              <SelectItem value="order_risk">Risco Pedido</SelectItem>
            </SelectContent>
          </Select>
          <Select value={readFilter} onValueChange={setReadFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="unread">Não Lidas</SelectItem>
              <SelectItem value="read">Lidas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={markAllRead}>
          <CheckCheck className="mr-2 h-4 w-4" /> Marcar todas como lidas
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Notificação</TableHead>
              <TableHead className="hidden sm:table-cell">Tipo</TableHead>
              <TableHead className="hidden md:table-cell">Data</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12"><Inbox className="mx-auto h-10 w-10 text-muted-foreground mb-2" /><p className="text-muted-foreground">Nenhuma notificação</p></TableCell></TableRow>
            ) : (
              filtered.map((n) => {
                const config = typeIcons[n.type] || { icon: Bell, className: "text-muted-foreground", label: n.type };
                const Icon = config.icon;
                return (
                  <TableRow key={n.id} className={!n.read ? "bg-primary/5" : ""}>
                    <TableCell><Icon className={`h-4 w-4 ${config.className}`} /></TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.message && <p className="text-xs text-muted-foreground">{n.message}</p>}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="text-xs">{config.label}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {format(new Date(n.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={n.read ? "text-xs" : "text-xs bg-primary/10 text-primary border-primary/30"}>
                        {n.read ? "Lida" : "Não lida"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próximo</Button>
          </div>
        </div>
      )}
    </div>
  );
}
