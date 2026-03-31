import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const marketplaceOptions = ["Todos os canais", "Mercado Livre", "Shopee", "Amazon", "Magalu", "Americanas", "Shopify"];

const states = [
  "Todo o Brasil", "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ",
  "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export interface ReportFilters {
  marketplace: string;
  region: string;
  brand: string;
}

export const defaultReportFilters: ReportFilters = {
  marketplace: "Todos os canais",
  region: "Todo o Brasil",
  brand: "Todas as marcas",
};

interface Props {
  filters: ReportFilters;
  onChange: (filters: ReportFilters) => void;
  showMarketplace?: boolean;
  showRegion?: boolean;
  showBrand?: boolean;
}

export function ReportFiltersBar({ filters, onChange, showMarketplace = true, showRegion = true, showBrand = true }: Props) {
  const { profile } = useAuth();

  const { data: brands = [] } = useQuery({
    queryKey: ["product-brands", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data } = await supabase
        .from("products")
        .select("brand")
        .eq("tenant_id", profile.tenant_id)
        .not("brand", "is", null);
      const unique = [...new Set((data || []).map((p) => p.brand).filter(Boolean))] as string[];
      return unique.sort();
    },
    enabled: !!profile?.tenant_id && showBrand,
  });

  const hasFilters = filters.marketplace !== "Todos os canais" || filters.region !== "Todo o Brasil" || filters.brand !== "Todas as marcas";

  return (
    <div className="flex flex-wrap gap-3 items-end">
      {showMarketplace && (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Marketplace</label>
          <Select value={filters.marketplace} onValueChange={(v) => onChange({ ...filters, marketplace: v })}>
            <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{marketplaceOptions.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      {showRegion && (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Região / Estado</label>
          <Select value={filters.region} onValueChange={(v) => onChange({ ...filters, region: v })}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      {showBrand && (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Marca</label>
          <Select value={filters.brand} onValueChange={(v) => onChange({ ...filters, brand: v })}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Todas as marcas">Todas as marcas</SelectItem>
              {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      {hasFilters && (
        <Button variant="ghost" size="sm" className="h-9" onClick={() => onChange(defaultReportFilters)}>
          <X className="mr-1 h-3.5 w-3.5" /> Limpar
        </Button>
      )}
    </div>
  );
}
