import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useMemo, useState } from "react";
import { getDay, getHours } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BrazilHeatMap } from "@/components/reports/BrazilHeatMap";
import { ExportButton } from "@/components/reports/ExportButton";
import { useExport } from "@/hooks/useExport";
import { Filter, X } from "lucide-react";

const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}h`);
const marketplaceOptions = ["Todos os canais", "Mercado Livre", "Shopee", "Amazon", "Magalu", "Americanas", "Shopify"];

export default function HeatmapReportPage() {
  const { profile } = useAuth();
  const { exportToExcel, exportToPDF } = useExport();
  const [tab, setTab] = useState("map");
  const [marketplaceFilter, setMarketplaceFilter] = useState("Todos os canais");
  const [brandFilter, setBrandFilter] = useState("Todas as marcas");

  const { data: brands = [] } = useQuery({
    queryKey: ["product-brands-heatmap", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data } = await supabase.from("products").select("brand").eq("tenant_id", profile.tenant_id).not("brand", "is", null);
      return [...new Set((data || []).map((p) => p.brand).filter(Boolean))] as string[];
    },
    enabled: !!profile?.tenant_id,
  });

  const hasFilters = marketplaceFilter !== "Todos os canais" || brandFilter !== "Todas as marcas";

  const { data: orders, isLoading } = useQuery({
    queryKey: ["report-heatmap", profile?.tenant_id, marketplaceFilter, brandFilter],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      let query = supabase.from("orders").select("created_at, total, marketplace, order_shipping(address), order_items(product_variant_id)").eq("tenant_id", profile.tenant_id).in("status", ["paid", "processing", "shipped", "delivered"]);
      if (marketplaceFilter !== "Todos os canais") query = query.eq("marketplace", marketplaceFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const stateData = useMemo(() => {
    const map: Record<string, { orders: number; revenue: number }> = {};
    (orders || []).forEach((o: any) => {
      (o.order_shipping || []).forEach((s: any) => {
        const state = s.address?.state || s.address?.uf;
        if (state) {
          if (!map[state]) map[state] = { orders: 0, revenue: 0 };
          map[state].orders += 1;
          map[state].revenue += Number(o.total) || 0;
        }
      });
    });
    const result: Record<string, { orders: number; revenue: number; avgTicket: number }> = {};
    Object.entries(map).forEach(([state, d]) => { result[state] = { ...d, avgTicket: d.orders > 0 ? d.revenue / d.orders : 0 }; });
    return result;
  }, [orders]);

  const stateTableData = useMemo(() => Object.entries(stateData).map(([state, d]) => ({ state, ...d })).sort((a, b) => b.revenue - a.revenue), [stateData]);

  const heatmap = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    (orders || []).forEach((o) => { const d = new Date(o.created_at); grid[getDay(d)][getHours(d)] += 1; });
    return grid;
  }, [orders]);

  const maxVal = useMemo(() => Math.max(1, ...heatmap.flat()), [heatmap]);
  const getColor = (val: number) => { if (val === 0) return "bg-muted"; const i = val / maxVal; if (i > 0.75) return "bg-primary"; if (i > 0.5) return "bg-primary/70"; if (i > 0.25) return "bg-primary/40"; return "bg-primary/20"; };
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6 print-area">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div><h1 className="text-2xl font-bold tracking-tight">Mapa de Calor</h1><p className="text-sm text-muted-foreground">Distribuição geográfica e temporal de pedidos</p></div>
        <ExportButton onExportExcel={() => exportToExcel(stateTableData.map((s) => ({ Estado: s.state, Pedidos: s.orders, Faturamento: s.revenue, "Ticket Médio": s.avgTicket.toFixed(2) })), "mapa-calor-estados")} onExportPDF={() => exportToPDF("Mapa de Calor - CineADS")} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="map">Mapa do Brasil</TabsTrigger><TabsTrigger value="peak">Horários de Pico</TabsTrigger></TabsList>

        <TabsContent value="map" className="space-y-6 mt-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={marketplaceFilter} onValueChange={setMarketplaceFilter}>
              <SelectTrigger className="w-52 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{marketplaceOptions.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas as marcas">Todas as marcas</SelectItem>
                {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasFilters && <Button variant="ghost" size="sm" className="h-9" onClick={() => { setMarketplaceFilter("Todos os canais"); setBrandFilter("Todas as marcas"); }}><X className="mr-1 h-3.5 w-3.5" /> Limpar</Button>}
          </div>

          <p className="text-sm font-medium text-muted-foreground">Vendas por Estado — {marketplaceFilter}{brandFilter !== "Todas as marcas" ? ` — ${brandFilter}` : ""}</p>

          {isLoading ? (
            <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
          ) : (
            <>
              <BrazilHeatMap stateData={stateData} />
              {stateTableData.length > 0 ? (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <Table>
                    <TableHeader><TableRow><TableHead>Estado</TableHead><TableHead className="text-right">Pedidos</TableHead><TableHead className="text-right">Faturamento</TableHead><TableHead className="text-right">Ticket Médio</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {stateTableData.map((s) => (
                        <TableRow key={s.state}><TableCell className="font-medium text-sm">{s.state}</TableCell><TableCell className="text-right text-sm">{s.orders}</TableCell><TableCell className="text-right text-sm font-semibold">{fmt(s.revenue)}</TableCell><TableCell className="text-right text-sm">{fmt(s.avgTicket)}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card p-12 text-center"><p className="text-muted-foreground">Sem dados de localização nos pedidos</p></div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="peak" className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-6 overflow-x-auto">
              <div className="min-w-[700px]">
                <div className="flex gap-1 mb-1"><div className="w-10 shrink-0" />{hourLabels.map((h) => <div key={h} className="flex-1 text-center text-[10px] text-muted-foreground">{h}</div>)}</div>
                {dayLabels.map((day, dayIdx) => (
                  <div key={day} className="flex gap-1 mb-1">
                    <div className="w-10 shrink-0 text-xs text-muted-foreground flex items-center">{day}</div>
                    {Array.from({ length: 24 }, (_, hourIdx) => <div key={hourIdx} className={`flex-1 h-7 rounded-sm ${getColor(heatmap[dayIdx][hourIdx])} transition-colors`} title={`${day} ${hourIdx}h: ${heatmap[dayIdx][hourIdx]} pedido(s)`} />)}
                  </div>
                ))}
                <div className="flex items-center gap-2 mt-4 justify-end">
                  <span className="text-xs text-muted-foreground">Menos</span>
                  <div className="w-5 h-4 rounded-sm bg-muted" /><div className="w-5 h-4 rounded-sm bg-primary/20" /><div className="w-5 h-4 rounded-sm bg-primary/40" /><div className="w-5 h-4 rounded-sm bg-primary/70" /><div className="w-5 h-4 rounded-sm bg-primary" />
                  <span className="text-xs text-muted-foreground">Mais</span>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
