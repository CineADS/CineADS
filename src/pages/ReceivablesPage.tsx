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

export default function ReceivablesPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: receivables, isLoading } = useQuery({
    queryKey: ["receivables", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("receivables")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const markReceived = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("receivables")
        .update({ status: "received", received_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      queryClient.invalidateQueries({ queryKey: ["financial"] });
      toast.success("Recebimento confirmado!");
    },
  });

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const now = new Date();

  const getStatusBadge = (status: string, dueDate: string) => {
    if (status === "received") return <Badge variant="outline" className="text-xs bg-success/15 text-success border-success/30"><CheckCircle2 className="h-3 w-3 mr-1" />Recebido</Badge>;
    if (!isAfter(new Date(dueDate), now)) return <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Vencido</Badge>;
    return <Badge variant="outline" className="text-xs bg-warning/15 text-warning border-warning/30"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contas a Receber</h1>
        <p className="text-sm text-muted-foreground">{(receivables || []).length} registros</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (receivables || []).length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success mb-3" />
          <p className="text-lg font-medium">Nenhuma conta a receber</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(receivables || []).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">{r.description}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.customer_name || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.category || "—"}</TableCell>
                  <TableCell className="text-sm">{format(new Date(r.due_date), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                  <TableCell className="text-right font-semibold text-sm">{fmt(Number(r.amount))}</TableCell>
                  <TableCell>{getStatusBadge(r.status, r.due_date)}</TableCell>
                  <TableCell>
                    {r.status !== "received" && (
                      <Button size="sm" variant="outline" onClick={() => markReceived.mutate(r.id)} disabled={markReceived.isPending}>
                        Receber
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
