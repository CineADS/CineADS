import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Clock, Package, Plug, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";

export default function OperationsPage() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const { data: stats, isLoading } = useQuery({
    queryKey: ["operations-summary", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const [ordersRes, lowStockRes, errorsRes, pausedRes] = await Promise.all([
        supabase.from("orders").select("id, status, order_number, created_at", { count: "exact" })
          .eq("tenant_id", tenantId).eq("status", "pending").order("created_at", { ascending: false }).limit(10),
        supabase.from("product_variants").select("id, sku, stock, products!inner(title, tenant_id)")
          .eq("products.tenant_id", tenantId).lt("stock", 5).order("stock").limit(10),
        supabase.from("integration_logs").select("id, marketplace, message, created_at")
          .eq("tenant_id", tenantId).eq("type", "error").eq("resolved", false).order("created_at", { ascending: false }).limit(10),
        supabase.from("marketplace_listings").select("id, marketplace, products!inner(title, tenant_id)")
          .eq("products.tenant_id", tenantId).eq("status", "paused").limit(10),
      ]);

      return {
        pendingOrders: ordersRes.data || [],
        pendingOrdersCount: ordersRes.count || 0,
        lowStock: lowStockRes.data || [],
        integrationErrors: errorsRes.data || [],
        pausedListings: pausedRes.data || [],
      };
    },
    enabled: !!tenantId,
  });

  const kpis = [
    { label: "Pedidos Pendentes", value: stats?.pendingOrdersCount ?? 0, icon: ShoppingCart, color: "text-warning" },
    { label: "Estoque Crítico", value: stats?.lowStock?.length ?? 0, icon: Package, color: "text-destructive" },
    { label: "Erros de Integração", value: stats?.integrationErrors?.length ?? 0, icon: Plug, color: "text-destructive" },
    { label: "Anúncios Pausados", value: stats?.pausedListings?.length ?? 0, icon: AlertTriangle, color: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Centro de Operações</h1>
        <p className="text-sm text-muted-foreground">Alertas e pendências operacionais</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className={`p-3 rounded-lg bg-muted ${k.color}`}>
                <k.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{k.value}</p>
                <p className="text-xs text-muted-foreground">{k.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(stats?.lowStock?.length ?? 0) > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-destructive" /> Estoque Crítico</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats!.lowStock.map((v: any) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{(v.products as any)?.title || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{v.sku || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={v.stock === 0 ? "bg-destructive/15 text-destructive border-destructive/30" : "bg-warning/15 text-warning border-warning/30"}>
                        {v.stock}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {(stats?.integrationErrors?.length ?? 0) > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Plug className="h-5 w-5 text-destructive" /> Erros de Integração</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Marketplace</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats!.integrationErrors.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.marketplace}</TableCell>
                    <TableCell className="text-sm">{e.message}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
