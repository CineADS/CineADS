import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface ProductCharacteristics {
  material: string;
  mainColor: string;
  productWidth: string;
  productHeight: string;
  productDepth: string;
  netWeight: string;
  grossWeight: string;
  voltage: string;
  power: string;
  connectivity: string[];
  compatibility: string;
  countryOfOrigin: string;
  certifications: string[];
  warranty: string;
  warrantyType: string;
  expirationDate: Date | undefined;
  customFields: { key: string; value: string }[];
}

export const initialCharacteristics: ProductCharacteristics = {
  material: "", mainColor: "", productWidth: "", productHeight: "", productDepth: "",
  netWeight: "", grossWeight: "", voltage: "not_applicable", power: "",
  connectivity: [], compatibility: "", countryOfOrigin: "BR",
  certifications: [], warranty: "none", warrantyType: "manufacturer",
  expirationDate: undefined, customFields: [],
};

const connectivityOptions = [
  { id: "wifi", label: "WiFi" }, { id: "bluetooth", label: "Bluetooth" },
  { id: "usb", label: "USB" }, { id: "hdmi", label: "HDMI" },
  { id: "none", label: "Sem conectividade" },
];

const certificationOptions = [
  { id: "inmetro", label: "INMETRO" }, { id: "anatel", label: "ANATEL" },
  { id: "ce", label: "CE" }, { id: "rohs", label: "RoHS" },
  { id: "iso", label: "ISO" }, { id: "none", label: "Nenhuma" },
];

const countries = [
  { value: "BR", label: "Brasil" }, { value: "CN", label: "China" },
  { value: "US", label: "Estados Unidos" }, { value: "DE", label: "Alemanha" },
  { value: "JP", label: "Japão" }, { value: "KR", label: "Coreia do Sul" },
  { value: "OTHER", label: "Outro" },
];

interface Props {
  characteristics: ProductCharacteristics;
  onCharacteristicsChange: (c: ProductCharacteristics) => void;
}

