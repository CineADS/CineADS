import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

import amazonLogo from "@/assets/logos/amazon.png";
import americanasLogo from "@/assets/logos/americanas.png";
import magaluLogo from "@/assets/logos/magalu.png";
import mercadolivreLogo from "@/assets/logos/mercadolivre.png";
import shopeeLogo from "@/assets/logos/shopee.png";
import shopifyLogo from "@/assets/logos/shopify.png";

const defaultMarketplaces = [
  { name: "Mercado Livre", logo: mercadolivreLogo, key: "Mercado Livre" },
  { name: "Shopee", logo: shopeeLogo, key: "Shopee" },
  { name: "Amazon", logo: amazonLogo, key: "Amazon" },
  { name: "Magalu", logo: magaluLogo, key: "Magalu" },
  { name: "Americanas", logo: americanasLogo, key: "Americanas" },
  { name: "Shopify", logo: shopifyLogo, key: "Shopify" },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  connected: { label: "Conectado", className: "bg-success/15 text-success border-success/30" },
  disconnected: { label: "Desconectado", className: "bg-muted text-muted-foreground border-border" },
  error: { label: "Erro", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

export function MarketplaceStatusRow() {
  const { profile } = useAuth();

  const { data: integrations, isLoading } = useQuery({
    queryKey: ["marketplace-integrations", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("marketplace_integrations")
        .select("marketplace, status")
        .eq("tenant_id", profile.tenant_id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.tenant_id,
  });

  const getStatus = (key: string) => {
    const integration = (integrations || []).find((i) => i.marketplace === key);
    return integration?.status || "disconnected";
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Status dos Canais de Venda</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {defaultMarketplaces.map((mp, i) => {
          if (isLoading) {
            return <Skeleton key={mp.name} className="h-28 rounded-xl" />;
          }
          const status = getStatus(mp.key);
          const st = statusConfig[status] || statusConfig.disconnected;
          return (
            <motion.div key={mp.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-card p-4 flex flex-col items-center gap-2 hover:shadow-sm transition-shadow">
              <img src={mp.logo} alt={mp.name} className="h-8 w-8 object-contain" />
              <span className="text-xs font-medium text-center leading-tight">{mp.name}</span>
              <Badge variant="outline" className={cn("text-[10px] px-2 py-0", st.className)}>{st.label}</Badge>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default MarketplaceStatusRow;
