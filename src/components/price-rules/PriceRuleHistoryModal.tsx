import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, History } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useExport } from "@/hooks/useExport";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: any;
}

export function PriceRuleHistoryModal({ open, onOpenChange, rule }: Props) {
  const { exportToExcel } = useExport();
  const [mpFilter, setMpFilter] = useState("all");

  const { data: history, isLoading } = useQuery({
    queryKey: ["price-rule-history", rule?.id, mpFilter],
    queryFn: async () => {
      if (!rule?.id) return [];
      let query = supabase.from("price_rule_history").select("*").eq("rule_id", rule.id).order("applied_at", { ascending: false });
      if (mpFilter !== "all") query = query.eq("marketplace", mpFilter);
      const { data } = await query;
      return data || [];
    },
    enabled: !!rule?.id && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Histórico — {rule?.name}</DialogTitle></DialogHeader>

        <div className="flex items-center gap-3 mb-3">
          <Select value={mpFilter} onValueChange={setMpFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Marketplace" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {["Mercado Livre", "Shopee", "Amazon", "Magalu", "Americanas", "Shopify"].map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => exportToExcel(history || [], `historico-${rule?.name || "regra"}`)}>
            <Download className="mr-2 h-4 w-4" />Exportar Excel
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : (history || []).length === 0 ? (
          <div className="text-center py-12"><History className="mx-auto h-10 w-10 text-muted-foreground mb-2" /><p className="text-muted-foreground">Esta regra ainda não foi executada.</p></div>
        ) : (
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data/Hora</TableHead><TableHead>Produto</TableHead><TableHead>SKU</TableHead>
                <TableHead>Marketplace</TableHead><TableHead className="text-right">Preço Anterior</TableHead>
                <TableHead className="text-right">Preço Aplicado</TableHead><TableHead className="text-right">Margem</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(history || []).map((h: any) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs">{format(new Date(h.applied_at), "dd/MM/yy HH:mm", { locale: ptBR })}</TableCell>
                    <TableCell className="text-sm">{h.product_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{h.sku || "—"}</TableCell>
                    <TableCell className="text-xs">{h.marketplace}</TableCell>
                    <TableCell className="text-right text-sm">R${Number(h.price_before).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">R${Number(h.price_after).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-xs">{Number(h.margin_after).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
