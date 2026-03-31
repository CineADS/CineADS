import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Download, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ParsedRow {
  sku: string;
  new_price: number;
  marketplace?: string;
  found: boolean;
  product_name?: string;
  current_price?: number;
  product_variant_id?: string;
  margin_warning: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function ImportPriceSheetModal({ open, onOpenChange, onImported }: Props) {
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [name, setName] = useState(`Importação via planilha - ${format(new Date(), "dd/MM/yyyy HH:mm")}`);
  const [ignoreWarnings, setIgnoreWarnings] = useState(false);
  const [saving, setSaving] = useState(false);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([["SKU", "Novo Preço", "Marketplace", "Data Início", "Data Fim"], ["SKU-001", "99.90", "Shopee", "", ""]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(wb, "modelo-precos.xlsx");
  };

  const onDrop = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json: any[] = XLSX.utils.sheet_to_json(ws);

    if (!json.length) { toast.error("Planilha vazia"); return; }

    // Validate columns
    const firstRow = json[0];
    if (!("SKU" in firstRow) && !("sku" in firstRow)) {
      toast.error("Coluna 'SKU' não encontrada na planilha"); return;
    }

    // Match SKUs with database
    const skus = json.map(r => (r.SKU || r.sku || "").toString().trim()).filter(Boolean);
    const { data: variants } = await supabase
      .from("product_variants")
      .select("id, sku, price, cost, product_id, products(title, tenant_id)")
      .in("sku", skus);

    const variantMap = new Map((variants || []).map((v: any) => [v.sku?.toUpperCase(), v]));

    const parsed: ParsedRow[] = json.map(r => {
      const sku = (r.SKU || r.sku || "").toString().trim();
      const newPrice = parseFloat(r["Novo Preço"] || r["novo_preco"] || r.new_price || r.price || 0);
      const mp = r.Marketplace || r.marketplace || "";
      const variant = variantMap.get(sku.toUpperCase()) as any;

      let marginWarning = false;
      if (variant && variant.cost > 0 && newPrice > 0) {
        const margin = ((newPrice - variant.cost) / newPrice) * 100;
        if (margin < 5) marginWarning = true;
      }

      return {
        sku,
        new_price: newPrice,
        marketplace: mp,
        found: !!variant,
        product_name: variant?.products?.title || "",
        current_price: variant?.price || 0,
        product_variant_id: variant?.id || "",
        margin_warning: marginWarning,
      };
    });

    setRows(parsed);
    setStep(2);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"], "text/csv": [".csv"] }, maxFiles: 1 });

  const valid = rows.filter(r => r.found && (!r.margin_warning || ignoreWarnings));
  const warnings = rows.filter(r => r.found && r.margin_warning);
  const notFound = rows.filter(r => !r.found);

  const handleImport = async () => {
    if (!profile?.tenant_id) return;
    setSaving(true);

    const skus = valid.map(r => r.sku);
    const { data: rule, error } = await supabase.from("price_rules").insert({
      tenant_id: profile.tenant_id,
      name,
      adjustment_type: "fixed_price",
      adjustment_value: 0,
      starts_at: new Date().toISOString(),
      scope: { skus },
      products_affected: valid.length,
      status: "active",
      created_by: profile.id,
    }).select().single();

    if (error) { toast.error("Erro ao criar regra: " + error.message); setSaving(false); return; }

    // Record history
    if (rule) {
      const historyRows = valid.map(r => ({
        rule_id: rule.id,
        tenant_id: profile.tenant_id,
        product_variant_id: r.product_variant_id || null,
        sku: r.sku,
        product_name: r.product_name || "",
        marketplace: r.marketplace || "Geral",
        price_before: r.current_price || 0,
        price_after: r.new_price,
        margin_before: 0,
        margin_after: 0,
        blocked_by_margin: false,
      }));
      await supabase.from("price_rule_history").insert(historyRows);
    }

    setSaving(false);
    toast.success(`Regra criada! ${valid.length} produtos serão atualizados.`);
    onImported();
    onOpenChange(false);
    setStep(1); setRows([]);
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setStep(1); setRows([]); } onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Importar Planilha de Preços</DialogTitle></DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div {...getRootProps()} className={cn("border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors", isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground")}>
              <input {...getInputProps()} />
              <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Arraste um arquivo .xlsx ou .csv aqui</p>
              <p className="text-xs text-muted-foreground mt-1">ou clique para selecionar</p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}><Download className="mr-2 h-4 w-4" />Baixar modelo de planilha</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex gap-3 text-sm">
              <Badge variant="outline" className="bg-green-500/10 text-green-600"><CheckCircle className="mr-1 h-3 w-3" />{valid.length} válidos</Badge>
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600"><AlertTriangle className="mr-1 h-3 w-3" />{warnings.length} alerta de margem</Badge>
              <Badge variant="outline" className="bg-red-500/10 text-red-600"><XCircle className="mr-1 h-3 w-3" />{notFound.length} não encontrados</Badge>
            </div>

            <div className="rounded-lg border overflow-x-auto max-h-64 overflow-y-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Status</TableHead><TableHead>SKU</TableHead><TableHead>Produto</TableHead>
                  <TableHead className="text-right">Preço Atual</TableHead><TableHead className="text-right">Novo Preço</TableHead>
                  <TableHead className="text-right">Variação</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {rows.map((r, i) => {
                    const variation = r.current_price ? ((r.new_price - r.current_price) / r.current_price * 100) : 0;
                    return (
                      <TableRow key={i} className={cn(!r.found ? "bg-red-500/5" : r.margin_warning ? "bg-yellow-500/5" : "")}>
                        <TableCell>{!r.found ? <XCircle className="h-4 w-4 text-red-500" /> : r.margin_warning ? <AlertTriangle className="h-4 w-4 text-yellow-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}</TableCell>
                        <TableCell className="text-sm font-mono">{r.sku}</TableCell>
                        <TableCell className="text-sm">{r.product_name || "—"}</TableCell>
                        <TableCell className="text-right text-sm">{r.found ? `R$${Number(r.current_price).toFixed(2)}` : "—"}</TableCell>
                        <TableCell className="text-right text-sm font-semibold">R${r.new_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-xs">{r.found ? `${variation > 0 ? "+" : ""}${variation.toFixed(1)}%` : "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <Button variant="outline" onClick={() => setStep(3)}>Continuar</Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome da regra</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch checked={ignoreWarnings} onCheckedChange={setIgnoreWarnings} />Ignorar produtos com alerta de margem ({warnings.length})
            </label>
            <p className="text-sm text-muted-foreground">{valid.length} produtos serão atualizados.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
              <Button onClick={handleImport} disabled={saving}>{saving ? "Importando..." : "Importar e Agendar"}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
