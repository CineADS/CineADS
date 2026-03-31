import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, Legend } from "recharts";

interface ParetoItem {
  title: string;
  revenue: number;
  pct: number;
  cumPct: number;
  curve: string;
}

interface ParetoChartProps {
  data: ParetoItem[];
}

const curveColors: Record<string, string> = {
  A: "#16A34A",
  B: "#EA580C",
  C: "#E8001C",
};

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const legendPayload = [
  { value: "Classe A (top 80%)", type: "square" as const, color: "#16A34A" },
  { value: "Classe B (80-95%)", type: "square" as const, color: "#EA580C" },
  { value: "Classe C (95%+)", type: "square" as const, color: "#E8001C" },
  { value: "Acumulado", type: "line" as const, color: "hsl(var(--primary))" },
];

export function ParetoChart({ data }: ParetoChartProps) {
  const chartData = data.slice(0, 30).map((d) => ({
    ...d,
    shortTitle: d.title.length > 12 ? d.title.slice(0, 12) + "…" : d.title,
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="text-sm font-semibold mb-4">Gráfico de Pareto</h3>
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="shortTitle" className="text-[10px]" angle={-45} textAnchor="end" height={80} interval={0} />
          <YAxis yAxisId="left" className="text-xs" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
          <YAxis yAxisId="right" orientation="right" className="text-xs" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "hsl(var(--card))", color: "hsl(var(--card-foreground))" }}
            formatter={(value: number, name: string) => {
              if (name === "Faturamento") return fmt(value);
              return `${value.toFixed(1)}%`;
            }}
            labelFormatter={(label) => {
              const item = chartData.find((d) => d.shortTitle === label);
              return item ? `${item.title} (Classe ${item.curve})` : label;
            }}
          />
          <Legend payload={legendPayload} />
          <ReferenceLine yAxisId="right" y={80} stroke="#16A34A" strokeDasharray="5 5" label={{ value: "80%", position: "right", fontSize: 10 }} />
          <ReferenceLine yAxisId="right" y={95} stroke="#EA580C" strokeDasharray="5 5" label={{ value: "95%", position: "right", fontSize: 10 }} />
          <Bar yAxisId="left" dataKey="revenue" name="Faturamento" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={curveColors[entry.curve] || curveColors.C} />
            ))}
          </Bar>
          <Line yAxisId="right" type="monotone" dataKey="cumPct" name="Acumulado" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
