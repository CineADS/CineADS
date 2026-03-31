/**
 * Retry Engine
 * Gerencia reprocessamento de sincronizações falhas.
 * Registra falhas em integration_logs e permite re-execução com backoff.
 */
import { logger } from "@/lib/logger";
import { supabase } from "@/integrations/supabase/client";
import type { SyncJob, SyncOperation, SyncStatus } from "../types/integration-events";

const DEFAULT_MAX_ATTEMPTS = 3;
const BACKOFF_BASE_MS = 30_000; // 30s base

/** In-memory queue of failed jobs for retry */
const failedJobs: Map<string, SyncJob> = new Map();

export const retryEngine = {
  /** Register a failed sync for future retry */
  registerFailedSync(params: {
    tenantId: string;
    marketplace: string;
    operation: SyncOperation;
    error: string;
    payload?: Record<string, unknown>;
  }): SyncJob {
    const id = `${params.tenantId}-${params.marketplace}-${params.operation}-${Date.now()}`;
    const job: SyncJob = {
      id,
      tenantId: params.tenantId,
      marketplace: params.marketplace,
      operation: params.operation,
      status: "error",
      attempts: 1,
      maxAttempts: DEFAULT_MAX_ATTEMPTS,
      lastError: params.error,
      payload: params.payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    failedJobs.set(id, job);
    logger.warn("retryEngine.registerFailedSync", { id, operation: params.operation, error: params.error });
    return job;
  },

  /** Schedule a retry with exponential backoff */
  scheduleRetry(jobId: string, executeFn: (job: SyncJob) => Promise<void>): void {
    const job = failedJobs.get(jobId);
    if (!job) {
      logger.warn("retryEngine.scheduleRetry: job not found", { jobId });
      return;
    }
    if (job.attempts >= job.maxAttempts) {
      logger.error("retryEngine.scheduleRetry: max attempts reached", { jobId, attempts: job.attempts });
      job.status = "error";
      this._logToDb(job, "Máximo de tentativas atingido");
      return;
    }

    const delayMs = BACKOFF_BASE_MS * Math.pow(2, job.attempts - 1);
    job.status = "retrying";
    job.updatedAt = new Date();
    logger.info("retryEngine.scheduleRetry", { jobId, attempt: job.attempts + 1, delayMs });

    setTimeout(async () => {
      job.attempts++;
      job.updatedAt = new Date();
      try {
        await executeFn(job);
        job.status = "success";
        failedJobs.delete(jobId);
        logger.info("retryEngine: retry succeeded", { jobId });
      } catch (err) {
        job.lastError = err instanceof Error ? err.message : String(err);
        job.status = "error";
        logger.error("retryEngine: retry failed", { jobId, error: job.lastError });
        // Auto-schedule next retry if under limit
        this.scheduleRetry(jobId, executeFn);
      }
    }, delayMs);
  },

  /** Execute a single retry immediately */
  async retrySyncJob(jobId: string, executeFn: (job: SyncJob) => Promise<void>): Promise<boolean> {
    const job = failedJobs.get(jobId);
    if (!job) return false;

    job.attempts++;
    job.status = "running";
    job.updatedAt = new Date();

    try {
      await executeFn(job);
      job.status = "success";
      failedJobs.delete(jobId);
      return true;
    } catch (err) {
      job.lastError = err instanceof Error ? err.message : String(err);
      job.status = "error";
      return false;
    }
  },

  /** List all pending/failed jobs */
  getFailedJobs(): SyncJob[] {
    return Array.from(failedJobs.values()).filter((j) => j.status === "error" || j.status === "retrying");
  },

  /** Persist failure log to integration_logs table */
  async _logToDb(job: SyncJob, message: string): Promise<void> {
    try {
      await supabase.from("integration_logs").insert([{
        tenant_id: job.tenantId,
        marketplace: job.marketplace,
        type: "error",
        message,
        details: JSON.parse(JSON.stringify({
          operation: job.operation,
          attempts: job.attempts,
          lastError: job.lastError,
        })),
      }]);
    } catch (err) {
      logger.error("retryEngine._logToDb failed", { err });
    }
  },
};