export function ProductCharacteristicsTab({ characteristics, onCharacteristicsChange }: Props) {
  const set = (key: keyof ProductCharacteristics) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onCharacteristicsChange({ ...characteristics, [key]: e.target.value });

  const toggleArray = (key: "connectivity" | "certifications", id: string) => {
    const arr = characteristics[key];
    const next = arr.includes(id) ? arr.filter((v) => v !== id) : [...arr, id];
    onCharacteristicsChange({ ...characteristics, [key]: next });
  };

  const addCustomField = () => {
    if (characteristics.customFields.length >= 20) return;
    onCharacteristicsChange({ ...characteristics, customFields: [...characteristics.customFields, { key: "", value: "" }] });
  };

  const updateCustomField = (index: number, field: "key" | "value", val: string) => {
    const updated = [...characteristics.customFields];
    updated[index] = { ...updated[index], [field]: val };
    onCharacteristicsChange({ ...characteristics, customFields: updated });
  };

  const removeCustomField = (index: number) => {
    onCharacteristicsChange({ ...characteristics, customFields: characteristics.customFields.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-8">
      {/* Physical */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Características Físicas</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Material</Label><Input placeholder="Algodão, Aço Inox, Plástico ABS" value={characteristics.material} onChange={set("material")} /></div>
          <div className="space-y-2"><Label>Cor Principal</Label><div className="flex gap-2"><Input placeholder="Preto, Branco, Azul" value={characteristics.mainColor} onChange={set("mainColor")} /><input type="color" className="h-10 w-10 rounded border border-input cursor-pointer" value={characteristics.mainColor.startsWith("#") ? characteristics.mainColor : "#000000"} onChange={(e) => onCharacteristicsChange({ ...characteristics, mainColor: e.target.value })} /></div></div>
        </div>
        <div>
          <Label className="mb-2 block">Dimensões do Produto (cm)</Label>
          <div className="grid grid-cols-3 gap-4">
            <Input type="number" placeholder="Largura" value={characteristics.productWidth} onChange={set("productWidth")} />
            <Input type="number" placeholder="Altura" value={characteristics.productHeight} onChange={set("productHeight")} />
            <Input type="number" placeholder="Profundidade" value={characteristics.productDepth} onChange={set("productDepth")} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Peso Líquido (g)</Label><Input type="number" placeholder="500" value={characteristics.netWeight} onChange={set("netWeight")} /></div>
          <div className="space-y-2"><Label>Peso Bruto com embalagem (g)</Label><Input type="number" placeholder="650" value={characteristics.grossWeight} onChange={set("grossWeight")} /></div>
        </div>
      </section>

      {/* Technical */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Características Técnicas</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Voltagem</Label>
            <Select value={characteristics.voltage} onValueChange={(v) => onCharacteristicsChange({ ...characteristics, voltage: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bivolt">Bivolt</SelectItem>
                <SelectItem value="110v">110V</SelectItem>
                <SelectItem value="220v">220V</SelectItem>
                <SelectItem value="not_applicable">Não se aplica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Potência (W)</Label><Input type="number" placeholder="1200" value={characteristics.power} onChange={set("power")} /></div>
        </div>
        <div className="space-y-2">
          <Label>Conectividade</Label>
          <div className="flex flex-wrap gap-4">
            {connectivityOptions.map((opt) => (
              <label key={opt.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={characteristics.connectivity.includes(opt.id)} onCheckedChange={() => toggleArray("connectivity", opt.id)} />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-2"><Label>Compatibilidade</Label><Textarea placeholder="Compatível com iOS 14+ e Android 10+" value={characteristics.compatibility} onChange={set("compatibility")} rows={3} /></div>
      </section>

      {/* Commercial */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Características Comerciais</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>País de Origem</Label>
            <Select value={characteristics.countryOfOrigin} onValueChange={(v) => onCharacteristicsChange({ ...characteristics, countryOfOrigin: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{countries.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Garantia</Label>
            <Select value={characteristics.warranty} onValueChange={(v) => onCharacteristicsChange({ ...characteristics, warranty: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem garantia</SelectItem>
                <SelectItem value="3m">3 meses</SelectItem>
                <SelectItem value="6m">6 meses</SelectItem>
                <SelectItem value="1y">1 ano</SelectItem>
                <SelectItem value="2y">2 anos</SelectItem>
                <SelectItem value="3y">3 anos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo de Garantia</Label>
            <Select value={characteristics.warrantyType} onValueChange={(v) => onCharacteristicsChange({ ...characteristics, warrantyType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manufacturer">Do fabricante</SelectItem>
                <SelectItem value="seller">Do vendedor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Validade (opcional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !characteristics.expirationDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {characteristics.expirationDate ? format(characteristics.expirationDate, "dd/MM/yyyy") : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={characteristics.expirationDate} onSelect={(d) => onCharacteristicsChange({ ...characteristics, expirationDate: d })} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Certificações</Label>
          <div className="flex flex-wrap gap-4">
            {certificationOptions.map((opt) => (
              <label key={opt.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={characteristics.certifications.includes(opt.id)} onCheckedChange={() => toggleArray("certifications", opt.id)} />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Custom Fields */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Campos Personalizados</h3>
          <span className="text-xs text-muted-foreground">{characteristics.customFields.length}/20</span>
        </div>
        {characteristics.customFields.map((field, i) => (
          <div key={i} className="flex gap-3 items-start">
            <Input placeholder="Nome da característica" value={field.key} onChange={(e) => updateCustomField(i, "key", e.target.value)} className="flex-1" />
            <Input placeholder="Valor" value={field.value} onChange={(e) => updateCustomField(i, "value", e.target.value)} className="flex-1" />
            <Button variant="ghost" size="icon" onClick={() => removeCustomField(i)}><X className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addCustomField} disabled={characteristics.customFields.length >= 20}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar Característica
        </Button>
      </section>
    </div>
  );
}
