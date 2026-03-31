import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Eye, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { calculateNewPrice } from "@/lib/priceRulesEngine";

const adjustmentTypes = [
  { value: "percent_increase", label: "% de Aumento", example: "+6%", color: "border-green-500 bg-green-500/10" },
  { value: "percent_decrease", label: "% de Desconto", example: "-10%", color: "border-red-500 bg-red-500/10" },
  { value: "fixed_increase", label: "+ Valor Fixo", example: "+R$5,00", color: "border-green-500 bg-green-500/10" },
  { value: "fixed_decrease", label: "- Valor Fixo", example: "-R$5,00", color: "border-red-500 bg-red-500/10" },
  { value: "fixed_price", label: "Preço Fixo", example: "R$99,90", color: "border-blue-500 bg-blue-500/10" },
];

const marketplacesList = ["Mercado Livre", "Shopee", "Amazon", "Magalu", "Americanas", "Shopify"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editRule?: any;
  onSaved: () => void;
  onPreview?: (ruleData: any) => void;
}

export function PriceRuleFormModal({ open, onOpenChange, editRule, onSaved, onPreview }: Props) {
  const { profile } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [adjustmentType, setAdjustmentType] = useState("percent_increase");
  const [adjustmentValue, setAdjustmentValue] = useState("");
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [skuList, setSkuList] = useState("");
  const [marginProtection, setMarginProtection] = useState(true);
  const [minMargin, setMinMargin] = useState("5");
  const [minPrice, setMinPrice] = useState("0");
  const [startsAt, setStartsAt] = useState<Date | undefined>(new Date());
  const [endsAt, setEndsAt] = useState<Date | undefined>();
  const [noEndDate, setNoEndDate] = useState(true);
  const [startsAtTime, setStartsAtTime] = useState("08:00");
  const [endsAtTime, setEndsAtTime] = useState("23:59");
  const [saving, setSaving] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["categories", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data } = await supabase.from("categories").select("id, name").eq("tenant_id", profile.tenant_id).order("name");
      return data || [];
    },
    enabled: !!profile?.tenant_id && open,
  });

  const { data: brands } = useQuery({
    queryKey: ["brands-distinct", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data } = await supabase.from("products").select("brand").eq("tenant_id", profile.tenant_id).not("brand", "is", null);
      const unique = [...new Set((data || []).map((p: any) => p.brand).filter(Boolean))];
      return unique as string[];
    },
    enabled: !!profile?.tenant_id && open,
  });

  useEffect(() => {
    if (editRule) {
      setName(editRule.name || "");
      setDescription(editRule.description || "");
      setAdjustmentType(editRule.adjustment_type);
      setAdjustmentValue(String(editRule.adjustment_value));
      const scope = editRule.scope || {};
      setSelectedMarketplaces(scope.marketplaces || []);
      setSelectedCategories(scope.categories || []);
      setSelectedBrands(scope.brands || []);
      setPriceFrom(scope.price_from ? String(scope.price_from) : "");
      setPriceTo(scope.price_to ? String(scope.price_to) : "");
      setSkuList(scope.skus ? scope.skus.join("\n") : "");
      setMarginProtection((editRule.min_margin_percent || 0) > 0 || (editRule.min_price || 0) > 0);
      setMinMargin(String(editRule.min_margin_percent || 5));
      setMinPrice(String(editRule.min_price || 0));
      setStartsAt(new Date(editRule.starts_at));
      if (editRule.ends_at) { setEndsAt(new Date(editRule.ends_at)); setNoEndDate(false); }
      else { setNoEndDate(true); }
    } else {
      setName(""); setDescription(""); setAdjustmentType("percent_increase"); setAdjustmentValue("");
      setSelectedMarketplaces([]); setSelectedCategories([]); setSelectedBrands([]);
      setPriceFrom(""); setPriceTo(""); setSkuList(""); setMarginProtection(true);
      setMinMargin("5"); setMinPrice("0"); setStartsAt(new Date()); setEndsAt(undefined); setNoEndDate(true);
      setStartsAtTime("08:00"); setEndsAtTime("23:59");
    }
  }, [editRule, open]);

  const buildRuleData = () => {
    const skus = skuList.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
    const startDate = startsAt ? new Date(startsAt) : new Date();
    const [sh, sm] = startsAtTime.split(":").map(Number);
    startDate.setHours(sh, sm, 0, 0);

    let endDate: Date | null = null;
    if (!noEndDate && endsAt) {
      endDate = new Date(endsAt);
      const [eh, em] = endsAtTime.split(":").map(Number);
      endDate.setHours(eh, em, 0, 0);
    }

    return {
      tenant_id: profile?.tenant_id,
      name,
      description: description || null,
      adjustment_type: adjustmentType,
      adjustment_value: parseFloat(adjustmentValue) || 0,
      starts_at: startDate.toISOString(),
      ends_at: endDate ? endDate.toISOString() : null,
      min_margin_percent: marginProtection ? parseFloat(minMargin) || 0 : 0,
      min_price: marginProtection ? parseFloat(minPrice) || 0 : 0,
      scope: {
        marketplaces: selectedMarketplaces.length > 0 ? selectedMarketplaces : undefined,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        brands: selectedBrands.length > 0 ? selectedBrands : undefined,
        price_from: priceFrom ? parseFloat(priceFrom) : undefined,
        price_to: priceTo ? parseFloat(priceTo) : undefined,
        skus: skus.length > 0 ? skus : undefined,
      },
      created_by: profile?.id,
    };
  };

  const handleSave = async () => {
    if (!name) { toast.error("Nome da regra é obrigatório"); return; }
    if (!adjustmentValue) { toast.error("Valor do ajuste é obrigatório"); return; }
    setSaving(true);
    const data = buildRuleData();

    if (editRule) {
      const { error } = await supabase.from("price_rules").update(data).eq("id", editRule.id);
      if (error) { toast.error("Erro ao atualizar: " + error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("price_rules").insert(data);
      if (error) { toast.error("Erro ao criar: " + error.message); setSaving(false); return; }
    }
    setSaving(false);
    toast.success(editRule ? "Regra atualizada!" : "Regra criada com sucesso!");
    onSaved();
    onOpenChange(false);
  };

  const previewPrice = adjustmentValue ? calculateNewPrice(100, adjustmentType, parseFloat(adjustmentValue) || 0) : null;

  const toggleMarketplace = (mp: string) => {
    setSelectedMarketplaces(prev => prev.includes(mp) ? prev.filter(m => m !== mp) : [...prev, mp]);
  };

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const toggleBrand = (b: string) => {
    setSelectedBrands(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editRule ? "Editar Regra de Preço" : "Nova Regra de Preço"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Identification */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Identificação</h3>
            <div className="space-y-2"><Label>Nome da regra *</Label><Input placeholder="Ex: Black Friday Shopee Nov/24" value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Descrição</Label><Input placeholder="Descrição opcional" value={description} onChange={e => setDescription(e.target.value)} /></div>
          </div>

          {/* Adjustment Type */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Tipo de Ajuste</h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {adjustmentTypes.map(t => (
                <button key={t.value} type="button"
                  className={cn("rounded-lg border-2 p-3 text-center text-xs font-medium transition-all", adjustmentType === t.value ? t.color + " ring-2 ring-offset-2 ring-primary" : "border-border hover:border-muted-foreground")}
                  onClick={() => setAdjustmentType(t.value)}>
                  <div className="font-bold">{t.example}</div>
                  <div className="text-muted-foreground mt-1">{t.label}</div>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Input type="number" step="0.01" placeholder="Valor" value={adjustmentValue} onChange={e => setAdjustmentValue(e.target.value)} className="w-40" />
              {previewPrice !== null && (
                <span className="text-sm text-muted-foreground">Produto de R$100,00 ficará <span className="font-semibold text-foreground">R${previewPrice.toFixed(2)}</span></span>
              )}
            </div>
          </div>

          {/* Scope */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Escopo</h3>
            <Accordion type="multiple" className="w-full">
              <AccordionItem value="marketplaces">
                <AccordionTrigger className="text-sm">Por Marketplace {selectedMarketplaces.length > 0 && `(${selectedMarketplaces.length})`}</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {marketplacesList.map(mp => (
                      <label key={mp} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={selectedMarketplaces.includes(mp)} onCheckedChange={() => toggleMarketplace(mp)} />{mp}
                      </label>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="categories">
                <AccordionTrigger className="text-sm">Por Categoria {selectedCategories.length > 0 && `(${selectedCategories.length})`}</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {(categories || []).map((c: any) => (
                      <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={selectedCategories.includes(c.id)} onCheckedChange={() => toggleCategory(c.id)} />{c.name}
                      </label>
                    ))}
                    {(!categories || categories.length === 0) && <p className="text-xs text-muted-foreground">Nenhuma categoria cadastrada</p>}
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="brands">
                <AccordionTrigger className="text-sm">Por Marca {selectedBrands.length > 0 && `(${selectedBrands.length})`}</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {(brands || []).map(b => (
                      <label key={b} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={selectedBrands.includes(b)} onCheckedChange={() => toggleBrand(b)} />{b}
                      </label>
                    ))}
                    {(!brands || brands.length === 0) && <p className="text-xs text-muted-foreground">Nenhuma marca encontrada</p>}
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="pricerange">
                <AccordionTrigger className="text-sm">Por Faixa de Preço</AccordionTrigger>
                <AccordionContent>
                  <div className="flex items-center gap-3">
                    <Input type="number" step="0.01" placeholder="De R$" value={priceFrom} onChange={e => setPriceFrom(e.target.value)} className="w-32" />
                    <span className="text-muted-foreground">a</span>
                    <Input type="number" step="0.01" placeholder="Até R$" value={priceTo} onChange={e => setPriceTo(e.target.value)} className="w-32" />
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="skus">
                <AccordionTrigger className="text-sm">Por SKUs específicos {skuList.trim() && `(${skuList.split(/[\n,]/).filter(Boolean).length})`}</AccordionTrigger>
                <AccordionContent>
                  <Textarea placeholder="Cole SKUs separados por vírgula ou um por linha" value={skuList} onChange={e => setSkuList(e.target.value)} rows={4} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Margin Protection */}
          <div className="space-y-3 p-4 rounded-lg border-2 border-yellow-500/40 bg-yellow-500/5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">⚠️ Proteção de Margem</h3>
              <Switch checked={marginProtection} onCheckedChange={setMarginProtection} />
            </div>
            {marginProtection && (
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="space-y-1"><Label className="text-xs">Margem mínima (%)</Label><Input type="number" step="0.01" value={minMargin} onChange={e => setMinMargin(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Preço mínimo (R$)</Label><Input type="number" step="0.01" value={minPrice} onChange={e => setMinPrice(e.target.value)} /></div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Produtos bloqueados pela proteção aparecerão no preview.</p>
          </div>

          {/* Schedule */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Vigência</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Início</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startsAt && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />{startsAt ? format(startsAt, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={startsAt} onSelect={setStartsAt} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                  <Input type="time" value={startsAtTime} onChange={e => setStartsAtTime(e.target.value)} className="w-28" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Término</Label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Switch checked={noEndDate} onCheckedChange={setNoEndDate} className="scale-75" />Sem data de término
                  </label>
                </div>
                {!noEndDate && (
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endsAt && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />{endsAt ? format(endsAt, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={endsAt} onSelect={setEndsAt} className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                    <Input type="time" value={endsAtTime} onChange={e => setEndsAtTime(e.target.value)} className="w-28" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {onPreview && (
            <Button variant="outline" onClick={() => onPreview(buildRuleData())}><Eye className="mr-2 h-4 w-4" />Ver Preview</Button>
          )}
          <Button onClick={handleSave} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "Salvando..." : "Salvar Regra"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
