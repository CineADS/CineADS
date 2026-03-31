/**
 * Worker Config — configuração para execução horizontal de workers.
 * Suporta múltiplas instâncias com locks distribuídos.
 */
import { logger } from "@/lib/logger";
import { cacheService } from "@/cache/cache.service";
import { CacheKeys, CacheTTL } from "@/cache/cache-keys";

export interface WorkerConfig {
  maxConcurrency: number;
  batchSize: number;
  pollIntervalMs: number;
  lockTtlMs: number;
  workerId: string;
}

const DEFAULT_CONFIG: WorkerConfig = {
  maxConcurrency: 5,
  batchSize: 10,
  pollIntervalMs: 5_000,
  lockTtlMs: 60_000,
  workerId: `worker_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
};

let currentConfig: WorkerConfig = { ...DEFAULT_CONFIG };
let pollInterval: ReturnType<typeof setInterval> | null = null;

export const workerConfig = {
  /** Get current config */
  getConfig(): WorkerConfig {
    return { ...currentConfig };
  },

  /** Update config */
  setConfig(partial: Partial<WorkerConfig>): void {
    currentConfig = { ...currentConfig, ...partial };
    logger.info("workerConfig.setConfig", currentConfig);
  },

  /** Acquire distributed lock for job processing */
  acquireJobLock(jobId: string): boolean {
    const resource = CacheKeys.lock(`job:${jobId}`);
    return cacheService.acquireLock(resource, currentConfig.workerId, currentConfig.lockTtlMs);
  },

  /** Release job lock */
  releaseJobLock(jobId: string): boolean {
    const resource = CacheKeys.lock(`job:${jobId}`);
    return cacheService.releaseLock(resource, currentConfig.workerId);
  },

  /** Acquire worker-level lock (prevents duplicate worker instances) */
  acquireWorkerLock(scope: string): boolean {
    const resource = CacheKeys.lock(`worker:${scope}`);
    return cacheService.acquireLock(resource, currentConfig.workerId, currentConfig.lockTtlMs);
  },

  /** Release worker lock */
  releaseWorkerLock(scope: string): boolean {
    const resource = CacheKeys.lock(`worker:${scope}`);
    return cacheService.releaseLock(resource, currentConfig.workerId);
  },

  /** Start polling for jobs */
  startPolling(processFn: () => Promise<number>): void {
    if (pollInterval) return;
    logger.info("workerConfig.startPolling", { interval: currentConfig.pollIntervalMs });

    pollInterval = setInterval(async () => {
      if (!this.acquireWorkerLock("poll")) return;
      try {
        await processFn();
      } finally {
        this.releaseWorkerLock("poll");
      }
    }, currentConfig.pollIntervalMs);
  },

  /** Stop polling */
  stopPolling(): void {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  },

  /** Reset to defaults */
  reset(): void {
    this.stopPolling();
    currentConfig = { ...DEFAULT_CONFIG };
  },
};
