import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Warehouse as WarehouseIcon, MapPin, Star } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface WarehouseForm {
  name: string;
  description: string;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  is_default: boolean;
  active: boolean;
}

const emptyForm: WarehouseForm = {
  name: "", description: "", cep: "", street: "", number: "",
  neighborhood: "", city: "", state: "", is_default: false, active: true,
};

export default function WarehousesPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<WarehouseForm>(emptyForm);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);

  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ["warehouses", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase.from("warehouses").select("*").eq("tenant_id", profile.tenant_id).order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id || !form.name) throw new Error("Nome obrigatório");
      const address = { cep: form.cep, street: form.street, number: form.number, neighborhood: form.neighborhood, city: form.city, state: form.state };
      const payload = { tenant_id: profile.tenant_id, name: form.name, description: form.description || null, address, is_default: form.is_default, active: form.active };

      if (form.is_default) {
        await supabase.from("warehouses").update({ is_default: false }).eq("tenant_id", profile.tenant_id);
      }

      if (editing) {
        const { error } = await supabase.from("warehouses").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("warehouses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success(editing ? "Armazém atualizado!" : "Armazém criado!");
      closeModal();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("warehouses").update({ active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success("Armazém desativado");
      setDeactivateId(null);
    },
  });

  const setDefault = async (id: string) => {
    if (!profile?.tenant_id) return;
    await supabase.from("warehouses").update({ is_default: false }).eq("tenant_id", profile.tenant_id);
    await supabase.from("warehouses").update({ is_default: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    toast.success("Armazém padrão atualizado");
  };

  const openEdit = (w: any) => {
    const addr = w.address || {};
    setEditing(w);
    setForm({ name: w.name, description: w.description || "", cep: addr.cep || "", street: addr.street || "", number: addr.number || "", neighborhood: addr.neighborhood || "", city: addr.city || "", state: addr.state || "", is_default: w.is_default, active: w.active });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditing(null); setForm(emptyForm); };

  const fetchCep = async (cep: string) => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((prev) => ({ ...prev, street: data.logradouro || "", neighborhood: data.bairro || "", city: data.localidade || "", state: data.uf || "" }));
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Armazéns</h1><p className="text-sm text-muted-foreground">{warehouses.length} armazém(ns) cadastrado(s)</p></div>
        <Button onClick={() => setShowModal(true)}><Plus className="mr-2 h-4 w-4" /> Novo Armazém</Button>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : warehouses.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <WarehouseIcon className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-lg font-medium">Nenhum armazém cadastrado</p>
          <p className="text-sm text-muted-foreground">Crie seu primeiro armazém para organizar o estoque.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((w: any) => {
            const addr = w.address || {};
            return (
              <motion.div key={w.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <WarehouseIcon className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">{w.name}</h3>
                  </div>
                  <div className="flex gap-1">
                    {w.is_default && <Badge className="bg-primary/15 text-primary border-primary/30 text-xs"><Star className="h-3 w-3 mr-1" /> Padrão</Badge>}
                    {!w.active && <Badge variant="destructive" className="text-xs">Inativo</Badge>}
                  </div>
                </div>
                {w.description && <p className="text-sm text-muted-foreground">{w.description}</p>}
                {addr.city && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {addr.city}/{addr.state}</p>
                )}
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(w)}><Pencil className="h-3.5 w-3.5 mr-1" /> Editar</Button>
                  {!w.is_default && w.active && <Button variant="ghost" size="sm" onClick={() => setDefault(w.id)}><Star className="h-3.5 w-3.5 mr-1" /> Definir Padrão</Button>}
                  {w.active && <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeactivateId(w.id)}>Desativar</Button>}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar Armazém" : "Novo Armazém"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Nome *</Label><Input placeholder="Armazém Principal" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea placeholder="Descrição do armazém..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>CEP</Label><Input placeholder="01001-000" value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} onBlur={(e) => fetchCep(e.target.value)} /></div>
              <div className="space-y-2"><Label>Número</Label><Input placeholder="123" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Rua</Label><Input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Bairro</Label><Input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} /></div>
              <div className="space-y-2"><Label>Cidade</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div className="space-y-2"><Label>UF</Label><Input maxLength={2} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} /></div>
            </div>
            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_default} onCheckedChange={(v) => setForm({ ...form, is_default: v })} /> Armazém Padrão</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /> Ativo</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>{saveMutation.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deactivateId} onOpenChange={(open) => !open && setDeactivateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Desativar armazém?</AlertDialogTitle><AlertDialogDescription>Produtos neste armazém continuarão registrados, mas o armazém não poderá receber novas movimentações.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deactivateId && deactivateMutation.mutate(deactivateId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Desativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
