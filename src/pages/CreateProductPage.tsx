import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Save, ArrowLeft, Info } from "lucide-react";
import { MarginCalculatorModal } from "@/components/products/MarginCalculatorModal";
import { ImageUploadZone } from "@/components/products/ImageUploadZone";
import { ProductCharacteristicsTab, type ProductCharacteristics, initialCharacteristics } from "@/components/products/ProductCharacteristicsTab";
import { MarketplaceAttributesPanel, type MarketplaceAttributes } from "@/components/products/MarketplaceAttributesPanel";
import { MlbCategorySelector } from "@/components/products/MlbCategorySelector";

interface MlbCategoryValue {
  id: string;
  name: string;
  path: Array<{ id: string; name: string }>;
}

interface ProductForm {
  title: string; description: string; brand: string; model: string; ean: string; sku: string; status: string;
  price: string; cost: string; stock: string; minStock: string;
  weight: string; height: string; width: string; length: string; shippingClass: string;
}

const initialForm: ProductForm = {
  title: "", description: "", brand: "", model: "", ean: "", sku: "", status: "active",
  price: "", cost: "", stock: "", minStock: "",
  weight: "", height: "", width: "", length: "", shippingClass: "normal",
};

export default function CreateProductPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<ProductForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [showMargin, setShowMargin] = useState(false);
  const [characteristics, setCharacteristics] = useState<ProductCharacteristics>(initialCharacteristics);
  const [marketplaceAttrs, setMarketplaceAttrs] = useState<MarketplaceAttributes>({});
  const [mlbCategory, setMlbCategory] = useState<MlbCategoryValue | null>(null);

  const set = (key: keyof ProductForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [key]: e.target.value });

  const handleSave = async () => {
    if (!profile?.tenant_id || !form.title) { toast.error("Preencha pelo menos o título do produto"); return; }
    setSaving(true);
    const { data: product, error } = await supabase.from("products").insert({
      tenant_id: profile.tenant_id, title: form.title, description: form.description || null,
      brand: form.brand || null, model: form.model || null, ean: form.ean || null, sku: form.sku || null, status: form.status,
    }).select().single();

    if (error) { toast.error("Erro ao salvar produto: " + error.message); setSaving(false); return; }

    if (product) {
      // Save default variant with price/stock
      if (form.price || form.stock) {
        await supabase.from("product_variants").insert({
          product_id: product.id, sku: form.sku || null, ean: form.ean || null,
          price: form.price ? parseFloat(form.price) : 0, cost: form.cost ? parseFloat(form.cost) : 0,
          stock: form.stock ? parseInt(form.stock) : 0,
        });
      }

      // Save characteristics as product_attributes with marketplace = 'general'
      const charAttrs: { product_id: string; marketplace: string; attribute_key: string; attribute_value: string }[] = [];
      const charMap: Record<string, string> = {
        material: characteristics.material, mainColor: characteristics.mainColor,
        productWidth: characteristics.productWidth, productHeight: characteristics.productHeight,
        productDepth: characteristics.productDepth, netWeight: characteristics.netWeight,
        grossWeight: characteristics.grossWeight, voltage: characteristics.voltage,
        power: characteristics.power, connectivity: characteristics.connectivity.join(","),
        compatibility: characteristics.compatibility, countryOfOrigin: characteristics.countryOfOrigin,
        certifications: characteristics.certifications.join(","), warranty: characteristics.warranty,
        warrantyType: characteristics.warrantyType,
        expirationDate: characteristics.expirationDate ? characteristics.expirationDate.toISOString() : "",
      };
      Object.entries(charMap).forEach(([key, value]) => {
        if (value) charAttrs.push({ product_id: product.id, marketplace: "general", attribute_key: key, attribute_value: value });
      });
      characteristics.customFields.forEach((f) => {
        if (f.key && f.value) charAttrs.push({ product_id: product.id, marketplace: "general", attribute_key: `custom_${f.key}`, attribute_value: f.value });
      });
      if (charAttrs.length > 0) await supabase.from("product_attributes").insert(charAttrs);

      // Save marketplace-specific attributes
      const mktAttrs = Object.entries(marketplaceAttrs).flatMap(([marketplace, attrs]) =>
        Object.entries(attrs).filter(([, val]) => val).map(([key, value]) => ({ product_id: product.id, marketplace, attribute_key: key, attribute_value: value }))
      );
      if (mktAttrs.length > 0) await supabase.from("product_attributes").insert(mktAttrs);

      // Save MLB category
      if (mlbCategory) {
        await supabase.from("product_attributes").insert([
          { product_id: product.id, marketplace: "mercadolivre", attribute_key: "category_id", attribute_value: mlbCategory.id },
          { product_id: product.id, marketplace: "mercadolivre", attribute_key: "category_path", attribute_value: JSON.stringify(mlbCategory.path) },
        ]);
      }
    }

    setSaving(false);
    toast.success("Produto cadastrado com sucesso!");
    navigate("/products");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/products")} aria-label="Voltar para produtos"><ArrowLeft className="h-4 w-4" /></Button>
          <div><h1 className="text-2xl font-bold tracking-tight">Cadastrar Produto</h1><p className="text-sm text-muted-foreground">Preencha as informações do novo produto</p></div>
        </div>
        <Button onClick={handleSave} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "Salvando..." : "Salvar Produto"}</Button>
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="basic">Básico</TabsTrigger>
          <TabsTrigger value="images">Imagens</TabsTrigger>
          <TabsTrigger value="characteristics">Características</TabsTrigger>
          <TabsTrigger value="dimensions">Dimensões</TabsTrigger>
          <TabsTrigger value="pricing">Preço</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="space-y-2"><Label>Título do Produto <span className="text-xs text-muted-foreground">({form.title.length}/60)</span></Label><Input placeholder="Nome do produto" value={form.title} onChange={set("title")} maxLength={60} /></div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea placeholder="Descrição completa do produto..." value={form.description} onChange={set("description")} rows={5} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Marca</Label><Input placeholder="Marca" value={form.brand} onChange={set("brand")} /></div>
              <div className="space-y-2"><Label>Modelo</Label><Input placeholder="Modelo" value={form.model} onChange={set("model")} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>EAN / GTIN</Label><Input placeholder="7891234567890" value={form.ean} onChange={set("ean")} /></div>
              <div className="space-y-2"><Label>SKU Interno</Label><Input placeholder="SKU-001" value={form.sku} onChange={set("sku")} /></div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Ativo</SelectItem><SelectItem value="paused">Pausado</SelectItem><SelectItem value="draft">Rascunho</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria Mercado Livre</Label>
              <p className="text-xs text-muted-foreground">Selecione a categoria oficial do ML para garantir que o anúncio seja aceito</p>
              <MlbCategorySelector value={mlbCategory} onChange={setMlbCategory} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="images"><div className="rounded-xl border border-border bg-card p-6"><ImageUploadZone /></div></TabsContent>

        <TabsContent value="characteristics">
          <div className="rounded-xl border border-border bg-card p-6">
            <ProductCharacteristicsTab characteristics={characteristics} onCharacteristicsChange={setCharacteristics} />
          </div>
        </TabsContent>

        <TabsContent value="dimensions">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Peso (g)</Label><Input type="number" placeholder="500" value={form.weight} onChange={set("weight")} /></div>
              <div className="space-y-2">
                <Label>Classe de Envio</Label>
                <Select value={form.shippingClass} onValueChange={(v) => setForm({ ...form, shippingClass: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem><SelectItem value="express">Expresso</SelectItem>
                    <SelectItem value="heavy">Pesado (acima de 30kg)</SelectItem><SelectItem value="fragile">Frágil</SelectItem>
                    <SelectItem value="jumbo">Jumbo (acima de 1m)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Altura (cm)</Label><Input type="number" placeholder="10" value={form.height} onChange={set("height")} /></div>
              <div className="space-y-2"><Label>Largura (cm)</Label><Input type="number" placeholder="20" value={form.width} onChange={set("width")} /></div>
              <div className="space-y-2"><Label>Comprimento (cm)</Label><Input type="number" placeholder="30" value={form.length} onChange={set("length")} /></div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pricing">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço de Venda (R$)</Label>
                <div className="flex gap-2"><Input type="number" step="0.01" placeholder="99.90" value={form.price} onChange={set("price")} /><Button variant="outline" type="button" onClick={() => setShowMargin(true)}>Calcular Margem</Button></div>
              </div>
              <div className="space-y-2"><Label>Custo (R$)</Label><Input type="number" step="0.01" placeholder="50.00" value={form.cost} onChange={set("cost")} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Estoque</Label><Input type="number" placeholder="100" value={form.stock} onChange={set("stock")} /></div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  Estoque Mínimo
                  <Tooltip><TooltipTrigger><Info className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger><TooltipContent><p className="text-xs">Abaixo deste valor você receberá alertas de estoque crítico</p></TooltipContent></Tooltip>
                </Label>
                <Input type="number" placeholder="10" value={form.minStock} onChange={set("minStock")} />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="marketplace">
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground mb-4">Configure atributos específicos por marketplace</p>
            <MarketplaceAttributesPanel attributes={marketplaceAttrs} onAttributesChange={setMarketplaceAttrs} productTitle={form.title} />
          </div>
        </TabsContent>
      </Tabs>

      <MarginCalculatorModal open={showMargin} onOpenChange={setShowMargin} cost={parseFloat(form.cost) || 0} price={parseFloat(form.price) || 0} onApplyPrice={(price) => setForm({ ...form, price: price.toFixed(2) })} />
    </div>
  );
}
