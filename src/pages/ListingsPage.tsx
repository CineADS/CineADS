import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, List, Pause, Play, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { listingService } from "@/listings/listing-service";

const statusBadge: Record<string, { label: string; class: string }> = {
  active: { label: "Ativo", class: "bg-success/15 text-success border-success/30" },
  pending: { label: "Pendente", class: "bg-warning/15 text-warning border-warning/30" },
  paused: { label: "Pausado", class: "bg-muted text-muted-foreground border-border" },
  error: { label: "Erro", class: "bg-destructive/15 text-destructive border-destructive/30" },
  inactive: { label: "Inativo", class: "bg-muted text-muted-foreground border-border" },
};

export default function ListingsPage() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const [marketplace, setMarketplace] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: listings, isLoading, refetch } = useQuery({
    queryKey: ["listings", tenantId, marketplace],
    queryFn: async () => {
      if (!tenantId) return [];
      let query = supabase
        .from("marketplace_listings")
        .select("*, products!inner(title, sku)")
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false });
      if (marketplace !== "all") query = query.eq("marketplace", marketplace);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const handlePause = async (productId: string, mkt: string) => {
    if (!tenantId) return;
    await listingService.pauseListing(tenantId, productId, mkt, "Manual pause");
    toast.success("Anúncio pausado");
    refetch();
  };

  const handleResume = async (productId: string, mkt: string) => {
    if (!tenantId) return;
    await listingService.resumeListing(tenantId, productId, mkt);
    toast.success("Anúncio reativado");
    refetch();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = (listings || []).filter((l: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return l.products?.title?.toLowerCase().includes(s) || l.products?.sku?.toLowerCase().includes(s);
  });

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Anúncios</h1>
        <p className="text-sm text-muted-foreground">Gerencie seus anúncios em marketplaces</p>
      </motion.div>

      <div className="flex flex-wrap gap-3 items-center">
        <Select value={marketplace} onValueChange={setMarketplace}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Marketplace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Mercado Livre">Mercado Livre</SelectItem>
            <SelectItem value="Shopee">Shopee</SelectItem>
            <SelectItem value="Amazon">Amazon</SelectItem>
            <SelectItem value="Magalu">Magalu</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar anúncios..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Anúncios ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Nenhum anúncio encontrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Marketplace</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l: any) => {
                  const st = statusBadge[l.status] || statusBadge.inactive;
                  return (
                    <TableRow key={l.id}>
                      <TableCell>
                        <Checkbox checked={selected.has(l.id)} onCheckedChange={() => toggleSelect(l.id)} />
                      </TableCell>
                      <TableCell className="font-medium">{l.products?.title || "—"}</TableCell>
                      <TableCell>{l.marketplace || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={st.class}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{fmt(l.price ?? 0)}</TableCell>
                      <TableCell className="text-right font-mono">{l.stock ?? 0}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {l.status === "active" ? (
                            <Button variant="ghost" size="icon" onClick={() => handlePause(l.product_id, l.marketplace)} title="Pausar">
                              <Pause className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" onClick={() => handleResume(l.product_id, l.marketplace)} title="Reativar">
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
