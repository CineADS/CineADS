/**
 * Finance Service
 * Responsável por contas a pagar, receber e transações.
 * Tabelas: payables, receivables, transactions
 * Isolamento: tenant_id obrigatório em todas as queries.
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import type { PayableSummaryDTO, ReceivableSummaryDTO, TransactionDTO } from "@/types/dto";

export const financeService = {
  /** Resumo de contas a pagar pendentes */
  async listPendingPayables(tenantId: string): Promise<PayableSummaryDTO[]> {
    logger.debug("financeService.listPendingPayables", { tenantId });
    const { data, error } = await supabase
      .from("payables")
      .select("amount, status, due_date")
      .eq("tenant_id", tenantId)
      .neq("status", "paid");
    if (error) { logger.error("financeService.listPendingPayables failed", { error }); throw error; }
    return (data || []).map(p => ({ amount: Number(p.amount), status: p.status, dueDate: p.due_date }));
  },

  /** Resumo de contas a receber pendentes */
  async listPendingReceivables(tenantId: string): Promise<ReceivableSummaryDTO[]> {
    logger.debug("financeService.listPendingReceivables", { tenantId });
    const { data, error } = await supabase
      .from("receivables")
      .select("amount, status, due_date")
      .eq("tenant_id", tenantId)
      .neq("status", "received");
    if (error) { logger.error("financeService.listPendingReceivables failed", { error }); throw error; }
    return (data || []).map(r => ({ amount: Number(r.amount), status: r.status, dueDate: r.due_date }));
  },

  /** Listar transações por período */
  async listTransactions(tenantId: string, from: string, to?: string): Promise<TransactionDTO[]> {
    logger.debug("financeService.listTransactions", { tenantId, from, to });
    let query = supabase
      .from("transactions")
      .select("*")
      .eq("tenant_id", tenantId)
      .gte("date", from)
      .order("date", { ascending: false });
    if (to) query = query.lte("date", to);
    const { data, error } = await query;
    if (error) { logger.error("financeService.listTransactions failed", { error }); throw error; }
    return (data || []).map(t => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      date: t.date,
      description: t.description,
      category: t.category,
      referenceId: t.reference_id,
    }));
  },
};
