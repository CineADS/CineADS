/**
 * Job Types — definições para o sistema de processamento assíncrono.
 * Usado por Job Queue, Worker e Scheduler.
 */

export type JobType =
  | "SYNC_ORDERS"
  | "SYNC_PRODUCTS"
  | "SYNC_STOCK"
  | "SYNC_PRICES";

export type JobPriority = "HIGH" | "MEDIUM" | "LOW";

export type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "DEAD";

/** Prioridade numérica para ordenação (menor = mais prioritário) */
export const PRIORITY_ORDER: Record<JobPriority, number> = {
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export const JOB_TYPE_TO_SYNC_OP = {
  SYNC_ORDERS: "sync_orders",
  SYNC_PRODUCTS: "sync_products",
  SYNC_STOCK: "sync_stock",
  SYNC_PRICES: "sync_prices",
} as const;

export interface SyncJobRow {
  id: string;
  tenant_id: string;
  marketplace: string;
  type: string;
  priority: string;
  payload: Record<string, unknown> | null;
  status: string;
  retry_count: number;
  max_retries: number;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  processed_at: string | null;
  updated_at: string;
}

export interface SyncJobDTO {
  id: string;
  tenantId: string;
  marketplace: string;
  type: JobType;
  priority: JobPriority;
  payload: Record<string, unknown>;
  status: JobStatus;
  retryCount: number;
  maxRetries: number;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  processedAt: string | null;
}

export interface DeadJobDTO {
  id: string;
  originalJobId: string | null;
  tenantId: string;
  marketplace: string;
  type: JobType;
  priority: JobPriority;
  payload: Record<string, unknown>;
  errorMessage: string | null;
  retryCount: number;
  diedAt: string;
}

export function mapSyncJobRow(row: SyncJobRow): SyncJobDTO {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    marketplace: row.marketplace,
    type: row.type as JobType,
    priority: row.priority as JobPriority,
    payload: (row.payload as Record<string, unknown>) ?? {},
    status: row.status as JobStatus,
    retryCount: row.retry_count,
    maxRetries: row.max_retries,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    startedAt: row.started_at,
    processedAt: row.processed_at,
  };
}
