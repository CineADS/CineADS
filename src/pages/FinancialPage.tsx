import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";
import { NotAuthorized } from "@/components/auth/NotAuthorized";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, isAfter, subDays, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { Button } from "@/components/ui/button";

export default function FinancialPage() {
  const { profile } = useAuth();
  const { canAccessFinancial } = usePermissions();
  const now = new Date();
  const [period, setPeriod] = useState(30);

  const { data: orders } = useQuery({
    queryKey: ["financial-orders", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("orders").select("total, status, created_at")
        .eq("tenant_id", profile.tenant_id)
        .gte("created_at", startOfMonth(now).toISOString())
        .lte("created_at", endOfMonth(now).toISOString());
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: payables } = useQuery({
    queryKey: ["financial-payables", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase.from("payables").select("amount, status, due_date").eq("tenant_id", profile.tenant_id).neq("status", "paid");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: receivables } = useQuery({
    queryKey: ["financial-receivables", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase.from("receivables").select("amount, status, due_date").eq("tenant_id", profile.tenant_id).neq("status", "received");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: revenueOrders } = useQuery({
    queryKey: ["financial-revenue-chart", profile?.tenant_id, period],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase.from("orders").select("total, created_at")
        .eq("tenant_id", profile.tenant_id)
        .gte("created_at", subDays(now, period).toISOString())
        .in("status", ["paid", "processing", "shipped", "delivered"]);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const stats = useMemo(() => {
    const revenue = (orders || []).filter((o) => ["paid", "processing", "shipped", "delivered"].includes(o.status)).reduce((s, o) => s + (Number(o.total) || 0), 0);
    const totalPayables = (payables || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const overduePayables = (payables || []).filter((p) => p.status === "pending" && !isAfter(new Date(p.due_date), now)).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const totalReceivables = (receivables || []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const overdueReceivables = (receivables || []).filter((r) => r.status === "pending" && !isAfter(new Date(r.due_date), now)).reduce((s, r) => s + (Number(r.amount) || 0), 0);
    return { revenue, totalPayables, overduePayables, totalReceivables, overdueReceivables };
  }, [orders, payables, receivables]);

  const revenueChartData = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(now, period), end: now });
    return days.map((d) => {
      const dayStr = format(d, "yyyy-MM-dd");
      const dayTotal = (revenueOrders || []).filter((o) => format(new Date(o.created_at), "yyyy-MM-dd") === dayStr).reduce((s, o) => s + (Number(o.total) || 0), 0);
      return { date: format(d, "dd/MM", { locale: ptBR }), receita: dayTotal };
    });
  }, [revenueOrders, period]);

  if (!canAccessFinancial) return <NotAuthorized />;

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const cards = [
    { label: "Faturamento do Mês", value: fmt(stats.revenue), icon: DollarSign, color: "text-primary" },
    { label: "A Receber (aberto)", value: fmt(stats.totalReceivables), icon: TrendingUp, color: "text-success" },
    { label: "A Pagar (aberto)", value: fmt(stats.totalPayables), icon: TrendingDown, color: "text-warning" },
    { label: "Saldo Projetado", value: fmt(stats.revenue + stats.totalReceivables - stats.totalPayables), icon: DollarSign, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Visão Geral Financeira</h1>
        <p className="text-sm text-muted-foreground">{format(now, "MMMM 'de' yyyy", { locale: ptBR })}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><c.icon className={`h-4 w-4 ${c.color}`} /> {c.label}</div>
            <p className="text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      {(stats.overduePayables > 0 || stats.overdueReceivables > 0) && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-1">
          <h3 className="text-sm font-semibold text-destructive flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Atenção: valores vencidos</h3>
          {stats.overduePayables > 0 && <p className="text-sm text-muted-foreground">Contas a pagar vencidas: <span className="font-semibold text-destructive">{fmt(stats.overduePayables)}</span></p>}
          {stats.overdueReceivables > 0 && <p className="text-sm text-muted-foreground">Contas a receber vencidas: <span className="font-semibold text-destructive">{fmt(stats.overdueReceivables)}</span></p>}
        </div>
      )}

      {/* Revenue Chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Receita por Período</h3>
          <div className="flex gap-1">
            {[{ label: "7d", val: 7 }, { label: "30d", val: 30 }, { label: "3m", val: 90 }, { label: "6m", val: 180 }].map((p) => (
              <Button key={p.val} variant={period === p.val ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => setPeriod(p.val)}>{p.label}</Button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={revenueChartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" className="text-xs" interval="preserveStartEnd" />
            <YAxis className="text-xs" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)" }} />
            <Line type="monotone" dataKey="receita" name="Receita" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Marketplace Profit Chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold mb-4">Lucro por Marketplace</h3>
        <div className="flex items-center justify-center py-12 text-center">
          <div>
            <p className="text-muted-foreground text-sm">Conecte seus marketplaces para ver dados reais</p>
            <p className="text-xs text-muted-foreground mt-1">Os dados aparecerão automaticamente após a integração</p>
          </div>
        </div>
      </div>
    </div>
  );
}
