export const APP_CONFIG = {
  APP_NAME: "Marketplace Hub",
  CACHE_TIME: 5 * 60 * 1000, // 5 min
  STALE_TIME: 2 * 60 * 1000, // 2 min
  SYNC_CONCURRENCY: 5,
  UPSERT_CHUNK_SIZE: 500,
  AUTH_TIMEOUT_MS: 5000,
  PAGINATION_DEFAULT: 20,
} as const;
