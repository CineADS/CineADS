import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { Tooltip } from "@/components/ui/tooltip";
import { TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const GEO_URL = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

interface StateData {
  orders: number;
  revenue: number;
  avgTicket: number;
}

interface BrazilHeatMapProps {
  stateData: Record<string, StateData>;
}

const COLOR_SCALE = [
  { threshold: 0, color: "hsl(var(--muted))" },
  { threshold: 0.01, color: "#FFCDD2" },
  { threshold: 0.15, color: "#EF9A9A" },
  { threshold: 0.35, color: "#E57373" },
  { threshold: 0.6, color: "#EF5350" },
  { threshold: 0.8, color: "#E8001C" },
];

const getColor = (value: number, maxValue: number) => {
  if (value === 0) return COLOR_SCALE[0].color;
  const ratio = maxValue > 0 ? value / maxValue : 0;
  for (let i = COLOR_SCALE.length - 1; i >= 0; i--) {
    if (ratio >= COLOR_SCALE[i].threshold) return COLOR_SCALE[i].color;
  }
  return COLOR_SCALE[0].color;
};

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function BrazilHeatMap({ stateData }: BrazilHeatMapProps) {
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [tooltipContent, setTooltipContent] = useState("");

  const maxRevenue = useMemo(
    () => Math.max(1, ...Object.values(stateData).map((d) => d.revenue)),
    [stateData]
  );

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="text-sm font-semibold mb-4">Vendas por Estado</h3>
      <div className="flex gap-6">
        <div className="flex-1 relative" style={{ minHeight: 400 }}>
          {tooltipContent && (
            <div className="absolute top-2 left-2 z-10 bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-sm">
              <div dangerouslySetInnerHTML={{ __html: tooltipContent }} />
            </div>
          )}
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ scale: 600, center: [-54, -15] }}
            width={500}
            height={500}
            style={{ width: "100%", height: "auto" }}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const name = geo.properties.name;
                  const data = stateData[name] || { orders: 0, revenue: 0, avgTicket: 0 };
                  const fill = getColor(data.revenue, maxRevenue);

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={fill}
                      stroke="hsl(var(--border))"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { outline: "none", opacity: 0.8 },
                        pressed: { outline: "none" },
                      }}
                      onMouseEnter={() => {
                        setHoveredState(name);
                        setTooltipContent(
                          `<strong>${name}</strong><br/>Pedidos: ${data.orders}<br/>Faturamento: ${fmt(data.revenue)}<br/>Ticket Médio: ${fmt(data.avgTicket)}`
                        );
                      }}
                      onMouseLeave={() => {
                        setHoveredState(null);
                        setTooltipContent("");
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ComposableMap>
        </div>

        {/* Legend */}
        <div className="flex flex-col justify-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground font-medium mb-1">Intensidade</span>
          {[
            { color: "hsl(var(--muted))", label: "Sem vendas" },
            { color: "#FFCDD2", label: "Baixo" },
            { color: "#EF9A9A", label: "Médio-baixo" },
            { color: "#E57373", label: "Médio" },
            { color: "#EF5350", label: "Médio-alto" },
            { color: "#E8001C", label: "Alto" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="w-4 h-3 rounded-sm border border-border" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
