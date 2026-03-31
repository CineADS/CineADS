import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useMemo, useState } from "react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ArrowUpCircle, ArrowDownCircle, Receipt } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const incomeCategories = ["Venda marketplace", "Repasse marketplace", "Outros"];
const expenseCategories = ["Fornecedor", "Frete", "Taxas marketplace", "Impostos", "Operacional", "Outros"];

export default function CashFlowPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i));

  const [showModal, setShowModal] = useState(false);
  const [txType, setTxType] = useState<"income" | "expense">("income");
  const [txDescription, setTxDescription] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txDate, setTxDate] = useState(format(now, "yyyy-MM-dd"));
  const [txCategory, setTxCategory] = useState("");
  const [txNotes, setTxNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Filters for transactions table
  const [txTypeFilter, setTxTypeFilter] = useState("all");
  const [txDateFrom, setTxDateFrom] = useState("");
  const [txDateTo, setTxDateTo] = useState("");

  const { data: orders } = useQuery({
    queryKey: ["cashflow-orders", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("total, status, created_at")
        .eq("tenant_id", profile.tenant_id)
        .gte("created_at", startOfMonth(months[0]).toISOString())
        .in("status", ["paid", "processing", "shipped", "delivered"]);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: payables } = useQuery({
    queryKey: ["cashflow-payables", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("payables")
        .select("amount, status, due_date, paid_at")
        .eq("tenant_id", profile.tenant_id)
        .gte("due_date", startOfMonth(months[0]).toISOString());
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ["cashflow-transactions", profile?.tenant_id, txTypeFilter, txDateFrom, txDateTo],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      let query = supabase
        .from("transactions")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .order("date", { ascending: false })
        .limit(50);

      if (txTypeFilter !== "all") query = query.eq("type", txTypeFilter);
      if (txDateFrom) query = query.gte("date", txDateFrom);
      if (txDateTo) query = query.lte("date", txDateTo);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const chartData = useMemo(() => {
    return months.map((m) => {
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const income = (orders || [])
        .filter((o) => { const d = new Date(o.created_at); return d >= start && d <= end; })
        .reduce((s, o) => s + (Number(o.total) || 0), 0);
      const expenses = (payables || [])
        .filter((p) => { const d = new Date(p.due_date); return d >= start && d <= end; })
        .reduce((s, p) => s + (Number(p.amount) || 0), 0);
      return { month: format(m, "MMM/yy", { locale: ptBR }), Receita: income, Despesa: expenses, Saldo: income - expenses };
    });
  }, [orders, payables]);

  const txTotals = useMemo(() => {
    const list = transactions || [];
    const totalIncome = list.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = list.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
  }, [transactions]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleSave = async () => {
    if (!profile?.tenant_id || !txDescription || !txAmount) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("transactions").insert({
      tenant_id: profile.tenant_id,
      type: txType,
      description: txDescription,
      amount: parseFloat(txAmount),
      date: txDate,
      category: txCategory || null,
    });
    setSaving(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Transação registrada!");
    queryClient.invalidateQueries({ queryKey: ["cashflow-transactions"] });
    setShowModal(false);
    setTxDescription("");
    setTxAmount("");
    setTxCategory("");
    setTxNotes("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fluxo de Caixa</h1>
          <p className="text-sm text-muted-foreground">Últimos 6 meses</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova Transação
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" className="text-xs" />
            <YAxis className="text-xs" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)" }} />
            <Legend />
            <Bar dataKey="Receita" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Despesa" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Transactions Table */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Receipt className="h-5 w-5" /> Lançamentos
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={txTypeFilter} onValueChange={setTxTypeFilter}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="income">Entradas</SelectItem>
              <SelectItem value="expense">Saídas</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={txDateFrom} onChange={(e) => setTxDateFrom(e.target.value)} className="w-full sm:w-40" placeholder="De" />
          <Input type="date" value={txDateTo} onChange={(e) => setTxDateTo(e.target.value)} className="w-full sm:w-40" placeholder="Até" />
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {txLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : !transactions || transactions.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  Nenhum lançamento encontrado. Clique em Nova Transação para começar.
                </TableCell></TableRow>
              ) : (
                transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm">{format(new Date(tx.date), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs", tx.type === "income" ? "bg-success/15 text-success border-success/30" : "bg-destructive/15 text-destructive border-destructive/30")}>
                        {tx.type === "income" ? <><ArrowUpCircle className="h-3 w-3 mr-1" />Entrada</> : <><ArrowDownCircle className="h-3 w-3 mr-1" />Saída</>}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{tx.category || "—"}</TableCell>
                    <TableCell className="text-sm">{tx.description}</TableCell>
                    <TableCell className={cn("text-right text-sm font-medium", tx.type === "income" ? "text-success" : "text-destructive")}>
                      {tx.type === "income" ? "+" : "-"}{fmt(Number(tx.amount))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {transactions && transactions.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30 text-sm">
              <span>Total Entradas: <strong className="text-success">{fmt(txTotals.totalIncome)}</strong></span>
              <span>Total Saídas: <strong className="text-destructive">{fmt(txTotals.totalExpense)}</strong></span>
              <span>Saldo: <strong className={txTotals.balance >= 0 ? "text-success" : "text-destructive"}>{fmt(txTotals.balance)}</strong></span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Add Transaction Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova Transação</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className={txType === "income" ? "bg-success/15 text-success border-success/30" : ""} onClick={() => { setTxType("income"); setTxCategory(""); }}>Entrada</Button>
                <Button variant="outline" size="sm" className={txType === "expense" ? "bg-destructive/15 text-destructive border-destructive/30" : ""} onClick={() => { setTxType("expense"); setTxCategory(""); }}>Saída</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input placeholder="Ex: Pagamento fornecedor X" value={txDescription} onChange={(e) => setTxDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" placeholder="0,00" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={txCategory} onValueChange={setTxCategory}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(txType === "income" ? incomeCategories : expenseCategories).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea value={txNotes} onChange={(e) => setTxNotes(e.target.value)} placeholder="Detalhes..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Registrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
