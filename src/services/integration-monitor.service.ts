/**
 * Integration Monitor Service
 * Responsável por fornecer visibilidade sobre o estado dos jobs de sincronização
 * e saúde das integrações de marketplace.
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { rateLimitManager } from "@/integrations/rate-limit/rate-limit-manager";
import { cacheService } from "@/cache/cache.service";
import { streamPublisher } from "@/events/streaming/stream-publisher";
import type { SyncJobDTO, DeadJobDTO, SyncJobRow } from "@/jobs/types/job.types";
import { mapSyncJobRow } from "@/jobs/types/job.types";

export interface JobStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  dead: number;
  avgProcessingMs: number | null;
}

export interface IntegrationHealthDTO {
  marketplace: string;
  status: string;
  lastSyncAt: string | null;
  syncErrorRate: number;
  avgProcessingMs: number | null;
  jobsLast24h: number;
  failedLast24h: number;
}

export interface HubHealthSummary {
  totalJobsToday: number;
  jobsPerMinute: number;
  avgProcessingTime: number | null;
  syncErrorRate: number;
  marketplaceHealth: IntegrationHealthDTO[];
  performance: PerformanceMetrics;
}

export interface PerformanceMetrics {
  queueDepth: number;
  workerLag: number | null;
  eventsPerSecond: number;
  apiCallRate: number;
  rateLimitHits: number;
  cacheHitRate: number;
  streamStats: Record<string, { total: number; pending: number; acknowledged: number }>;
}

export const integrationMonitorService = {
  /** Estatísticas resumidas dos jobs */
  async getJobStats(tenantId: string): Promise<JobStats> {
    logger.debug("integrationMonitorService.getJobStats", { tenantId });

    const { data, error } = await supabase
      .from("sync_jobs")
      .select("status, started_at, processed_at")
      .eq("tenant_id", tenantId);

    if (error) {
      logger.error("integrationMonitorService.getJobStats failed", { error });
      throw error;
    }

    const rows = data || [];
    const stats: JobStats = { pending: 0, processing: 0, completed: 0, failed: 0, dead: 0, avgProcessingMs: null };
    let totalMs = 0;
    let completedWithTime = 0;

    for (const r of rows) {
      const s = (r as any).status as string;
      if (s === "PENDING") stats.pending++;
      else if (s === "PROCESSING") stats.processing++;
      else if (s === "COMPLETED") stats.completed++;
      else if (s === "FAILED") stats.failed++;
      else if (s === "DEAD") stats.dead++;

      if (s === "COMPLETED" && (r as any).started_at && (r as any).processed_at) {
        totalMs += new Date((r as any).processed_at).getTime() - new Date((r as any).started_at).getTime();
        completedWithTime++;
      }
    }

    stats.avgProcessingMs = completedWithTime > 0 ? Math.round(totalMs / completedWithTime) : null;
    return stats;
  },

  /** Saúde geral do HUB */
  async getHubHealth(tenantId: string): Promise<HubHealthSummary> {
    logger.debug("integrationMonitorService.getHubHealth", { tenantId });

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [jobsRes, integrationsRes] = await Promise.all([
      supabase
        .from("sync_jobs")
        .select("marketplace, status, started_at, processed_at, created_at")
        .eq("tenant_id", tenantId)
        .gte("created_at", since24h),
      supabase
        .from("marketplace_integrations")
        .select("marketplace, status, updated_at")
        .eq("tenant_id", tenantId),
    ]);

    const jobs = jobsRes.data || [];
    const integrations = integrationsRes.data || [];

    // Agrupar por marketplace
    const mktMap = new Map<string, { total: number; failed: number; totalMs: number; completed: number; lastSync: string | null }>();
    for (const j of jobs) {
      const mkt = (j as any).marketplace as string;
      const entry = mktMap.get(mkt) || { total: 0, failed: 0, totalMs: 0, completed: 0, lastSync: null };
      entry.total++;
      if ((j as any).status === "FAILED" || (j as any).status === "DEAD") entry.failed++;
      if ((j as any).status === "COMPLETED" && (j as any).started_at && (j as any).processed_at) {
        entry.totalMs += new Date((j as any).processed_at).getTime() - new Date((j as any).started_at).getTime();
        entry.completed++;
        if (!entry.lastSync || (j as any).processed_at > entry.lastSync) {
          entry.lastSync = (j as any).processed_at;
        }
      }
      mktMap.set(mkt, entry);
    }

    const totalJobs = jobs.length;
    const totalFailed = jobs.filter((j: any) => j.status === "FAILED" || j.status === "DEAD").length;
    let totalMs = 0;
    let completedCount = 0;
    for (const e of mktMap.values()) {
      totalMs += e.totalMs;
      completedCount += e.completed;
    }

    // Calcular jobs/minuto (últimas 24h)
    const jobsPerMinute = totalJobs > 0 ? Math.round((totalJobs / (24 * 60)) * 100) / 100 : 0;

    const marketplaceHealth: IntegrationHealthDTO[] = integrations.map((i: any) => {
      const mktData = mktMap.get(i.marketplace);
      return {
        marketplace: i.marketplace,
        status: i.status,
        lastSyncAt: mktData?.lastSync || null,
        syncErrorRate: mktData && mktData.total > 0 ? Math.round((mktData.failed / mktData.total) * 100) : 0,
        avgProcessingMs: mktData && mktData.completed > 0 ? Math.round(mktData.totalMs / mktData.completed) : null,
        jobsLast24h: mktData?.total || 0,
        failedLast24h: mktData?.failed || 0,
      };
    });

    // Performance metrics
    const rlMetrics = rateLimitManager.getMetrics();
    const cacheStats = cacheService.getStats();
    const streamStats = streamPublisher.getStats();

    // Queue depth = pending jobs
    const queueDepth = jobs.filter((j: any) => j.status === "PENDING").length;

    // Worker lag = oldest pending job age
    const pendingJobs = jobs.filter((j: any) => j.status === "PENDING");
    const oldestPending = pendingJobs.length > 0
      ? Math.min(...pendingJobs.map((j: any) => new Date(j.created_at).getTime()))
      : null;
    const workerLag = oldestPending ? Date.now() - oldestPending : null;

    const performance: PerformanceMetrics = {
      queueDepth,
      workerLag,
      eventsPerSecond: totalJobs > 0 ? Math.round((totalJobs / (24 * 3600)) * 100) / 100 : 0,
      apiCallRate: rlMetrics.totalAcquired,
      rateLimitHits: rlMetrics.totalRejected,
      cacheHitRate: cacheStats.entries,
      streamStats,
    };

    return {
      totalJobsToday: totalJobs,
      jobsPerMinute,
      avgProcessingTime: completedCount > 0 ? Math.round(totalMs / completedCount) : null,
      syncErrorRate: totalJobs > 0 ? Math.round((totalFailed / totalJobs) * 100) : 0,
      marketplaceHealth,
      performance,
    };
  },

  /** Listar jobs ativos (PENDING + PROCESSING) */
  async listActiveJobs(tenantId: string, limit = 20): Promise<SyncJobDTO[]> {
    const { data, error } = await supabase
      .from("sync_jobs")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("status", ["PENDING", "PROCESSING"])
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) { logger.error("integrationMonitorService.listActiveJobs failed", { error }); throw error; }
    return (data || []).map((r: any) => mapSyncJobRow(r as SyncJobRow));
  },

  /** Listar jobs falhados */
  async listFailedJobs(tenantId: string, limit = 20): Promise<SyncJobDTO[]> {
    const { data, error } = await supabase
      .from("sync_jobs")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("status", ["FAILED", "DEAD"])
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) { logger.error("integrationMonitorService.listFailedJobs failed", { error }); throw error; }
    return (data || []).map((r: any) => mapSyncJobRow(r as SyncJobRow));
  },

  /** Listar jobs concluídos recentes */
  async listCompletedJobs(tenantId: string, limit = 20): Promise<SyncJobDTO[]> {
    const { data, error } = await supabase
      .from("sync_jobs")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", "COMPLETED")
      .order("processed_at", { ascending: false })
      .limit(limit);

    if (error) { logger.error("integrationMonitorService.listCompletedJobs failed", { error }); throw error; }
    return (data || []).map((r: any) => mapSyncJobRow(r as SyncJobRow));
  },

  /** Listar dead letter queue */
  async listDeadJobs(tenantId: string, limit = 20): Promise<DeadJobDTO[]> {
    const { data, error } = await supabase
      .from("sync_dead_jobs")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("died_at", { ascending: false })
      .limit(limit);

    if (error) { logger.error("integrationMonitorService.listDeadJobs failed", { error }); throw error; }
    return (data || []).map((r: any) => ({
      id: r.id,
      originalJobId: r.original_job_id,
      tenantId: r.tenant_id,
      marketplace: r.marketplace,
      type: r.type,
      priority: r.priority,
      payload: r.payload ?? {},
      errorMessage: r.error_message,
      retryCount: r.retry_count,
      diedAt: r.died_at,
    }));
  },
};
