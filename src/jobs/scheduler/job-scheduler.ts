/**
 * Job Scheduler — agenda sincronizações periódicas automaticamente.
 * Cria jobs na fila em intervalos configuráveis por tipo.
 */
import { logger } from "@/lib/logger";
import { jobQueue } from "../queue/job-queue";
import { syncWorker } from "../workers/sync-worker";
import type { JobType, JobPriority } from "../types/job.types";

interface ScheduleConfig {
  type: JobType;
  intervalMs: number;
  priority: JobPriority;
}

const DEFAULT_SCHEDULES: ScheduleConfig[] = [
  { type: "SYNC_ORDERS", intervalMs: 5 * 60 * 1000, priority: "HIGH" },
  { type: "SYNC_STOCK", intervalMs: 10 * 60 * 1000, priority: "MEDIUM" },
  { type: "SYNC_PRODUCTS", intervalMs: 30 * 60 * 1000, priority: "LOW" },
];

const activeIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();

export const jobScheduler = {
  /** Iniciar scheduler para um tenant/marketplace */
  start(tenantId: string, marketplace: string, schedules?: ScheduleConfig[]): void {
    const configs = schedules ?? DEFAULT_SCHEDULES;
    logger.info("jobScheduler.start", { tenantId, marketplace, jobs: configs.length });

    for (const config of configs) {
      const key = `${tenantId}-${marketplace}-${config.type}`;

      // Evita duplicatas
      if (activeIntervals.has(key)) {
        logger.debug("jobScheduler: already scheduled", { key });
        continue;
      }

      const interval = setInterval(async () => {
        try {
          logger.debug("jobScheduler: enqueuing", { type: config.type, marketplace });
          await jobQueue.enqueueJob({
            tenantId,
            marketplace,
            type: config.type,
            priority: config.priority,
          });
          // Trigger worker to process
          await syncWorker.processNext(tenantId);
        } catch (err) {
          logger.error("jobScheduler: failed to enqueue", { type: config.type, error: err });
        }
      }, config.intervalMs);

      activeIntervals.set(key, interval);
    }
  },

  /** Parar scheduler para um tenant/marketplace */
  stop(tenantId: string, marketplace: string): void {
    logger.info("jobScheduler.stop", { tenantId, marketplace });
    for (const [key, interval] of activeIntervals.entries()) {
      if (key.startsWith(`${tenantId}-${marketplace}`)) {
        clearInterval(interval);
        activeIntervals.delete(key);
      }
    }
  },

  /** Parar todos os schedulers */
  stopAll(): void {
    logger.info("jobScheduler.stopAll", { count: activeIntervals.size });
    for (const [key, interval] of activeIntervals.entries()) {
      clearInterval(interval);
      activeIntervals.delete(key);
    }
  },

  /** Listar schedulers ativos */
  getActiveSchedules(): string[] {
    return Array.from(activeIntervals.keys());
  },
};
