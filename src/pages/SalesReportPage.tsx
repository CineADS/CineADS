import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useMemo, useState } from "react";
import { format, subMonths, startOfMonth, endOfMonth, subDays, eachMonthOfInterval, eachDayOfInterval, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { DollarSign, ShoppingCart, TrendingUp } from "lucide-react";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { ExportButton } from "@/components/reports/ExportButton";
import { ReportFiltersBar, defaultReportFilters, type ReportFilters } from "@/components/reports/ReportFiltersBar";
import { useExport } from "@/hooks/useExport";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";

export default function SalesReportPage() {
  const { profile } = useAuth();
  const { exportToExcel, exportToPDF } = useExport();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: subMonths(new Date(), 5), to: new Date() });
  const [filters, setFilters] = useState<ReportFilters>(defaultReportFilters);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["report-sales", profile?.tenant_id, dateRange?.from?.toISOString(), dateRange?.to?.toISOString(), filters.marketplace, filters.region, filters.brand],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      let query = supabase.from("orders").select("total, status, created_at, marketplace, order_items(quantity, product_variant_id), order_shipping(address)").eq("tenant_id", profile.tenant_id).in("status", ["paid", "processing", "shipped", "delivered"]);
      if (dateRange?.from) query = query.gte("created_at", dateRange.from.toISOString());
      if (dateRange?.to) query = query.lte("created_at", dateRange.to.toISOString());
      if (filters.marketplace !== "Todos os canais") query = query.eq("marketplace", filters.marketplace);
      const { data, error } = await query;
      if (error) throw error;
      let result = data || [];
      if (filters.region !== "Todo o Brasil") {
        result = result.filter((o: any) => (o.order_shipping || []).some((s: any) => (s.address?.state || s.address?.uf) === filters.region));
      }
      return result;
    },
    enabled: !!profile?.tenant_id,
  });

  const chartData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return [];
    const days = differenceInDays(dateRange.to, dateRange.from);
    if (days <= 31) {
      return eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).map((d) => {
        const dayOrders = (orders || []).filter((o) => format(new Date(o.created_at), "yyyy-MM-dd") === format(d, "yyyy-MM-dd"));
        return { period: format(d, "dd/MM", { locale: ptBR }), revenue: dayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0), orders: dayOrders.length };
      });
    }
    return eachMonthOfInterval({ start: dateRange.from, end: dateRange.to }).map((m) => {
      const start = startOfMonth(m); const end = endOfMonth(m);
      const monthOrders = (orders || []).filter((o) => { const d = new Date(o.created_at); return d >= start && d <= end; });
      return { period: format(m, "MMM/yy", { locale: ptBR }), revenue: monthOrders.reduce((s, o) => s + (Number(o.total) || 0), 0), orders: monthOrders.length };
    });
  }, [orders, dateRange]);

  const totals = useMemo(() => ({
    revenue: (orders || []).reduce((s, o) => s + (Number(o.total) || 0), 0),
    orders: (orders || []).length,
    avgTicket: (orders || []).length > 0 ? (orders || []).reduce((s, o) => s + (Number(o.total) || 0), 0) / (orders || []).length : 0,
  }), [orders]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const periodLabel = dateRange?.from && dateRange?.to ? `${format(dateRange.from, "dd/MM/yyyy")} a ${format(dateRange.to, "dd/MM/yyyy")}` : "Todos os períodos";

  const handleExportExcel = () => {
    if (chartData.length === 0) { toast.error("Nenhum dado para exportar."); return; }
    exportToExcel(chartData.map((d) => ({ Período: d.period, Faturamento: d.revenue, Pedidos: d.orders })), `vendas-${periodLabel.replace(/\//g, "-")}`);
  };

  return (
    <div className="space-y-6 print-area">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div><h1 className="text-2xl font-bold tracking-tight">Relatório de Vendas</h1><p className="text-sm text-muted-foreground">{periodLabel}</p></div>
        <div className="flex gap-2">
          <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
          <ExportButton onExportExcel={handleExportExcel} onExportPDF={() => exportToPDF(`Relatório de Vendas - CineADS | ${periodLabel}`)} />
        </div>
      </div>

      <ReportFiltersBar filters={filters} onChange={setFilters} />

      <div className="hidden print:block mb-4"><h1 className="text-xl font-bold">Relatório de Vendas - CineADS</h1><p className="text-sm">{periodLabel}</p></div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><DollarSign className="h-4 w-4 text-primary" /> Faturamento Total</div><p className="text-2xl font-bold">{fmt(totals.revenue)}</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><ShoppingCart className="h-4 w-4 text-primary" /> Pedidos</div><p className="text-2xl font-bold">{totals.orders}</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><TrendingUp className="h-4 w-4 text-primary" /> Ticket Médio</div><p className="text-2xl font-bold">{fmt(totals.avgTicket)}</p></div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold mb-4">Faturamento</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="period" className="text-xs" /><YAxis className="text-xs" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} /><Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)" }} /><Bar dataKey="revenue" name="Faturamento" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold mb-4">Pedidos</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="period" className="text-xs" /><YAxis className="text-xs" /><Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)" }} /><Line type="monotone" dataKey="orders" name="Pedidos" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} /></LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
