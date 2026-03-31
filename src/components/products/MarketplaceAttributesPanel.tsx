import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface MarketplaceAttributes {
  [marketplace: string]: Record<string, string>;
}

interface MarketplaceAttributesPanelProps {
  attributes: MarketplaceAttributes;
  onAttributesChange: (attrs: MarketplaceAttributes) => void;
  productTitle?: string;
}

const RequiredBadge = () => (
  <Badge variant="destructive" className="text-[10px] ml-1 px-1 py-0">Obrigatório</Badge>
);

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label}
        {required && <RequiredBadge />}
      </Label>
      {children}
    </div>
  );
}

export function MarketplaceAttributesPanel({ attributes, onAttributesChange, productTitle }: MarketplaceAttributesPanelProps) {
  const set = (marketplace: string, key: string, value: string) => {
    onAttributesChange({
      ...attributes,
      [marketplace]: { ...(attributes[marketplace] || {}), [key]: value },
    });
  };

  const get = (marketplace: string, key: string) => attributes[marketplace]?.[key] || "";

  return (
    <Accordion type="multiple" className="space-y-2">
      {/* Mercado Livre */}
      <AccordionItem value="mercadolivre" className="border border-border rounded-lg px-4">
        <AccordionTrigger className="text-sm font-semibold">Mercado Livre</AccordionTrigger>
        <AccordionContent className="space-y-4 pb-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Condição" required>
              <Select value={get("mercadolivre", "condition")} onValueChange={(v) => set("mercadolivre", "condition", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Novo</SelectItem>
                  <SelectItem value="used">Usado</SelectItem>
                  <SelectItem value="refurbished">Recondicionado</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tipo de Anúncio" required>
              <Select value={get("mercadolivre", "listing_type")} onValueChange={(v) => set("mercadolivre", "listing_type", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">Clássico</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Garantia">
              <Select value={get("mercadolivre", "warranty")} onValueChange={(v) => set("mercadolivre", "warranty", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {["Sem garantia", "3 meses", "6 meses", "12 meses", "24 meses"].map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tipo de Garantia">
              <Select value={get("mercadolivre", "warranty_type")} onValueChange={(v) => set("mercadolivre", "warranty_type", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="seller">Garantia do vendedor</SelectItem>
                  <SelectItem value="factory">Garantia de fábrica</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Shopee */}
      <AccordionItem value="shopee" className="border border-border rounded-lg px-4">
        <AccordionTrigger className="text-sm font-semibold">Shopee</AccordionTrigger>
        <AccordionContent className="space-y-4 pb-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Condição">
              <Select value={get("shopee", "condition")} onValueChange={(v) => set("shopee", "condition", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Novo</SelectItem>
                  <SelectItem value="used">Usado</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Dias de Envio">
              <Select value={get("shopee", "shipping_days")} onValueChange={(v) => set("shopee", "shipping_days", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {["1 dia", "2 dias", "3 dias", "7 dias"].map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Hashtags">
            <Input placeholder="Ex: oferta, promoção, lançamento" value={get("shopee", "hashtags")} onChange={(e) => set("shopee", "hashtags", e.target.value)} />
          </Field>
        </AccordionContent>
      </AccordionItem>

      {/* Amazon */}
      <AccordionItem value="amazon" className="border border-border rounded-lg px-4">
        <AccordionTrigger className="text-sm font-semibold">Amazon</AccordionTrigger>
        <AccordionContent className="space-y-4 pb-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <Field key={n} label={`Bullet Point ${n}`}>
              <Input
                placeholder={`Vantagem ${n} do produto`}
                value={get("amazon", `bullet_${n}`)}
                onChange={(e) => set("amazon", `bullet_${n}`, e.target.value)}
              />
            </Field>
          ))}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Search Terms">
              <Input placeholder="Palavras-chave" value={get("amazon", "search_terms")} onChange={(e) => set("amazon", "search_terms", e.target.value)} />
            </Field>
            <Field label="Fabricante">
              <Input placeholder="Nome do fabricante" value={get("amazon", "manufacturer")} onChange={(e) => set("amazon", "manufacturer", e.target.value)} />
            </Field>
          </div>
          <Field label="Item Part Number">
            <Input placeholder="Part number" value={get("amazon", "part_number")} onChange={(e) => set("amazon", "part_number", e.target.value)} />
          </Field>
        </AccordionContent>
      </AccordionItem>

      {/* Magalu */}
      <AccordionItem value="magalu" className="border border-border rounded-lg px-4">
        <AccordionTrigger className="text-sm font-semibold">Magalu</AccordionTrigger>
        <AccordionContent className="space-y-4 pb-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Condição">
              <Select value={get("magalu", "condition")} onValueChange={(v) => set("magalu", "condition", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Novo</SelectItem>
                  <SelectItem value="used">Usado</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Garantia">
              <Select value={get("magalu", "warranty")} onValueChange={(v) => set("magalu", "warranty", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {["Sem garantia", "3 meses", "6 meses", "12 meses", "24 meses"].map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Americanas */}
      <AccordionItem value="americanas" className="border border-border rounded-lg px-4">
        <AccordionTrigger className="text-sm font-semibold">Americanas</AccordionTrigger>
        <AccordionContent className="space-y-4 pb-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Condição">
              <Select value={get("americanas", "condition")} onValueChange={(v) => set("americanas", "condition", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Novo</SelectItem>
                  <SelectItem value="used">Usado</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Garantia (meses)">
              <Select value={get("americanas", "warranty")} onValueChange={(v) => set("americanas", "warranty", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {["Sem garantia", "3 meses", "6 meses", "12 meses", "24 meses"].map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Shopify */}
      <AccordionItem value="shopify" className="border border-border rounded-lg px-4">
        <AccordionTrigger className="text-sm font-semibold">Shopify</AccordionTrigger>
        <AccordionContent className="space-y-4 pb-4">
          <Field label="Handle (URL slug)">
            <Input
              placeholder={productTitle ? productTitle.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") : "url-do-produto"}
              value={get("shopify", "handle")}
              onChange={(e) => set("shopify", "handle", e.target.value)}
            />
          </Field>
          <Field label="Tags">
            <Input placeholder="Ex: promoção, novo, destaque" value={get("shopify", "tags")} onChange={(e) => set("shopify", "tags", e.target.value)} />
          </Field>
          <Field label="Vendor">
            <Input placeholder="Nome do vendedor" value={get("shopify", "vendor")} onChange={(e) => set("shopify", "vendor", e.target.value)} />
          </Field>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
