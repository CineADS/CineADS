import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { ExportButton } from "@/components/reports/ExportButton";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { ReportFiltersBar, defaultReportFilters, type ReportFilters } from "@/components/reports/ReportFiltersBar";
import { useExport } from "@/hooks/useExport";
import { subDays, subMonths, format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function MarginReportPage() {
  const { profile } = useAuth();
  const { exportToExcel, exportToPDF } = useExport();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: subMonths(new Date(), 1), to: new Date() });
  const [filters, setFilters] = useState<ReportFilters>(defaultReportFilters);

  const dateFrom = dateRange?.from || subDays(new Date(), 30);
  const dateTo = dateRange?.to || new Date();

  const { data: marginData = [], isLoading } = useQuery({
    queryKey: ["report-margin", profile?.tenant_id, dateFrom.toISOString(), dateTo.toISOString(), filters.marketplace, filters.region, filters.brand],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      let ordersQuery = supabase.from("orders").select("id, marketplace, total, created_at, order_items(product_variant_id, quantity, price), order_shipping(address)").eq("tenant_id", profile.tenant_id).neq("status", "cancelled").gte("created_at", dateFrom.toISOString()).lte("created_at", dateTo.toISOString());
      if (filters.marketplace !== "Todos os canais") ordersQuery = ordersQuery.eq("marketplace", filters.marketplace);
      const { data: orders, error: ordersError } = await ordersQuery;
      if (ordersError) throw ordersError;

      let filteredOrders = orders || [];
      if (filters.region !== "Todo o Brasil") {
        filteredOrders = filteredOrders.filter((o: any) => (o.order_shipping || []).some((s: any) => (s.address?.state || s.address?.uf) === filters.region));
      }

      const variantIds = new Set<string>();
      for (const order of filteredOrders) {
        for (const item of (order as any).order_items || []) {
          if (item.product_variant_id) variantIds.add(item.product_variant_id);
        }
      }

      if (variantIds.size === 0) {
        const { data: products } = await supabase.from("products").select("id, title, sku, brand, product_variants(price, cost, stock)").eq("tenant_id", profile.tenant_id).eq("status", "active").order("title");
        let filtered = products || [];
        if (filters.brand !== "Todas as marcas") filtered = filtered.filter((p) => p.brand === filters.brand);
        return filtered.map((p) => {
          const variants = p.product_variants || [];
          const avgPrice = variants.length > 0 ? variants.reduce((s: number, v: any) => s + (Number(v.price) || 0), 0) / variants.length : 0;
          const avgCost = variants.length > 0 ? variants.reduce((s: number, v: any) => s + (Number(v.cost) || 0), 0) / variants.length : 0;
          const margin = avgPrice > 0 ? ((avgPrice - avgCost) / avgPrice) * 100 : 0;
          return { title: p.title, sku: p.sku, avgPrice, avgCost, margin, profit: avgPrice - avgCost, revenue: 0, totalCost: 0, qtySold: 0 };
        }).sort((a, b) => b.margin - a.margin);
      }

      const { data: variants } = await supabase.from("product_variants").select("id, cost, price, product_id, products(title, sku, brand)").in("id", Array.from(variantIds));
      const variantMap = new Map((variants || []).map((v: any) => [v.id, v]));

      const productAgg = new Map<string, { title: string; sku: string; brand: string; revenue: number; totalCost: number; qtySold: number }>();
      for (const order of filteredOrders) {
        for (const item of (order as any).order_items || []) {
          if (!item.product_variant_id) continue;
          const variant = variantMap.get(item.product_variant_id) as any;
          if (!variant) continue;
          if (filters.brand !== "Todas as marcas" && variant.products?.brand !== filters.brand) continue;
          const productId = variant.product_id;
          const existing = productAgg.get(productId) || { title: variant.products?.title || "Produto", sku: variant.products?.sku || "", brand: variant.products?.brand || "", revenue: 0, totalCost: 0, qtySold: 0 };
          existing.revenue += (Number(item.price) || 0) * item.quantity;
          existing.totalCost += (Number(variant.cost) || 0) * item.quantity;
          existing.qtySold += item.quantity;
          productAgg.set(productId, existing);
        }
      }

      return Array.from(productAgg.values()).map((p) => {
        const margin = p.revenue > 0 ? ((p.revenue - p.totalCost) / p.revenue) * 100 : 0;
        return { title: p.title, sku: p.sku, avgPrice: p.qtySold > 0 ? p.revenue / p.qtySold : 0, avgCost: p.qtySold > 0 ? p.totalCost / p.qtySold : 0, margin, profit: p.revenue - p.totalCost, revenue: p.revenue, totalCost: p.totalCost, qtySold: p.qtySold };
      }).sort((a, b) => b.margin - a.margin);
    },
    enabled: !!profile?.tenant_id,
  });

  const top10 = marginData.slice(0, 10);
  const avgMargin = marginData.length > 0 ? marginData.reduce((s, p) => s + p.margin, 0) / marginData.length : 0;
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const periodLabel = `${format(dateFrom, "dd/MM/yyyy")} a ${format(dateTo, "dd/MM/yyyy")}`;
  const getMarginBadge = (m: number) => m >= 30 ? <Badge variant="outline" className="text-xs bg-success/15 text-success border-success/30">{m.toFixed(1)}%</Badge> : m >= 15 ? <Badge variant="outline" className="text-xs bg-warning/15 text-warning border-warning/30">{m.toFixed(1)}%</Badge> : <Badge variant="destructive" className="text-xs">{m.toFixed(1)}%</Badge>;
  const getBarColor = (m: number) => m >= 30 ? "#16A34A" : m >= 15 ? "#EA580C" : "#E8001C";

  return (
    <div className="space-y-6 print-area">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div><h1 className="text-2xl font-bold tracking-tight">Relatório de Margem</h1><p className="text-sm text-muted-foreground">{periodLabel}</p></div>
        <div className="flex gap-2">
          <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
          <ExportButton onExportExcel={() => exportToExcel(marginData.map((p) => ({ Produto: p.title, SKU: p.sku || "", "Preço Médio": p.avgPrice, "Custo Médio": p.avgCost, "Lucro Unit.": p.profit, "Margem %": p.margin.toFixed(1) })), "relatorio-margem")} onExportPDF={() => exportToPDF("Relatório de Margem - CineADS")} />
        </div>
      </div>

      <ReportFiltersBar filters={filters} onChange={setFilters} showRegion={true} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><TrendingUp className="h-4 w-4 text-success" /> Margem Média</div><p className="text-2xl font-bold">{avgMargin.toFixed(1)}%</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><TrendingUp className="h-4 w-4 text-success" /> Maior Margem</div><p className="text-2xl font-bold">{marginData.length > 0 ? `${marginData[0].margin.toFixed(1)}%` : "—"}</p><p className="text-xs text-muted-foreground truncate">{marginData[0]?.title}</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><TrendingDown className="h-4 w-4 text-destructive" /> Menor Margem</div><p className="text-2xl font-bold">{marginData.length > 0 ? `${marginData[marginData.length - 1].margin.toFixed(1)}%` : "—"}</p><p className="text-xs text-muted-foreground truncate">{marginData[marginData.length - 1]?.title}</p></div>
      </div>

      {top10.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold mb-4">Top 10 Produtos por Margem</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={top10} layout="vertical" margin={{ left: 80 }}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} className="text-xs" /><YAxis type="category" dataKey="title" className="text-xs" width={80} tick={{ fontSize: 11 }} /><Tooltip formatter={(v: number, name: string) => name === "margin" ? `${v.toFixed(1)}%` : fmt(v)} contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)" }} /><Bar dataKey="margin" name="Margem %" radius={[0, 4, 4, 0]}>{top10.map((entry, index) => <Cell key={index} fill={getBarColor(entry.margin)} />)}</Bar></BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : marginData.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center"><p className="text-muted-foreground">Nenhum produto com dados de preço/custo no período selecionado</p></div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>SKU</TableHead><TableHead className="text-right">Preço Médio</TableHead><TableHead className="text-right">Custo Médio</TableHead><TableHead className="text-right">Lucro Unit.</TableHead><TableHead>Margem</TableHead></TableRow></TableHeader>
            <TableBody>
              {marginData.map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium text-sm">{p.title}</TableCell>
                  <TableCell className="font-mono text-xs">{p.sku || "—"}</TableCell>
                  <TableCell className="text-right text-sm">{fmt(p.avgPrice)}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{fmt(p.avgCost)}</TableCell>
                  <TableCell className="text-right text-sm font-semibold">{fmt(p.profit)}</TableCell>
                  <TableCell>{getMarginBadge(p.margin)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
