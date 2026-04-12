import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const MARKETPLACES = ["Mercado Livre", "Shopee", "Amazon", "Magalu", "Americanas"];

const STRATEGIES = [
  { value: "FIXED_MARGIN",    label: "Margem Fixa" },
  { value: "BEAT_COMPETITOR", label: "Bater Concorrente" },
  { value: "FOLLOW_MARKET",   label: "Seguir Mercado" },
] as const;

const schema = z.object({
  product_id:    z.string().uuid("Selecione um produto"),
  marketplace:   z.string().min(1, "Marketplace obrigatório"),
  strategy:      z.string().min(1, "Estratégia obrigatória"),
  min_price:     z.coerce.number().min(0.01, "Preço mínimo deve ser maior que zero"),
  max_price:     z.coerce.number().optional(),
  target_margin: z.coerce.number().min(0).max(100),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRepricingRuleDialog({ open, onOpenChange }: Props) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: products } = useQuery({
    queryKey: ["products-select", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data } = await supabase
        .from("products")
        .select("id, title, sku")
        .eq("tenant_id", profile.tenant_id)
        .order("title");
      return data || [];
    },
    enabled: !!profile?.tenant_id && open,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      strategy:      "FIXED_MARGIN",
      target_margin: 15,
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: FormValues) => {
      const { error } = await supabase.from("repricing_rules").insert({
        tenant_id:     profile!.tenant_id,
        product_id:    values.product_id,
        marketplace:   values.marketplace,
        strategy:      values.strategy,
        min_price:     values.min_price,
        max_price:     values.max_price ?? null,
        target_margin: values.target_margin,
        status:        "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Regra de repricing criada");
      queryClient.invalidateQueries({ queryKey: ["repricing-rules"] });
      form.reset();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error("Erro ao criar regra", { description: String(err) });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Regra de Repricing</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutate(v))} className="space-y-4">

            <FormField control={form.control} name="product_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Produto</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o produto" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {products?.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}{p.sku ? ` — ${p.sku}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="marketplace" render={({ field }) => (
                <FormItem>
                  <FormLabel>Marketplace</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {MARKETPLACES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="strategy" render={({ field }) => (
                <FormItem>
                  <FormLabel>Estratégia</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {STRATEGIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <FormField control={form.control} name="min_price" render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço Mín. (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="0,00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="max_price" render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço Máx. <span className="text-muted-foreground text-xs">(opcional)</span></FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="—" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="target_margin" render={({ field }) => (
                <FormItem>
                  <FormLabel>Margem Alvo (%)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" min="0" max="100" placeholder="15" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : "Criar Regra"}
              </Button>
            </div>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
