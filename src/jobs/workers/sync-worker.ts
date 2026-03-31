/**
 * Sync Worker — processa jobs da fila usando a Sync Engine.
 * Cada tipo de job é delegado para o método correspondente da Sync Engine.
 */
import { logger } from "@/lib/logger";
import { syncEngine } from "@/integrations/core/sync-engine";
import { jobQueue } from "../queue/job-queue";
import type { SyncJobDTO, JobType } from "../types/job.types";
import { JOB_TYPE_TO_SYNC_OP } from "../types/job.types";
import type { SyncOperation } from "@/integrations/types/integration-events";

const processingLock = { active: false };

export const syncWorker = {
  /** Processar um job específico */
  async processJob(job: SyncJobDTO): Promise<boolean> {
    logger.info("syncWorker.processJob", { jobId: job.id, type: job.type, marketplace: job.marketplace });

    try {
      const op = JOB_TYPE_TO_SYNC_OP[job.type] as SyncOperation;
      let result;

      switch (job.type as JobType) {
        case "SYNC_ORDERS":
          result = await syncEngine.syncOrders(job.tenantId, job.marketplace);
          break;
        case "SYNC_PRODUCTS":
          result = await syncEngine.syncProducts(job.tenantId, job.marketplace);
          break;
        case "SYNC_STOCK":
          result = await syncEngine.syncStock(job.tenantId, job.marketplace);
          break;
        case "SYNC_PRICES":
          result = await syncEngine.syncPrices(job.tenantId, job.marketplace);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      if (result.success) {
        await jobQueue.markCompleted(job.id);
        logger.info("syncWorker.processJob completed", { jobId: job.id, synced: result.synced });
        return true;
      } else {
        const errMsg = JSON.stringify(result.details ?? {});
        await jobQueue.markFailed(job.id, errMsg);
        logger.warn("syncWorker.processJob sync returned error", { jobId: job.id });
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error("syncWorker.processJob failed", { jobId: job.id, error: errorMessage });
      await jobQueue.markFailed(job.id, errorMessage);
      return false;
    }
  },

  /** Processar próximo job da fila */
  async processNext(tenantId?: string): Promise<boolean> {
    if (processingLock.active) {
      logger.debug("syncWorker.processNext: already processing");
      return false;
    }

    processingLock.active = true;
    try {
      const job = await jobQueue.dequeueJob(tenantId);
      if (!job) {
        logger.debug("syncWorker.processNext: no jobs in queue");
        return false;
      }
      return await this.processJob(job);
    } finally {
      processingLock.active = false;
    }
  },

  /** Processar todos os jobs pendentes (batch) */
  async processAll(tenantId?: string): Promise<number> {
    let processed = 0;
    let hasMore = true;

    while (hasMore) {
      const result = await this.processNext(tenantId);
      if (result) {
        processed++;
      } else {
        hasMore = false;
      }
    }

    if (processed > 0) {
      logger.info("syncWorker.processAll done", { processed });
    }
    return processed;
  },
};
