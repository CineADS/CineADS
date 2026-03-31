import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Upload, MoreHorizontal, Eye, History, Pencil, Pause, Play, Copy, XCircle, Package, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { PriceRuleFormModal } from "@/components/price-rules/PriceRuleFormModal";
import { PriceRulePreviewModal } from "@/components/price-rules/PriceRulePreviewModal";
import { PriceRuleHistoryModal } from "@/components/price-rules/PriceRuleHistoryModal";
import { ImportPriceSheetModal } from "@/components/price-rules/ImportPriceSheetModal";

const statusConfig: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Agendada", className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  active: { label: "Vigente", className: "bg-green-500/15 text-green-600 border-green-500/30 animate-pulse" },
  paused: { label: "Pausada", className: "bg-muted text-muted-foreground border-border" },
  expired: { label: "Encerrada", className: "bg-muted text-muted-foreground border-border" },
  cancelled: { label: "Cancelada", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

const adjustmentLabels: Record<string, (v: number) => { text: string; className: string }> = {
  percent_increase: (v) => ({ text: `+${v}% ↑`, className: "text-green-600 bg-green-500/10" }),
  percent_decrease: (v) => ({ text: `-${v}% ↓`, className: "text-red-600 bg-red-500/10" }),
  fixed_increase: (v) => ({ text: `+R$${v.toFixed(2)} ↑`, className: "text-green-600 bg-green-500/10" }),
  fixed_decrease: (v) => ({ text: `-R$${v.toFixed(2)} ↓`, className: "text-red-600 bg-red-500/10" }),
  fixed_price: (v) => ({ text: `Fixo R$${v.toFixed(2)}`, className: "text-blue-600 bg-blue-500/10" }),
};

export default function PriceRulesPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [statusTab, setStatusTab] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editRule, setEditRule] = useState<any>(null);
  const [previewRule, setPreviewRule] = useState<any>(null);
  const [historyRule, setHistoryRule] = useState<any>(null);
  const [cancelRule, setCancelRule] = useState<any>(null);

  const { data: rules, isLoading } = useQuery({
    queryKey: ["price-rules", profile?.tenant_id, statusTab],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      let query = supabase.from("price_rules").select("*").eq("tenant_id", profile.tenant_id).order("created_at", { ascending: false });
      if (statusTab !== "all") query = query.eq("status", statusTab);
      const { data } = await query;
      return data || [];
    },
    enabled: !!profile?.tenant_id,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["price-rules"] });

  const togglePause = async (rule: any) => {
    const newStatus = rule.status === "paused" ? "active" : "paused";
    await supabase.from("price_rules").update({ status: newStatus }).eq("id", rule.id);
    toast.success(newStatus === "paused" ? "Regra pausada" : "Regra reativada");
    refresh();
  };

  const duplicateRule = async (rule: any) => {
    const { id, created_at, updated_at, ...rest } = rule;
    await supabase.from("price_rules").insert({ ...rest, name: `${rest.name} (cópia)`, status: "scheduled" });
    toast.success("Regra duplicada");
    refresh();
  };

  const confirmCancel = async () => {
    if (!cancelRule) return;
    await supabase.from("price_rules").update({ status: "cancelled" }).eq("id", cancelRule.id);
    toast.success("Regra cancelada");
    setCancelRule(null);
    refresh();
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Regras de Preço</h1>
          <p className="text-sm text-muted-foreground">Ajuste preços em massa com agendamento</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)}><Upload className="mr-2 h-4 w-4" />Importar Planilha</Button>
          <Button onClick={() => { setEditRule(null); setShowForm(true); }}><Plus className="mr-2 h-4 w-4" />Nova Regra</Button>
        </div>
      </motion.div>

      <Tabs value={statusTab} onValueChange={setStatusTab}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="scheduled">Agendadas</TabsTrigger>
          <TabsTrigger value="active">Vigentes</TabsTrigger>
          <TabsTrigger value="paused">Pausadas</TabsTrigger>
          <TabsTrigger value="expired">Encerradas</TabsTrigger>
          <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
        </TabsList>
      </Tabs>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nome da Regra</TableHead>
            <TableHead>Tipo de Ajuste</TableHead>
            <TableHead>Marketplace(s)</TableHead>
            <TableHead>Vigência</TableHead>
            <TableHead className="text-center">Produtos</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />Carregando...</TableCell></TableRow>
            ) : (rules || []).length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-12">
                <DollarSign className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Nenhuma regra de preço encontrada</p>
                <p className="text-xs text-muted-foreground mt-1">Clique em "Nova Regra" para começar</p>
              </TableCell></TableRow>
            ) : (rules || []).map((rule: any) => {
              const adj = adjustmentLabels[rule.adjustment_type]?.(Number(rule.adjustment_value)) || { text: "—", className: "" };
              const status = statusConfig[rule.status] || statusConfig.scheduled;
              const scope = rule.scope || {};
              const mps = scope.marketplaces?.length > 0 ? scope.marketplaces.join(", ") : "Todos";

              return (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div><p className="font-medium text-sm">{rule.name}</p>{rule.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{rule.description}</p>}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className={cn("text-xs", adj.className)}>{adj.text}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{mps}</TableCell>
                  <TableCell className="text-xs">
                    {format(new Date(rule.starts_at), "dd/MM HH:mm", { locale: ptBR })}
                    {rule.ends_at ? ` → ${format(new Date(rule.ends_at), "dd/MM HH:mm", { locale: ptBR })}` : " → ∞"}
                  </TableCell>
                  <TableCell className="text-center"><div className="flex items-center justify-center gap-1"><Package className="h-3 w-3 text-muted-foreground" /><span className="text-sm">{rule.products_affected || 0}</span></div></TableCell>
                  <TableCell><Badge variant="outline" className={cn("text-xs", status.className)}>{status.label}</Badge></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setPreviewRule(rule)}><Eye className="mr-2 h-4 w-4" />Ver Preview</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setHistoryRule(rule)}><History className="mr-2 h-4 w-4" />Ver Histórico</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setEditRule(rule); setShowForm(true); }}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                        {(rule.status === "active" || rule.status === "paused") && (
                          <DropdownMenuItem onClick={() => togglePause(rule)}>
                            {rule.status === "paused" ? <><Play className="mr-2 h-4 w-4" />Reativar</> : <><Pause className="mr-2 h-4 w-4" />Pausar</>}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => duplicateRule(rule)}><Copy className="mr-2 h-4 w-4" />Duplicar</DropdownMenuItem>
                        {rule.status !== "cancelled" && rule.status !== "expired" && (
                          <DropdownMenuItem onClick={() => setCancelRule(rule)} className="text-destructive"><XCircle className="mr-2 h-4 w-4" />Cancelar</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </motion.div>

      <PriceRuleFormModal open={showForm} onOpenChange={setShowForm} editRule={editRule} onSaved={refresh} onPreview={(data) => { setPreviewRule(data); }} />
      {previewRule && <PriceRulePreviewModal open={!!previewRule} onOpenChange={() => setPreviewRule(null)} ruleData={previewRule} ruleId={previewRule?.id} onConfirm={() => { setPreviewRule(null); refresh(); }} onBack={() => { setPreviewRule(null); setShowForm(true); }} />}
      {historyRule && <PriceRuleHistoryModal open={!!historyRule} onOpenChange={() => setHistoryRule(null)} rule={historyRule} />}
      <ImportPriceSheetModal open={showImport} onOpenChange={setShowImport} onImported={refresh} />

      <AlertDialog open={!!cancelRule} onOpenChange={() => setCancelRule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Cancelar regra?</AlertDialogTitle><AlertDialogDescription>A regra "{cancelRule?.name}" será cancelada e não poderá mais ser aplicada.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction onClick={confirmCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Cancelar Regra</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
