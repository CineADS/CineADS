import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Package, ShieldAlert, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { applyPriceRule, type PreviewResult, type PriceRule } from "@/lib/priceRulesEngine";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ruleData: any;
  ruleId?: string;
  onConfirm?: () => void;
  onBack?: () => void;
}

export function PriceRulePreviewModal({ open, onOpenChange, ruleData, ruleId, onConfirm, onBack }: Props) {
  const { profile } = useAuth();
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (open && ruleData && profile?.tenant_id) {
      setLoading(true);
      applyPriceRule(ruleData as PriceRule, profile.tenant_id)
        .then(setPreview)
        .catch(() => toast.error("Erro ao gerar preview"))
        .finally(() => setLoading(false));
    }
  }, [open, ruleData, profile?.tenant_id]);

  const handleConfirm = async () => {
    if (!ruleId) { onConfirm?.(); return; }
    setConfirming(true);
    const { error } = await supabase.from("price_rules").update({
      status: new Date(ruleData.starts_at) <= new Date() ? "active" : "scheduled",
      products_affected: preview?.summary.total_affected || 0,
    }).eq("id", ruleId);
    if (error) toast.error("Erro ao confirmar regra");
    else { toast.success("Regra agendada com sucesso!"); onConfirm?.(); }
    setConfirming(false);
  };

  const filterItems = (items: any[]) =>
    items.filter(i => !search || i.product_name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Preview da Regra</DialogTitle></DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : preview ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-4 text-center">
                <Package className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold">{preview.summary.total_affected}</p>
                <p className="text-xs text-muted-foreground">Produtos Afetados</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <ShieldAlert className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
                <p className="text-2xl font-bold">{preview.summary.total_blocked}</p>
                <p className="text-xs text-muted-foreground">Bloqueados por Margem</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <TrendingUp className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                <p className="text-2xl font-bold">{preview.summary.avg_variation > 0 ? "+" : ""}{preview.summary.avg_variation}%</p>
                <p className="text-xs text-muted-foreground">Variação Média</p>
              </div>
            </div>

            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar por produto ou SKU..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>

            <Tabs defaultValue="affected">
              <TabsList>
                <TabsTrigger value="affected">Serão Alterados ({preview.affected.length})</TabsTrigger>
                <TabsTrigger value="blocked">Bloqueados ({preview.blocked.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="affected">
                <div className="rounded-lg border overflow-x-auto max-h-72 overflow-y-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Produto</TableHead><TableHead>SKU</TableHead><TableHead>Marketplace</TableHead>
                      <TableHead className="text-right">Preço Atual</TableHead><TableHead className="text-right">Novo Preço</TableHead>
                      <TableHead className="text-right">Variação</TableHead><TableHead className="text-right">Margem</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {filterItems(preview.affected).length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum produto será afetado</TableCell></TableRow>
                      ) : filterItems(preview.affected).map((item, i) => {
                        const variation = ((item.price_after - item.price_before) / item.price_before * 100);
                        return (
                          <TableRow key={i} className={cn(item.margin_after > item.margin_before ? "bg-green-500/5" : item.margin_after < item.margin_before ? "bg-yellow-500/5" : "")}>
                            <TableCell className="text-sm font-medium">{item.product_name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{item.sku || "—"}</TableCell>
                            <TableCell className="text-xs">{item.marketplace}</TableCell>
                            <TableCell className="text-right text-sm">R${item.price_before.toFixed(2)}</TableCell>
                            <TableCell className="text-right text-sm font-semibold">R${item.price_after.toFixed(2)}</TableCell>
                            <TableCell className="text-right"><Badge variant="outline" className={cn("text-xs", variation > 0 ? "text-green-600" : "text-red-600")}>{variation > 0 ? "+" : ""}{variation.toFixed(1)}%</Badge></TableCell>
                            <TableCell className="text-right text-xs">{item.margin_after.toFixed(1)}%</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              <TabsContent value="blocked">
                <div className="rounded-lg border overflow-x-auto max-h-72 overflow-y-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Produto</TableHead><TableHead>SKU</TableHead><TableHead>Marketplace</TableHead>
                      <TableHead className="text-right">Preço Atual</TableHead><TableHead className="text-right">Novo Preço</TableHead>
                      <TableHead className="text-right">Margem</TableHead><TableHead>Motivo</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {filterItems(preview.blocked).length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum produto bloqueado</TableCell></TableRow>
                      ) : filterItems(preview.blocked).map((item, i) => (
                        <TableRow key={i} className="bg-red-500/5">
                          <TableCell className="text-sm">{item.product_name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{item.sku || "—"}</TableCell>
                          <TableCell className="text-xs">{item.marketplace}</TableCell>
                          <TableCell className="text-right text-sm">R${item.price_before.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-sm line-through text-muted-foreground">R${item.price_after.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-xs text-red-600">{item.margin_after.toFixed(1)}%</TableCell>
                          <TableCell><Badge variant="destructive" className="text-xs">Margem abaixo do mínimo</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <p className="text-center py-8 text-muted-foreground">Nenhum dado disponível</p>
        )}

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
          {onBack && <Button variant="outline" onClick={onBack}>Voltar e Editar</Button>}
          <Button onClick={handleConfirm} disabled={confirming} className="bg-green-600 hover:bg-green-700 text-white">
            {confirming ? "Confirmando..." : "Confirmar e Agendar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
