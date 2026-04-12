import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";
import { NotAuthorized } from "@/components/auth/NotAuthorized";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Inbox, Copy, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  pending:   { label: "Pendente",  class: "bg-warning/15 text-warning border-warning/30" },
  issued:    { label: "Emitida",   class: "bg-success/15 text-success border-success/30" },
  cancelled: { label: "Cancelada", class: "bg-destructive/15 text-destructive border-destructive/30" },
};

export default function InvoicesPage() {
  const { profile } = useAuth();
  const { canAccessFinancial } = usePermissions();
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", profile?.tenant_id, statusFilter, page],
    queryFn: async () => {
      if (!profile?.tenant_id) return { invoices: [], count: 0 };

      let query = supabase
        .from("invoices")
        .select("*, orders(order_number)", { count: "exact" })
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") query = query.eq("status", statusFilter);

      const { data: invoices, error, count } = await query.range(
        page * PAGE_SIZE,
        (page + 1) * PAGE_SIZE - 1
      );

      if (error) throw error;
      return { invoices: invoices || [], count: count || 0 };
    },
    enabled: !!profile?.tenant_id,
  });

  if (!canAccessFinancial) return <NotAuthorized />;

  const invoices = data?.invoices || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("Chave copiada");
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Notas Fiscais</h1>
        <p className="text-sm text-muted-foreground">{totalCount} nota{totalCount !== 1 ? "s" : ""} encontrada{totalCount !== 1 ? "s" : ""}</p>
      </motion.div>

      {/* Filtros */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="issued">Emitida</SelectItem>
            <SelectItem value="cancelled">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-card overflow-x-auto"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº NF-e</TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Data de Emissão</TableHead>
              <TableHead className="hidden lg:table-cell">Chave NF-e</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16">
                  <Inbox className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground text-sm">Nenhuma nota fiscal encontrada</p>
                  <p className="text-xs text-muted-foreground mt-1">As NF-es aparecem aqui após a emissão</p>
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv: any) => {
                const st = STATUS_CONFIG[inv.status] || STATUS_CONFIG.pending;
                const orderNumber = inv.orders?.order_number;
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">
                      {inv.nfe_number || <span className="text-muted-foreground">—</span>}
                    </TableCell>

                    <TableCell>
                      {inv.order_id && orderNumber ? (
                        <Link
                          to={`/orders/${inv.order_id}`}
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          {orderNumber}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${st.class}`}>
                        {st.label}
                      </Badge>
                    </TableCell>

                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {inv.issued_at
                        ? format(new Date(inv.issued_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : "—"}
                    </TableCell>

                    <TableCell className="hidden lg:table-cell">
                      {inv.nfe_key ? (
                        <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px] block">
                          {inv.nfe_key.slice(0, 20)}…
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {inv.nfe_key && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => copyKey(inv.nfe_key)}
                          title="Copiar chave NF-e"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </motion.div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
              Próximo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
