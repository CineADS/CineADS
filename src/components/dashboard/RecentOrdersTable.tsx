import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig: Record<string, { label: string; className: string }> = {
  paid: { label: "Pago", className: "bg-success/15 text-success border-success/30" },
  shipped: { label: "Enviado", className: "bg-info/15 text-info border-info/30" },
  delivered: { label: "Entregue", className: "bg-success/15 text-success border-success/30" },
  pending: { label: "Pendente", className: "bg-warning/15 text-warning border-warning/30" },
  in_separation: { label: "Em Separação", className: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  processing: { label: "Faturado", className: "bg-primary/15 text-primary border-primary/30" },
  cancelled: { label: "Cancelado", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

export function RecentOrdersTable() {
  const { profile } = useAuth();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["recent-orders", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="text-sm font-semibold">Últimos Pedidos</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pedido</TableHead>
            <TableHead className="hidden sm:table-cell">Marketplace</TableHead>
            <TableHead className="hidden md:table-cell">Cliente</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
              </TableRow>
            ))
          ) : !orders?.length ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8">
                <ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum pedido ainda</p>
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => {
              const customer = order.customer as any;
              const status = statusConfig[order.status] || statusConfig.pending;
              return (
                <TableRow key={order.id}>
                  <TableCell className="font-medium text-sm">#{order.order_number || order.id.slice(0, 8)}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">{order.marketplace || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{customer?.name || "—"}</TableCell>
                  <TableCell className="text-sm font-medium">{order.total ? `R$ ${Number(order.total).toFixed(2)}` : "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-xs", status.className)}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {format(new Date(order.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
