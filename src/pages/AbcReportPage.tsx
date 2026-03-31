import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ParetoChart } from "@/components/reports/ParetoChart";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { ExportButton } from "@/components/reports/ExportButton";
import { ReportFiltersBar, defaultReportFilters, type ReportFilters } from "@/components/reports/ReportFiltersBar";
import { useExport } from "@/hooks/useExport";
import { subMonths, format } from "date-fns";
import type { DateRange } from "react-day-picker";

export default function AbcReportPage() {
  const { profile } = useAuth();
  const { exportToExcel, exportToPDF } = useExport();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: subMonths(new Date(), 6), to: new Date() });
  const [filters, setFilters] = useState<ReportFilters>(defaultReportFilters);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["report-abc", profile?.tenant_id, dateRange?.from?.toISOString(), dateRange?.to?.toISOString(), filters.marketplace, filters.region, filters.brand],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      let query = supabase.from("orders").select("created_at, marketplace, order_items(title, quantity, price, product_variant_id), order_shipping(address)").eq("tenant_id", profile.tenant_id).in("status", ["paid", "processing", "shipped", "delivered"]);
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

  const abcData = useMemo(() => {
    const productMap = new Map<string, { title: string; quantity: number; revenue: number }>();
    (orders || []).forEach((o: any) => {
      (o.order_items || []).forEach((item: any) => {
        const key = item.title || "Sem título";
        const existing = productMap.get(key) || { title: key, quantity: 0, revenue: 0 };
        existing.quantity += item.quantity || 0;
        existing.revenue += (item.quantity || 0) * (Number(item.price) || 0);
        productMap.set(key, existing);
      });
    });
    const sorted = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue);
    const totalRevenue = sorted.reduce((s, p) => s + p.revenue, 0);
    let cumulative = 0;
    return sorted.map((p) => {
      cumulative += p.revenue;
      const pct = totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0;
      const cumPct = totalRevenue > 0 ? (cumulative / totalRevenue) * 100 : 0;
      const curve = cumPct <= 80 ? "A" : cumPct <= 95 ? "B" : "C";
      return { ...p, pct, cumPct, curve };
    });
  }, [orders]);

  const curveColor = (c: string) => c === "A" ? "bg-success/15 text-success border-success/30" : c === "B" ? "bg-warning/15 text-warning border-warning/30" : "bg-muted text-muted-foreground border-border";
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const periodLabel = dateRange?.from && dateRange?.to ? `Período: ${format(dateRange.from, "dd/MM/yyyy")} a ${format(dateRange.to, "dd/MM/yyyy")}` : "Todos os períodos";

  return (
    <div className="space-y-6 print-area">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div><h1 className="text-2xl font-bold tracking-tight">Curva ABC</h1><p className="text-sm text-muted-foreground">{periodLabel}</p></div>
        <div className="flex gap-2">
          <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
          <ExportButton onExportExcel={() => exportToExcel(abcData.map((p, i) => ({ "#": i + 1, Produto: p.title, "Qtd Vendida": p.quantity, Faturamento: p.revenue, "% Total": p.pct.toFixed(1), "% Acumulado": p.cumPct.toFixed(1), Curva: p.curve })), "curva-abc")} onExportPDF={() => exportToPDF("Curva ABC - CineADS")} />
        </div>
      </div>

      <ReportFiltersBar filters={filters} onChange={setFilters} />

      <div className="grid grid-cols-3 gap-4">
        {["A", "B", "C"].map((c) => {
          const items = abcData.filter((p) => p.curve === c);
          return (
            <div key={c} className="rounded-xl border border-border bg-card p-4 text-center">
              <Badge variant="outline" className={`text-sm font-bold mb-2 ${curveColor(c)}`}>Curva {c}</Badge>
              <p className="text-2xl font-bold">{items.length}</p>
              <p className="text-xs text-muted-foreground">produto(s)</p>
            </div>
          );
        })}
      </div>

      {abcData.length > 0 && <ParetoChart data={abcData} />}

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : abcData.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center"><p className="text-muted-foreground">Sem dados de vendas para análise</p></div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Produto</TableHead><TableHead className="text-right">Qtd Vendida</TableHead><TableHead className="text-right">Faturamento</TableHead><TableHead className="text-right">% do Total</TableHead><TableHead>Acumulado</TableHead><TableHead>Curva</TableHead></TableRow></TableHeader>
            <TableBody>
              {abcData.map((p, i) => (
                <TableRow key={p.title}>
                  <TableCell className="text-sm text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium text-sm">{p.title}</TableCell>
                  <TableCell className="text-right text-sm">{p.quantity}</TableCell>
                  <TableCell className="text-right text-sm font-semibold">{fmt(p.revenue)}</TableCell>
                  <TableCell className="text-right text-sm">{p.pct.toFixed(1)}%</TableCell>
                  <TableCell><div className="flex items-center gap-2"><Progress value={p.cumPct} className="h-2 w-20" /><span className="text-xs text-muted-foreground">{p.cumPct.toFixed(0)}%</span></div></TableCell>
                  <TableCell><Badge variant="outline" className={`text-xs ${curveColor(p.curve)}`}>{p.curve}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
