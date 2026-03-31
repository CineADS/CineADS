import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Copy } from "lucide-react";

const VARIATION_TYPES = ["Cor", "Tamanho", "Voltagem", "Material", "Sabor", "Capacidade", "Modelo"];

interface VariationType {
  type: string;
  values: string[];
}

export interface VariantRow {
  combination: Record<string, string>;
  sku: string;
  price: string;
  stock: string;
}

interface VariationsBuilderProps {
  variants: VariantRow[];
  onVariantsChange: (variants: VariantRow[]) => void;
}

export function VariationsBuilder({ variants, onVariantsChange }: VariationsBuilderProps) {
  const [variationTypes, setVariationTypes] = useState<VariationType[]>([]);
  const [newType, setNewType] = useState("");
  const [newValues, setNewValues] = useState<Record<string, string>>({});

  const availableTypes = VARIATION_TYPES.filter(
    (t) => !variationTypes.some((vt) => vt.type === t)
  );

  const addVariationType = () => {
    if (!newType) return;
    setVariationTypes([...variationTypes, { type: newType, values: [] }]);
    setNewType("");
  };

  const removeVariationType = (idx: number) => {
    const updated = variationTypes.filter((_, i) => i !== idx);
    setVariationTypes(updated);
    regenerateGrid(updated);
  };

  const addValues = (idx: number) => {
    const raw = newValues[idx] || "";
    const vals = raw.split(",").map((v) => v.trim()).filter(Boolean);
    if (vals.length === 0) return;
    const updated = variationTypes.map((vt, i) =>
      i === idx ? { ...vt, values: [...new Set([...vt.values, ...vals])] } : vt
    );
    setVariationTypes(updated);
    setNewValues({ ...newValues, [idx]: "" });
    regenerateGrid(updated);
  };

  const removeValue = (typeIdx: number, valIdx: number) => {
    const updated = variationTypes.map((vt, i) =>
      i === typeIdx ? { ...vt, values: vt.values.filter((_, vi) => vi !== valIdx) } : vt
    );
    setVariationTypes(updated);
    regenerateGrid(updated);
  };

  const regenerateGrid = (types: VariationType[]) => {
    const validTypes = types.filter((t) => t.values.length > 0);
    if (validTypes.length === 0) {
      onVariantsChange([]);
      return;
    }
    const combos = cartesian(validTypes);
    onVariantsChange(
      combos.map((combo) => ({
        combination: combo,
        sku: "",
        price: "",
        stock: "",
      }))
    );
  };

  const cartesian = (types: VariationType[]): Record<string, string>[] => {
    if (types.length === 0) return [{}];
    const [first, ...rest] = types;
    const restCombos = cartesian(rest);
    return first.values.flatMap((val) =>
      restCombos.map((combo) => ({ [first.type]: val, ...combo }))
    );
  };

  const updateVariant = (idx: number, field: keyof VariantRow, value: string) => {
    const updated = variants.map((v, i) => (i === idx ? { ...v, [field]: value } : v));
    onVariantsChange(updated);
  };

  const fillAll = (field: "price" | "stock", value: string) => {
    onVariantsChange(variants.map((v) => ({ ...v, [field]: value })));
  };

  const [fillPrice, setFillPrice] = useState("");
  const [fillStock, setFillStock] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          Configure variações como Cor, Tamanho, Voltagem etc. A grade será gerada automaticamente.
        </p>

        {/* Existing variation types */}
        {variationTypes.map((vt, idx) => (
          <div key={idx} className="border border-border rounded-lg p-4 mb-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">{vt.type}</Label>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeVariationType(idx)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {vt.values.map((val, vi) => (
                <Badge key={vi} variant="secondary" className="gap-1 text-xs">
                  {val}
                  <button onClick={() => removeValue(idx, vi)} className="ml-0.5 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Ex: P, M, G, GG"
                value={newValues[idx] || ""}
                onChange={(e) => setNewValues({ ...newValues, [idx]: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && addValues(idx)}
                className="text-sm"
              />
              <Button variant="outline" size="sm" onClick={() => addValues(idx)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
              </Button>
            </div>
          </div>
        ))}

        {/* Add new type */}
        {availableTypes.length > 0 && (
          <div className="flex gap-2">
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tipo de variação" />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={addVariationType} disabled={!newType}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar Tipo
            </Button>
          </div>
        )}
      </div>

      {/* Generated grid */}
      {variants.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{variants.length} variações geradas</h3>
            <div className="flex gap-2 items-center">
              <Input
                placeholder="Preço"
                value={fillPrice}
                onChange={(e) => setFillPrice(e.target.value)}
                className="w-24 text-sm h-8"
                type="number"
                step="0.01"
              />
              <Button variant="outline" size="sm" onClick={() => fillAll("price", fillPrice)} disabled={!fillPrice}>
                <Copy className="h-3 w-3 mr-1" /> Preencher
              </Button>
              <Input
                placeholder="Estoque"
                value={fillStock}
                onChange={(e) => setFillStock(e.target.value)}
                className="w-24 text-sm h-8"
                type="number"
              />
              <Button variant="outline" size="sm" onClick={() => fillAll("stock", fillStock)} disabled={!fillStock}>
                <Copy className="h-3 w-3 mr-1" /> Preencher
              </Button>
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-3 py-2 font-medium">Combinação</th>
                  <th className="text-left px-3 py-2 font-medium">SKU</th>
                  <th className="text-left px-3 py-2 font-medium">Preço (R$)</th>
                  <th className="text-left px-3 py-2 font-medium">Estoque</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      <div className="flex gap-1 flex-wrap">
                        {Object.entries(v.combination).map(([key, val]) => (
                          <Badge key={key} variant="outline" className="text-xs">
                            {key}: {val}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={v.sku}
                        onChange={(e) => updateVariant(i, "sku", e.target.value)}
                        placeholder="SKU-001"
                        className="h-8 text-xs w-28"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={v.price}
                        onChange={(e) => updateVariant(i, "price", e.target.value)}
                        placeholder="0.00"
                        className="h-8 text-xs w-24"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        value={v.stock}
                        onChange={(e) => updateVariant(i, "stock", e.target.value)}
                        placeholder="0"
                        className="h-8 text-xs w-20"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
