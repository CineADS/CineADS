import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryService } from "@/services/inventory.service";
import { productsService } from "@/services/products.service";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Package, Search, TrendingDown, TrendingUp, Settings2, Plus, Pencil, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const CRITICAL_THRESHOLD = 5;
const LOW_THRESHOLD = 15;
const marketplaceOptions = ["Mercado Livre", "Shopee", "Amazon", "Magalu", "Americanas", "Shopify", "Todos"];

export default function InventoryPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("overview");
  const [stockFilter, setStockFilter] = useState("all");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");

  // Fetch warehouses
  const { data: warehouses } = useQuery({
    queryKey: ["warehouses", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      return inventoryService.listWarehouses(profile.tenant_id);
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["inventory-products", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      return productsService.listProductsForInventory(profile.tenant_id);
    },
    enabled: !!profile?.tenant_id,
  });

  const flatVariants = useMemo(() => {
    if (!products) return [];
    return products.flatMap((p) => (p.variants || []).map((v: any) => ({
      productTitle: p.title, productSku: p.sku, variantId: v.id, variantSku: v.sku,
      stock: v.stock ?? 0, combination: v.combination, price: v.price, cost: v.cost,
      warehouseStocks: v.warehouseStocks as Record<string, number> | null,
    })));
  }, [products]);

  const filtered = useMemo(() => {
    let list = flatVariants;

    // Warehouse filter
    if (selectedWarehouse !== "all") {
      list = list.filter((v) => {
        const ws = v.warehouseStocks;
        if (!ws) return false;
        return (ws[selectedWarehouse] ?? 0) > 0;
      });
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((v) => v.productTitle.toLowerCase().includes(q) || (v.productSku || "").toLowerCase().includes(q) || (v.variantSku || "").toLowerCase().includes(q));
    }

    // Get effective stock for filtering
    const getStock = (v: typeof list[0]) => {
      if (selectedWarehouse !== "all" && v.warehouseStocks) return v.warehouseStocks[selectedWarehouse] ?? 0;
      return v.stock;
    };

    if (stockFilter === "zero") list = list.filter((v) => getStock(v) === 0);
    else if (stockFilter === "critical") list = list.filter((v) => { const s = getStock(v); return s > 0 && s <= CRITICAL_THRESHOLD; });
    else if (stockFilter === "normal") list = list.filter((v) => getStock(v) > CRITICAL_THRESHOLD);
    return list;
  }, [flatVariants, search, stockFilter, selectedWarehouse]);

  const getEffectiveStock = (v: typeof flatVariants[0]) => {
    if (selectedWarehouse !== "all" && v.warehouseStocks) return v.warehouseStocks[selectedWarehouse] ?? 0;
    return v.stock;
  };

  const critical = flatVariants.filter((v) => v.stock <= CRITICAL_THRESHOLD);
  const low = flatVariants.filter((v) => v.stock > CRITICAL_THRESHOLD && v.stock <= LOW_THRESHOLD);
  const totalStock = flatVariants.reduce((sum, v) => sum + v.stock, 0);

  const getStockBadge = (stock: number) => {
    if (stock === 0) return <Badge variant="destructive" className="text-xs">Zerado</Badge>;
    if (stock <= CRITICAL_THRESHOLD) return <Badge variant="destructive" className="text-xs">Crítico</Badge>;
    if (stock <= LOW_THRESHOLD) return <Badge variant="outline" className="text-xs bg-warning/15 text-warning border-warning/30">Baixo</Badge>;
    return <Badge variant="outline" className="text-xs bg-success/15 text-success border-success/30">OK</Badge>;
  };

  const combinationLabel = (combo: any) => { if (!combo || typeof combo !== "object") return "—"; return Object.values(combo).join(" / "); };

  // ==================== RULES TAB ====================
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);
  const [ruleProductId, setRuleProductId] = useState("");
  const [ruleMarketplace, setRuleMarketplace] = useState("Todos");
  const [ruleMinStock, setRuleMinStock] = useState("5");
  const [ruleMaxAvailable, setRuleMaxAvailable] = useState("");

  const { data: stockRules, isLoading: rulesLoading } = useQuery({
    queryKey: ["stock-rules", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      return inventoryService.listStockRules(profile.tenant_id);
    },
    enabled: !!profile?.tenant_id,
  });

  const saveRule = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id || !ruleProductId) return;
      await inventoryService.saveStockRule({
        id: editingRule?.id,
        tenantId: profile.tenant_id,
        productId: ruleProductId,
        marketplace: ruleMarketplace,
        minStock: Number(ruleMinStock) || 0,
        maxAvailable: ruleMaxAvailable ? Number(ruleMaxAvailable) : null,
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stock-rules"] }); toast.success(editingRule ? "Regra atualizada" : "Regra criada"); closeRuleModal(); },
    onError: (err: any) => toast.error("Erro: " + err.message),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => { await inventoryService.deleteStockRule(id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["stock-rules"] }); toast.success("Regra excluída"); setDeleteRuleId(null); },
    onError: (err: any) => toast.error("Erro: " + err.message),
  });

  const openEditRule = (rule: any) => { setEditingRule(rule); setRuleProductId(rule.productId); setRuleMarketplace(rule.marketplace); setRuleMinStock(String(rule.minStock || 0)); setRuleMaxAvailable(rule.maxAvailable ? String(rule.maxAvailable) : ""); setShowRuleModal(true); };
  const closeRuleModal = () => { setShowRuleModal(false); setEditingRule(null); setRuleProductId(""); setRuleMarketplace("Todos"); setRuleMinStock("5"); setRuleMaxAvailable(""); };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Estoque</h1><p className="text-sm text-muted-foreground">{flatVariants.length} variantes ativas</p></div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="overview">Visão Geral</TabsTrigger><TabsTrigger value="rules">Regras por Canal</TabsTrigger></TabsList>

        <TabsContent value="overview" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Package className="h-4 w-4" /> Total em Estoque</div><p className="text-2xl font-bold">{totalStock.toLocaleString("pt-BR")}</p></div>
            <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><TrendingUp className="h-4 w-4 text-success" /> Variantes OK</div><p className="text-2xl font-bold text-success">{flatVariants.length - critical.length - low.length}</p></div>
            <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><TrendingDown className="h-4 w-4 text-warning" /> Estoque Baixo</div><p className="text-2xl font-bold text-warning">{low.length}</p></div>
            <div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><AlertTriangle className="h-4 w-4 text-destructive" /> Estoque Crítico</div><p className="text-2xl font-bold text-destructive">{critical.length}</p></div>
          </div>

          {critical.length > 0 && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <h3 className="text-sm font-semibold text-destructive flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4" /> Atenção: {critical.length} variante(s) com estoque crítico</h3>
              <div className="flex flex-wrap gap-2">
                {critical.slice(0, 10).map((v) => (<Badge key={v.variantId} variant="destructive" className="text-xs">{v.productTitle} {v.variantSku ? `(${v.variantSku})` : ""} — {v.stock} un.</Badge>))}
                {critical.length > 10 && <span className="text-xs text-muted-foreground">+{critical.length - 10} mais</span>}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por produto ou SKU..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status do Estoque" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
                <SelectItem value="zero">Zerado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
              <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Armazém" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Armazéns</SelectItem>
                {(warehouses || []).map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}{w.isDefault ? " (Padrão)" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Variação</TableHead><TableHead>SKU</TableHead><TableHead className="text-right">Estoque</TableHead><TableHead className="text-right">Custo</TableHead><TableHead className="text-right">Preço</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma variante encontrada</TableCell></TableRow>
                  ) : filtered.map((v) => {
                    const effectiveStock = getEffectiveStock(v);
                    return (
                      <TableRow key={v.variantId}>
                        <TableCell className="font-medium text-sm">{v.productTitle}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{combinationLabel(v.combination)}</TableCell>
                        <TableCell className="font-mono text-xs">{v.variantSku || v.productSku || "—"}</TableCell>
                        <TableCell className="text-right font-semibold text-sm">{effectiveStock}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">{v.cost ? `R$ ${Number(v.cost).toFixed(2)}` : "—"}</TableCell>
                        <TableCell className="text-right text-sm">{v.price ? `R$ ${Number(v.price).toFixed(2)}` : "—"}</TableCell>
                        <TableCell>{getStockBadge(effectiveStock)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rules" className="mt-4 space-y-6">
          <div className="flex items-center justify-between">
            <div><h2 className="text-lg font-semibold">Regras por Canal</h2><p className="text-sm text-muted-foreground">Configure estoque mínimo e máximo por marketplace</p></div>
            <Button onClick={() => setShowRuleModal(true)}><Plus className="mr-2 h-4 w-4" /> Nova Regra</Button>
          </div>

          {rulesLoading ? (
            <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
          ) : (stockRules || []).length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Settings2 className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-lg font-medium">Nenhuma regra configurada</p>
              <p className="text-sm text-muted-foreground">Clique em Nova Regra para começar.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Marketplace</TableHead><TableHead className="text-right">Estoque Mínimo</TableHead><TableHead className="text-right">Máx. Disponível</TableHead><TableHead className="w-24">Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(stockRules || []).map((rule: any) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium text-sm">{rule.productTitle || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{rule.marketplace}</Badge></TableCell>
                      <TableCell className="text-right text-sm">{rule.minStock ?? "—"}</TableCell>
                      <TableCell className="text-right text-sm">{rule.maxAvailable ?? "Sem limite"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditRule(rule)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteRuleId(rule.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Rule Modal */}
      <Dialog open={showRuleModal} onOpenChange={(open) => !open && closeRuleModal()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingRule ? "Editar Regra" : "Nova Regra"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Produto</Label><Select value={ruleProductId} onValueChange={setRuleProductId}><SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger><SelectContent>{(products || []).map((p) => (<SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>))}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Marketplace</Label><Select value={ruleMarketplace} onValueChange={setRuleMarketplace}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{marketplaceOptions.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Estoque Mínimo</Label><Input type="number" value={ruleMinStock} onChange={(e) => setRuleMinStock(e.target.value)} placeholder="5" /></div>
              <div className="space-y-2"><Label>Máx. Disponível</Label><Input type="number" value={ruleMaxAvailable} onChange={(e) => setRuleMaxAvailable(e.target.value)} placeholder="Sem limite" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeRuleModal}>Cancelar</Button>
            <Button onClick={() => saveRule.mutate()} disabled={saveRule.isPending || !ruleProductId}>{saveRule.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteRuleId} onOpenChange={(open) => !open && setDeleteRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir regra?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteRuleId && deleteRule.mutate(deleteRuleId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
