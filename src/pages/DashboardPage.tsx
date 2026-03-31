import { useQuery } from "@tanstack/react-query";
import { ordersService } from "@/services/orders.service";
import { productsService } from "@/services/products.service";
import { useAuth } from "@/lib/auth";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { RecentOrdersTable } from "@/components/dashboard/RecentOrdersTable";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { MarketplaceStatusRow } from "@/components/dashboard/MarketplaceStatusRow";
import { DollarSign, ShoppingCart, Package, TrendingUp, BarChart2 } from "lucide-react";
import { motion } from "framer-motion";
import { subDays, startOfMonth, subMonths, endOfMonth } from "date-fns";

export default function DashboardPage() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["dashboard-kpis", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const yesterdayStart = subDays(today, 1);
      const yesterdayStartISO = new Date(yesterdayStart.getFullYear(), yesterdayStart.getMonth(), yesterdayStart.getDate()).toISOString();
      const startOfMonthISO = startOfMonth(today).toISOString();
      const prevMonthStart = startOfMonth(subMonths(today, 1)).toISOString();
      const prevMonthEnd = endOfMonth(subMonths(today, 1)).toISOString();
      const sevenDaysAgo = subDays(today, 7).toISOString();

      const [todayOrdersData, yesterdayOrdersData, monthOrdersData, prevMonthOrdersData, activosHoje, activos7d] = await Promise.all([
        ordersService.getOrdersForPeriod(tenantId, startOfDay),
        ordersService.getOrdersForPeriod(tenantId, yesterdayStartISO, startOfDay),
        ordersService.getOrdersForPeriod(tenantId, startOfMonthISO),
        ordersService.getOrdersForPeriod(tenantId, prevMonthStart, prevMonthEnd),
        productsService.getActiveProductsCount(tenantId),
        productsService.getActiveProductsCount(tenantId, sevenDaysAgo),
      ]);

      const todayTotal = todayOrdersData.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const todayCount = todayOrdersData.length;
      const yesterdayTotal = yesterdayOrdersData.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const yesterdayCount = yesterdayOrdersData.length;
      const monthTotal = monthOrdersData.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const monthCount = monthOrdersData.length;
      const prevMonthTotal = prevMonthOrdersData.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const prevMonthCount = prevMonthOrdersData.length;
      const ticketMedio = monthCount > 0 ? monthTotal / monthCount : 0;
      const prevTicket = prevMonthCount > 0 ? prevMonthTotal / prevMonthCount : 0;

      const pct = (curr: number, prev: number) => prev > 0 ? ((curr - prev) / prev * 100).toFixed(1) : curr > 0 ? "+100" : "0";

      return {
        vendasDia: todayTotal, vendasDiaChange: pct(todayTotal, yesterdayTotal),
        pedidosDia: todayCount, pedidosDiaChange: pct(todayCount, yesterdayCount),
        produtosAtivos: activosHoje, produtosAtivosChange: pct(activosHoje, activos7d),
        ticketMedio, ticketMedioChange: pct(ticketMedio, prevTicket),
        faturamentoMensal: monthTotal, faturamentoChange: pct(monthTotal, prevMonthTotal),
      };
    },
    enabled: !!tenantId,
  });

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const trendDir = (v: string) => parseFloat(v) >= 0 ? "up" as const : "down" as const;
  const trendLabel = (v: string) => `${parseFloat(v) >= 0 ? "+" : ""}${v}%`;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do seu negócio</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard title="Vendas do Dia" value={fmt(kpis?.vendasDia || 0)} change={kpis ? trendLabel(kpis.vendasDiaChange) : ""} trend={kpis ? trendDir(kpis.vendasDiaChange) : "up"} icon={<DollarSign className="h-4 w-4" />} index={0} isLoading={kpisLoading} />
        <KpiCard title="Pedidos do Dia" value={String(kpis?.pedidosDia || 0)} change={kpis ? trendLabel(kpis.pedidosDiaChange) : ""} trend={kpis ? trendDir(kpis.pedidosDiaChange) : "up"} icon={<ShoppingCart className="h-4 w-4" />} index={1} isLoading={kpisLoading} />
        <KpiCard title="Produtos Ativos" value={String(kpis?.produtosAtivos || 0)} change={kpis ? trendLabel(kpis.produtosAtivosChange) : ""} trend={kpis ? trendDir(kpis.produtosAtivosChange) : "up"} icon={<Package className="h-4 w-4" />} index={2} isLoading={kpisLoading} />
        <KpiCard title="Ticket Médio" value={fmt(kpis?.ticketMedio || 0)} change={kpis ? trendLabel(kpis.ticketMedioChange) : ""} trend={kpis ? trendDir(kpis.ticketMedioChange) : "up"} icon={<TrendingUp className="h-4 w-4" />} index={3} isLoading={kpisLoading} />
        <KpiCard title="Faturamento Mensal" value={fmt(kpis?.faturamentoMensal || 0)} change={kpis ? trendLabel(kpis.faturamentoChange) : ""} trend={kpis ? trendDir(kpis.faturamentoChange) : "up"} icon={<BarChart2 className="h-4 w-4" />} index={4} isLoading={kpisLoading} />
      </div>

      <MarketplaceStatusRow />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><SalesChart /></div>
        <AlertsPanel />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.4 }}>
        <RecentOrdersTable />
      </motion.div>
    </div>
  );
}
