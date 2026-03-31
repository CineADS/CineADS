import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, DollarSign, Bell } from "lucide-react";
import { motion } from "framer-motion";

const statusBadge: Record<string, { label: string; class: string }> = {
  active: { label: "Ativo", class: "bg-success/15 text-success border-success/30" },
  paused: { label: "Pausado", class: "bg-muted text-muted-foreground border-border" },
  inactive: { label: "Inativo", class: "bg-muted text-muted-foreground border-border" },
};

export default function AutomationPage() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const { data: automationRules, isLoading: arLoading } = useQuery({
    queryKey: ["automation-rules", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("automation_rules").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: repricingRules, isLoading: rpLoading } = useQuery({
    queryKey: ["repricing-rules", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("repricing_rules").select("*, products(title)").eq("tenant_id", tenantId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenantId,
  });

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Automação</h1>
        <p className="text-sm text-muted-foreground">Regras automáticas, repricing e alertas</p>
      </motion.div>

      <Tabs defaultValue="automation">
        <TabsList>
          <TabsTrigger value="automation"><Zap className="h-4 w-4 mr-1" /> Regras</TabsTrigger>
          <TabsTrigger value="repricing"><DollarSign className="h-4 w-4 mr-1" /> Repricing</TabsTrigger>
        </TabsList>

        <TabsContent value="automation" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Regras de Automação ({automationRules?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {arLoading ? (
                <p className="text-muted-foreground text-sm py-8 text-center">Carregando...</p>
              ) : (automationRules?.length ?? 0) === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">Nenhuma regra configurada</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Execuções</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {automationRules!.map((r: any) => {
                      const st = statusBadge[r.status] || statusBadge.inactive;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell><Badge variant="outline">{r.rule_type}</Badge></TableCell>
                          <TableCell><Badge variant="outline">{r.priority}</Badge></TableCell>
                          <TableCell><Badge variant="outline" className={st.class}>{st.label}</Badge></TableCell>
                          <TableCell className="text-right font-mono">{r.trigger_count}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repricing" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Regras de Repricing ({repricingRules?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {rpLoading ? (
                <p className="text-muted-foreground text-sm py-8 text-center">Carregando...</p>
              ) : (repricingRules?.length ?? 0) === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">Nenhuma regra de repricing</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Marketplace</TableHead>
                      <TableHead>Estratégia</TableHead>
                      <TableHead className="text-right">Preço Min</TableHead>
                      <TableHead className="text-right">Preço Atual</TableHead>
                      <TableHead className="text-right">Concorrente</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repricingRules!.map((r: any) => {
                      const st = statusBadge[r.status] || statusBadge.inactive;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{(r.products as any)?.title || "—"}</TableCell>
                          <TableCell>{r.marketplace}</TableCell>
                          <TableCell><Badge variant="outline">{r.strategy}</Badge></TableCell>
                          <TableCell className="text-right font-mono">{fmt(r.min_price)}</TableCell>
                          <TableCell className="text-right font-mono">{r.current_price ? fmt(r.current_price) : "—"}</TableCell>
                          <TableCell className="text-right font-mono">{r.competitor_price ? fmt(r.competitor_price) : "—"}</TableCell>
                          <TableCell><Badge variant="outline" className={st.class}>{st.label}</Badge></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
