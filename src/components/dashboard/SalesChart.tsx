import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { subDays, format, startOfDay } from "date-fns";

const MARKETPLACE_COLORS: Record<string, string> = {
  mercadolivre:  "#FFE600",
  mercado_livre: "#FFE600",
  shopee:        "#EE4D2D",
  amazon:        "#FF9900",
};

function getColor(marketplace: string) {
  return MARKETPLACE_COLORS[marketplace.toLowerCase()] ?? "#6366f1";
}

function getDateRange(period: string) {
  const now = new Date();
  if (period === "Hoje")   return { from: startOfDay(now).toISOString(), groupBy: "hour" as const };
  if (period === "7 dias") return { from: subDays(now, 6).toISOString(),  groupBy: "day"  as const };
                           return { from: subDays(now, 29).toISOString(), groupBy: "day"  as const };
}

const periods = ["Hoje", "7 dias", "30 dias"];

export function SalesChart() {
  const { profile } = useAuth();
  const [activePeriod, setActivePeriod] = useState("7 dias");
  const { from, groupBy } = getDateRange(activePeriod);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["sales-chart", profile?.tenant_id, activePeriod],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("created_at, total, marketplace")
        .eq("tenant_id", profile.tenant_id)
        .gte("created_at", from)
        .neq("status", "cancelled");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.tenant_id,
  });

  const { chartData, marketplaces } = useMemo(() => {
    const groups: Record<string, Record<string, number | string>> = {};
    const mpSet = new Set<string>();

    for (const order of orders) {
      const label = groupBy === "hour"
        ? format(new Date(order.created_at), "HH'h'")
        : format(new Date(order.created_at), "dd/MM");
      const mp = order.marketplace ?? "outros";
      mpSet.add(mp);
      if (!groups[label]) groups[label] = { date: label };
      groups[label][mp] = ((groups[label][mp] as number) ?? 0) + Number(order.total ?? 0);
    }

    const chartData = Object.values(groups).sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    );

    return { chartData, marketplaces: Array.from(mpSet) };
  }, [orders, groupBy]);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Vendas por Período</h3>
        <div className="flex gap-1">
          {periods.map((p) => (
            <Button
              key={p}
              variant={activePeriod === p ? "default" : "ghost"}
              size="sm"
              className={cn("text-xs h-7", activePeriod === p && "bg-primary text-primary-foreground")}
              onClick={() => setActivePeriod(p)}
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
          Carregando...
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
          Nenhum pedido no período
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(v: number) => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: 12,
              }}
              formatter={(value: number) => [
                `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                undefined,
              ]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {marketplaces.map((mp) => (
              <Line
                key={mp}
                type="monotone"
                dataKey={mp}
                stroke={getColor(mp)}
                strokeWidth={2}
                name={mp}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
