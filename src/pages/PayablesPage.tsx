import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { format, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function PayablesPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: payables, isLoading } = useQuery({
    queryKey: ["payables", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("payables")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payables")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payables"] });
      queryClient.invalidateQueries({ queryKey: ["financial"] });
      toast.success("Conta marcada como paga!");
    },
  });

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const now = new Date();

  const getStatusBadge = (status: string, dueDate: string) => {
    if (status === "paid") return <Badge variant="outline" className="text-xs bg-success/15 text-success border-success/30"><CheckCircle2 className="h-3 w-3 mr-1" />Pago</Badge>;
    if (!isAfter(new Date(dueDate), now)) return <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Vencido</Badge>;
    return <Badge variant="outline" className="text-xs bg-warning/15 text-warning border-warning/30"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contas a Pagar</h1>
        <p className="text-sm text-muted-foreground">{(payables || []).length} registros</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (payables || []).length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success mb-3" />
          <p className="text-lg font-medium">Nenhuma conta a pagar</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(payables || []).map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-sm">{p.description}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.supplier || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.category || "—"}</TableCell>
                  <TableCell className="text-sm">{format(new Date(p.due_date), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                  <TableCell className="text-right font-semibold text-sm">{fmt(Number(p.amount))}</TableCell>
                  <TableCell>{getStatusBadge(p.status, p.due_date)}</TableCell>
                  <TableCell>
                    {p.status !== "paid" && (
                      <Button size="sm" variant="outline" onClick={() => markPaid.mutate(p.id)} disabled={markPaid.isPending}>
                        Pagar
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
  );
}
