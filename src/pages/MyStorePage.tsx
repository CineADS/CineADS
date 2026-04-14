import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Store, ExternalLink, Palette, Image, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const TEMPLATES = [
  { id: "moderno",      label: "Moderno",      desc: "Grid de cards, header com busca" },
  { id: "minimalista", label: "Minimalista",   desc: "Layout limpo, foco no produto" },
  { id: "negrito",     label: "Negrito",       desc: "Cores fortes, impacto visual" },
] as const;

export default function MyStorePage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["my-store", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, store_slug, store_active, store_settings")
        .eq("id", profile!.tenant_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const settings = (tenant?.store_settings as any) || {};

  const [slug, setSlug]               = useState("");
  const [active, setActive]           = useState(false);
  const [template, setTemplate]       = useState("moderno");
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [storeName, setStoreName]     = useState("");
  const [description, setDescription] = useState("");
  const [apiKey, setApiKey]           = useState("");

  // Sincroniza state quando dados carregam
  useState(() => {
    if (tenant) {
      setSlug(tenant.store_slug || "");
      setActive(tenant.store_active || false);
      setTemplate(settings.template || "moderno");
      setPrimaryColor(settings.primary_color || "#6366f1");
      setStoreName(settings.store_name || tenant.name || "");
      setDescription(settings.store_description || "");
      setApiKey(settings.infinitepay_api_key || "");
    }
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tenants")
        .update({
          store_slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
          store_active: active,
          store_settings: {
            template,
            primary_color: primaryColor,
            store_name: storeName,
            store_description: description,
            infinitepay_api_key: apiKey,
          },
        })
        .eq("id", profile!.tenant_id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Loja atualizada!");
      queryClient.invalidateQueries({ queryKey: ["my-store"] });
    },
    onError: () => toast.error("Erro ao salvar. Verifique se o slug já está em uso."),
  });

  const storeUrl = `https://loja.cineads.com.br/${slug}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(storeUrl);
    toast.success("Link copiado!");
  };

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Status */}
      <div className="rounded-xl border bg-card p-5 flex items-center justify-between">
        <div>
          <p className="font-semibold">Minha Loja</p>
          <p className="text-sm text-muted-foreground">
            {active ? "Loja está no ar" : "Loja desativada"}
          </p>
        </div>
        <Switch checked={active} onCheckedChange={setActive} />
      </div>

      {/* Link da loja */}
      {slug && (
        <div className="rounded-xl border bg-card p-5 space-y-2">
          <Label>Link da sua loja</Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm bg-muted px-3 py-2 rounded-lg truncate">{storeUrl}</code>
            <Button variant="outline" size="icon" onClick={copyUrl}><Copy className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" asChild>
              <a href={storeUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
            </Button>
          </div>
        </div>
      )}

      {/* Configurações */}
      <div className="rounded-xl border bg-card p-5 space-y-5">
        <div className="flex items-center gap-2 font-semibold">
          <Store className="h-4 w-4" /> Configurações da loja
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Slug da loja *</Label>
            <Input placeholder="minha-loja" value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
            <p className="text-xs text-muted-foreground">loja.cineads.com.br/{slug || "..."}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Nome da loja *</Label>
            <Input placeholder="Minha Loja" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Descrição (opcional)</Label>
          <Input placeholder="Produtos de qualidade com entrega rápida"
            value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>

      {/* Personalização */}
      <div className="rounded-xl border bg-card p-5 space-y-5">
        <div className="flex items-center gap-2 font-semibold">
          <Palette className="h-4 w-4" /> Personalização
        </div>

        <div className="space-y-1.5">
          <Label>Template</Label>
          <div className="grid grid-cols-3 gap-3">
            {TEMPLATES.map((t) => (
              <button key={t.id} onClick={() => setTemplate(t.id)}
                className={`p-3 rounded-xl border text-left transition-colors ${template === t.id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}>
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Cor principal</Label>
          <div className="flex items-center gap-3">
            <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border" />
            <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-32" />
            <div className="flex gap-2">
              {["#6366f1","#f59e0b","#10b981","#ef4444","#3b82f6","#000000"].map((c) => (
                <button key={c} onClick={() => setPrimaryColor(c)}
                  className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ backgroundColor: c, borderColor: primaryColor === c ? c : "transparent" }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* InfinitePay */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <Image className="h-4 w-4" /> Pagamentos — InfinitePay
        </div>
        <div className="space-y-1.5">
          <Label>API Key do InfinitePay</Label>
          <Input type="password" placeholder="sk_live_..." value={apiKey}
            onChange={(e) => setApiKey(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            Encontre em: InfinitePay → Configurações → Integrações → API
          </p>
        </div>
      </div>

      <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full">
        {save.isPending ? "Salvando..." : "Salvar configurações"}
      </Button>
    </div>
  );
}
