/**
 * Job Queue — fila persistente de jobs de sincronização.
 * Persiste no banco (sync_jobs) e processa por prioridade.
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import type { JobType, JobPriority, SyncJobDTO, SyncJobRow } from "../types/job.types";
import { mapSyncJobRow } from "../types/job.types";

export interface EnqueueParams {
  tenantId: string;
  marketplace: string;
  type: JobType;
  priority?: JobPriority;
  payload?: Record<string, unknown>;
}

export const jobQueue = {
  /** Adicionar job à fila */
  async enqueueJob(params: EnqueueParams): Promise<SyncJobDTO> {
    logger.info("jobQueue.enqueueJob", { type: params.type, marketplace: params.marketplace });

    const { data, error } = await supabase
      .from("sync_jobs")
      .insert({
        tenant_id: params.tenantId,
        marketplace: params.marketplace,
        type: params.type,
        priority: params.priority ?? "MEDIUM",
        payload: params.payload ?? {},
        status: "PENDING",
      } as any)
      .select()
      .single();

    if (error) {
      logger.error("jobQueue.enqueueJob failed", { error });
      throw error;
    }

    logger.info("jobQueue.enqueueJob success", { jobId: (data as any).id });
    return mapSyncJobRow(data as unknown as SyncJobRow);
  },

  /** Pegar próximo job da fila (por prioridade) */
  async dequeueJob(tenantId?: string): Promise<SyncJobDTO | null> {
    let query = supabase
      .from("sync_jobs")
      .select("*")
      .eq("status", "PENDING")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(1);

    if (tenantId) query = query.eq("tenant_id", tenantId);

    const { data, error } = await query;
    if (error) {
      logger.error("jobQueue.dequeueJob failed", { error });
      throw error;
    }
    if (!data || data.length === 0) return null;

    // Mark as PROCESSING
    const job = data[0] as unknown as SyncJobRow;
    await supabase
      .from("sync_jobs")
      .update({ status: "PROCESSING", started_at: new Date().toISOString() } as any)
      .eq("id", job.id);

    logger.debug("jobQueue.dequeueJob", { jobId: job.id });
    return mapSyncJobRow({ ...job, status: "PROCESSING" });
  },

  /** Marcar job como concluído */
  async markCompleted(jobId: string): Promise<void> {
    logger.info("jobQueue.markCompleted", { jobId });
    const { error } = await supabase
      .from("sync_jobs")
      .update({ status: "COMPLETED", processed_at: new Date().toISOString() } as any)
      .eq("id", jobId);

    if (error) {
      logger.error("jobQueue.markCompleted failed", { jobId, error });
      throw error;
    }
  },

  /** Marcar job como falhado e incrementar retry */
  async markFailed(jobId: string, errorMessage: string): Promise<SyncJobDTO | null> {
    logger.warn("jobQueue.markFailed", { jobId, errorMessage });

    // Fetch current job
    const { data: current, error: fetchErr } = await supabase
      .from("sync_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (fetchErr || !current) {
      logger.error("jobQueue.markFailed: job not found", { jobId });
      return null;
    }

    const row = current as unknown as SyncJobRow;
    const newRetryCount = row.retry_count + 1;

    if (newRetryCount >= row.max_retries) {
      // Move to dead letter queue
      await this.moveToDead(row, errorMessage);
      return null;
    }

    const { data, error } = await supabase
      .from("sync_jobs")
      .update({
        status: "PENDING",
        retry_count: newRetryCount,
        error_message: errorMessage,
        started_at: null,
      } as any)
      .eq("id", jobId)
      .select()
      .single();

    if (error) {
      logger.error("jobQueue.markFailed update failed", { error });
      throw error;
    }

    return mapSyncJobRow(data as unknown as SyncJobRow);
  },

  /** Mover job para Dead Letter Queue */
  async moveToDead(row: SyncJobRow, errorMessage: string): Promise<void> {
    logger.error("jobQueue.moveToDead", { jobId: row.id, type: row.type });

    // Insert into dead jobs
    await supabase.from("sync_dead_jobs").insert({
      original_job_id: row.id,
      tenant_id: row.tenant_id,
      marketplace: row.marketplace,
      type: row.type,
      priority: row.priority,
      payload: row.payload ?? {},
      error_message: errorMessage,
      retry_count: row.retry_count + 1,
    } as any);

    // Update original job status
    await supabase
      .from("sync_jobs")
      .update({ status: "DEAD", error_message: errorMessage, processed_at: new Date().toISOString() } as any)
      .eq("id", row.id);
  },

  /** Listar jobs por status */
  async listJobs(params: {
    tenantId: string;
    status?: string;
    limit?: number;
  }): Promise<SyncJobDTO[]> {
    let query = supabase
      .from("sync_jobs")
      .select("*")
      .eq("tenant_id", params.tenantId)
      .order("created_at", { ascending: false })
      .limit(params.limit ?? 50);

    if (params.status) query = query.eq("status", params.status);

    const { data, error } = await query;
    if (error) {
      logger.error("jobQueue.listJobs failed", { error });
      throw error;
    }

    return (data || []).map((r: any) => mapSyncJobRow(r as SyncJobRow));
  },
};
