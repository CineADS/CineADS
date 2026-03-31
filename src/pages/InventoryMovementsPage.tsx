import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, Plus, ArrowLeftRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
  in: { label: "Entrada", icon: ArrowDownCircle, color: "text-success" },
  out: { label: "Saída", icon: ArrowUpCircle, color: "text-destructive" },
  sale: { label: "Venda", icon: ArrowUpCircle, color: "text-destructive" },
  return: { label: "Devolução", icon: ArrowDownCircle, color: "text-success" },
  adjustment: { label: "Ajuste", icon: RefreshCw, color: "text-primary" },
  transfer_out: { label: "Transf. Saída", icon: ArrowLeftRight, color: "text-blue-500" },
  transfer_in: { label: "Transf. Entrada", icon: ArrowLeftRight, color: "text-blue-500" },
};

const reasons = ["Compra de estoque", "Venda manual", "Devolução", "Ajuste de inventário", "Perda/Avaria", "Transferência"];

export default function InventoryMovementsPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [movType, setMovType] = useState("in");
  const [selectedVariant, setSelectedVariant] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [variantSearch, setVariantSearch] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [transferOrigin, setTransferOrigin] = useState("");
  const [transferDest, setTransferDest] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const { data: movementsData, isLoading } = useQuery({
    queryKey: ["stock-movements", profile?.tenant_id, page],
    queryFn: async () => {
      if (!profile?.tenant_id) return { data: [], count: 0 };
      const { data, error, count } = await supabase
        .from("stock_movements")
        .select("*, product_variants(sku, combination, products(title)), warehouses(name)", { count: "exact" })
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
    enabled: !!profile?.tenant_id,
  });

  const movements = movementsData?.data || [];
  const totalCount = movementsData?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const { data: variants } = useQuery({
    queryKey: ["all-variants", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, title, product_variants(id, sku, stock, warehouse_stocks)")
        .eq("tenant_id", profile.tenant_id)
        .eq("status", "active");
      if (error) throw error;
      return (data || []).flatMap((p) =>
        (p.product_variants || []).map((v: any) => ({
          variantId: v.id,
          label: `${p.title}${v.sku ? ` (${v.sku})` : ""}`,
          stock: v.stock ?? 0,
          warehouseStocks: v.warehouse_stocks as Record<string, number> | null,
        }))
      );
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses-active", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase.from("warehouses").select("id, name, is_default").eq("tenant_id", profile.tenant_id).eq("active", true).order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.tenant_id,
  });

  // Set default warehouse
  const defaultWarehouse = (warehouses || []).find((w) => w.is_default);

  const filteredVariants = (variants || []).filter((v) =>
    !variantSearch || v.label.toLowerCase().includes(variantSearch.toLowerCase())
  );

  const isTransfer = movType === "transfer";

  const handleSave = async () => {
    if (!profile?.tenant_id || !selectedVariant || !quantity) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (isTransfer) {
      if (!transferOrigin || !transferDest) { toast.error("Selecione os armazéns de origem e destino"); return; }
      if (transferOrigin === transferDest) { toast.error("Origem e destino devem ser diferentes"); return; }
    }

    setSaving(true);
    const qty = Math.abs(parseInt(quantity));
    const variant = (variants || []).find((v) => v.variantId === selectedVariant);

    try {
      if (isTransfer) {
        // Create two movements: transfer_out + transfer_in
        const { error: e1 } = await supabase.from("stock_movements").insert({
          tenant_id: profile.tenant_id, product_variant_id: selectedVariant,
          type: "transfer_out", quantity: -qty, reason: reason || "Transferência",
          warehouse_id: transferOrigin, created_by: null,
        });
        if (e1) throw e1;

        const { error: e2 } = await supabase.from("stock_movements").insert({
          tenant_id: profile.tenant_id, product_variant_id: selectedVariant,
          type: "transfer_in", quantity: qty, reason: reason || "Transferência",
          warehouse_id: transferDest, created_by: null,
        });
        if (e2) throw e2;

        // Update warehouse_stocks JSONB
        if (variant) {
          const stocks = { ...(variant.warehouseStocks || {}) };
          stocks[transferOrigin] = Math.max(0, (stocks[transferOrigin] || 0) - qty);
          stocks[transferDest] = (stocks[transferDest] || 0) + qty;
          await supabase.from("product_variants").update({ warehouse_stocks: stocks }).eq("id", selectedVariant);
        }

        const originName = (warehouses || []).find((w) => w.id === transferOrigin)?.name || "Origem";
        const destName = (warehouses || []).find((w) => w.id === transferDest)?.name || "Destino";
        toast.success(`Transferência realizada: ${qty} unidades de ${originName} → ${destName}`);
      } else {
        const finalQty = movType === "out" ? -qty : (movType === "adjustment" ? parseInt(quantity) : qty);
        const { error } = await supabase.from("stock_movements").insert({
          tenant_id: profile.tenant_id, product_variant_id: selectedVariant,
          type: movType, quantity: finalQty, reason: reason || null,
          warehouse_id: warehouseId || null, created_by: null,
        });
        if (error) throw error;

        // Update variant stock
        if (variant) {
          await supabase.from("product_variants").update({ stock: variant.stock + finalQty }).eq("id", selectedVariant);
          // Update warehouse_stocks if warehouse selected
          if (warehouseId) {
            const stocks = { ...(variant.warehouseStocks || {}) };
            stocks[warehouseId] = Math.max(0, (stocks[warehouseId] || 0) + finalQty);
            await supabase.from("product_variants").update({ warehouse_stocks: stocks }).eq("id", selectedVariant);
          }
        }
        toast.success("Movimentação registrada!");
      }

      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["all-variants"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] });
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
    setSaving(false);
  };

  const resetForm = () => {
    setSelectedVariant(""); setQuantity(""); setReason(""); setNotes("");
    setWarehouseId(""); setTransferOrigin(""); setTransferDest(""); setMovType("in");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Movimentações de Estoque</h1>
          <p className="text-sm text-muted-foreground">{totalCount} movimentações</p>
        </div>
        <Button onClick={() => { resetForm(); setWarehouseId(defaultWarehouse?.id || ""); setShowModal(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Registrar Movimentação
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (movements || []).length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <RefreshCw className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-lg font-medium">Nenhuma movimentação registrada</p>
          <p className="text-sm text-muted-foreground">Movimentações aparecerão aqui conforme o estoque for alterado.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Armazém</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(movements || []).map((m: any) => {
                const cfg = typeConfig[m.type] || typeConfig.adjustment;
                const Icon = cfg.icon;
                const variant = m.product_variants;
                const productTitle = variant?.products?.title || "—";
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{format(new Date(m.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-xs gap-1 ${cfg.color}`}><Icon className="h-3 w-3" /> {cfg.label}</Badge></TableCell>
                    <TableCell className="text-sm font-medium">{productTitle}</TableCell>
                    <TableCell className="font-mono text-xs">{variant?.sku || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.warehouses?.name || "—"}</TableCell>
                    <TableCell className={`text-right font-semibold text-sm ${m.quantity > 0 ? "text-success" : "text-destructive"}`}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.reason || "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próximo</Button>
          </div>
        </div>
      )}

      {/* Add Stock Movement Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Movimentação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Produto</Label>
              <Input placeholder="Buscar produto..." value={variantSearch} onChange={(e) => setVariantSearch(e.target.value)} className="mb-2" />
              <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                <SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                <SelectContent>
                  {filteredVariants.map((v) => (
                    <SelectItem key={v.variantId} value={v.variantId}>{v.label} (estoque: {v.stock})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { val: "in", label: "Entrada", cls: "bg-success/15 text-success border-success/30" },
                  { val: "out", label: "Saída", cls: "bg-destructive/15 text-destructive border-destructive/30" },
                  { val: "adjustment", label: "Ajuste", cls: "bg-primary/15 text-primary border-primary/30" },
                  { val: "transfer", label: "Transferência", cls: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
                ].map((t) => (
                  <Button key={t.val} variant="outline" size="sm" className={movType === t.val ? t.cls : ""} onClick={() => setMovType(t.val)}>
                    {t.val === "transfer" && <ArrowLeftRight className="h-3 w-3 mr-1" />}
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Warehouse fields */}
            {isTransfer ? (
              <>
                <div className="space-y-2">
                  <Label>Armazém de Origem</Label>
                  <Select value={transferOrigin} onValueChange={(v) => { setTransferOrigin(v); if (transferDest === v) setTransferDest(""); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione a origem" /></SelectTrigger>
                    <SelectContent>
                      {(warehouses || []).map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}{w.is_default ? " (Padrão)" : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Armazém de Destino</Label>
                  <Select value={transferDest} onValueChange={setTransferDest}>
                    <SelectTrigger><SelectValue placeholder="Selecione o destino" /></SelectTrigger>
                    <SelectContent>
                      {(warehouses || []).filter((w) => w.id !== transferOrigin).map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}{w.is_default ? " (Padrão)" : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label>Armazém</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o armazém (opcional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem armazém específico</SelectItem>
                    {(warehouses || []).map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}{w.is_default ? " (Padrão)" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input type="number" min="1" placeholder="10" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
                <SelectContent>
                  {reasons.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalhes adicionais..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Registrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
