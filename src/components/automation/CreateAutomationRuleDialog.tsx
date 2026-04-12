import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// ── Opções de domínio ──────────────────────────────────────────────────────
const RULE_TYPES = [
  { value: "stock_alert",      label: "Alerta de Estoque" },
  { value: "order_alert",      label: "Alerta de Pedido" },
  { value: "price_change",     label: "Mudança de Preço" },
  { value: "low_stock",        label: "Estoque Baixo" },
  { value: "payment_overdue",  label: "Pagamento Atrasado" },
] as const;

const TRIGGER_EVENTS = [
  { value: "ORDER_CREATED",   label: "Novo pedido" },
  { value: "ORDER_UPDATED",   label: "Pedido atualizado" },
  { value: "STOCK_UPDATED",   label: "Estoque atualizado" },
  { value: "STOCK_LOW",       label: "Estoque baixo" },
  { value: "STOCK_OUT",       label: "Sem estoque" },
  { value: "PRICE_UPDATED",   label: "Preço atualizado" },
] as const;

const CONDITION_FIELDS = [
  { value: "quantity",  label: "Quantidade" },
  { value: "total",     label: "Total (R$)" },
  { value: "price",     label: "Preço (R$)" },
  { value: "status",    label: "Status" },
] as const;

const OPERATORS = [
  { value: "greater_than",    label: "maior que" },
  { value: "less_than",       label: "menor que" },
  { value: "equals",          label: "igual a" },
  { value: "less_or_equal",   label: "menor ou igual a" },
  { value: "greater_or_equal",label: "maior ou igual a" },
] as const;

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

// ── Schema Zod ─────────────────────────────────────────────────────────────
const schema = z.object({
  name:             z.string().min(1, "Nome obrigatório"),
  description:      z.string().optional(),
  rule_type:        z.string().min(1, "Tipo obrigatório"),
  priority:         z.enum(PRIORITIES),
  trigger_event:    z.string().min(1, "Evento obrigatório"),
  condition_field:  z.string().min(1, "Campo obrigatório"),
  condition_operator: z.string().min(1, "Operador obrigatório"),
  condition_value:  z.string().min(1, "Valor obrigatório"),
  action_message:   z.string().min(1, "Mensagem da ação obrigatória"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAutomationRuleDialog({ open, onOpenChange }: Props) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      priority: "MEDIUM",
      condition_field: "quantity",
      condition_operator: "less_than",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: FormValues) => {
      // Monta as estruturas JSONB esperadas pelo rule engine
      const conditions = {
        triggerEvents: [values.trigger_event],
        conditions: [{
          field:    values.condition_field,
          operator: values.condition_operator,
          value:    isNaN(Number(values.condition_value))
                      ? values.condition_value
                      : Number(values.condition_value),
        }],
      };

      const actions = [{
        type:   "notify_user",
        params: {
          title:   `Automação: ${values.name}`,
          message: values.action_message,
        },
      }];

      const { error } = await supabase.from("automation_rules").insert({
        tenant_id:   profile!.tenant_id,
        name:        values.name,
        description: values.description || null,
        rule_type:   values.rule_type,
        priority:    values.priority,
        status:      "active",
        conditions,
        actions,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Regra criada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      form.reset();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error("Erro ao criar regra", { description: String(err) });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Regra de Automação</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutate(v))} className="space-y-4">

            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl><Input placeholder="Ex: Alerta estoque crítico" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição <span className="text-muted-foreground text-xs">(opcional)</span></FormLabel>
                <FormControl><Textarea rows={2} placeholder="O que esta regra faz?" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="rule_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {RULE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridade</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="trigger_event" render={({ field }) => (
              <FormItem>
                <FormLabel>Disparar quando</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione o evento" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {TRIGGER_EVENTS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Condição: campo + operador + valor */}
            <div className="rounded-lg border border-border p-3 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Condição</p>
              <div className="grid grid-cols-3 gap-2">
                <FormField control={form.control} name="condition_field" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Campo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {CONDITION_FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <FormField control={form.control} name="condition_operator" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Operador</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {OPERATORS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <FormField control={form.control} name="condition_value" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Valor</FormLabel>
                    <FormControl><Input className="h-8 text-xs" placeholder="ex: 5" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Ação */}
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ação — Notificar usuário</p>
              <FormField control={form.control} name="action_message" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea rows={2} placeholder="Mensagem da notificação que será enviada..." {...field} />
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
