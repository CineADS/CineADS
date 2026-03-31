/**
 * Rate Limit Manager — controla chamadas de API para cada marketplace.
 * Implementa Token Bucket com configuração por marketplace.
 * Preparado para migração a Redis-based rate limiting.
 */
import { logger } from "@/lib/logger";

interface BucketConfig {
  maxTokens: number;
  refillRate: number; // tokens per second
  windowMs: number;
}

interface Bucket {
  tokens: number;
  lastRefill: number;
  config: BucketConfig;
  waitQueue: Array<{ resolve: () => void; reject: (err: Error) => void }>;
}

/** Default rate limits per marketplace (requests per minute → tokens/sec) */
const MARKETPLACE_LIMITS: Record<string, BucketConfig> = {
  mercadolivre: { maxTokens: 100, refillRate: 100 / 60, windowMs: 60_000 },
  shopee:       { maxTokens: 200, refillRate: 200 / 60, windowMs: 60_000 },
  amazon:       { maxTokens: 120, refillRate: 120 / 60, windowMs: 60_000 },
  shopify:      { maxTokens: 80,  refillRate: 80  / 60, windowMs: 60_000 },
  americanas:   { maxTokens: 60,  refillRate: 60  / 60, windowMs: 60_000 },
  magalu:       { maxTokens: 60,  refillRate: 60  / 60, windowMs: 60_000 },
  default:      { maxTokens: 50,  refillRate: 50  / 60, windowMs: 60_000 },
};

const buckets = new Map<string, Bucket>();

/** Metrics tracking */
let totalAcquired = 0;
let totalRejected = 0;
let totalWaited = 0;

function getBucket(marketplace: string): Bucket {
  const key = marketplace.toLowerCase();
  if (buckets.has(key)) return buckets.get(key)!;

  const config = MARKETPLACE_LIMITS[key] || MARKETPLACE_LIMITS.default;
  const bucket: Bucket = {
    tokens: config.maxTokens,
    lastRefill: Date.now(),
    config,
    waitQueue: [],
  };
  buckets.set(key, bucket);
  return bucket;
}

function refillTokens(bucket: Bucket): void {
  const now = Date.now();
  const elapsed = (now - bucket.lastRefill) / 1000;
  const newTokens = elapsed * bucket.config.refillRate;
  bucket.tokens = Math.min(bucket.config.maxTokens, bucket.tokens + newTokens);
  bucket.lastRefill = now;
}

function processWaitQueue(bucket: Bucket): void {
  while (bucket.waitQueue.length > 0 && bucket.tokens >= 1) {
    bucket.tokens--;
    const waiter = bucket.waitQueue.shift()!;
    waiter.resolve();
  }
}

export const rateLimitManager = {
  /**
   * Acquire a token for a marketplace API call.
   * If no tokens available, waits until one is available (up to timeout).
   */
  async acquireToken(marketplace: string, timeoutMs = 30_000): Promise<void> {
    const bucket = getBucket(marketplace);
    refillTokens(bucket);

    if (bucket.tokens >= 1) {
      bucket.tokens--;
      totalAcquired++;
      return;
    }

    // Wait for token
    totalWaited++;
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = bucket.waitQueue.findIndex((w) => w.resolve === resolve);
        if (idx >= 0) bucket.waitQueue.splice(idx, 1);
        totalRejected++;
        reject(new Error(`Rate limit timeout for ${marketplace} after ${timeoutMs}ms`));
      }, timeoutMs);

      bucket.waitQueue.push({
        resolve: () => {
          clearTimeout(timer);
          totalAcquired++;
          resolve();
        },
        reject,
      });
    });
  },

  /** Release unused token (optional, for cases where call was skipped) */
  releaseToken(marketplace: string): void {
    const bucket = getBucket(marketplace);
    bucket.tokens = Math.min(bucket.config.maxTokens, bucket.tokens + 1);
    processWaitQueue(bucket);
  },

  /** Get remaining tokens for a marketplace */
  getAvailableTokens(marketplace: string): number {
    const bucket = getBucket(marketplace);
    refillTokens(bucket);
    return Math.floor(bucket.tokens);
  },

  /** Set custom rate limit for a marketplace */
  setLimit(marketplace: string, requestsPerMinute: number): void {
    const key = marketplace.toLowerCase();
    const config: BucketConfig = {
      maxTokens: requestsPerMinute,
      refillRate: requestsPerMinute / 60,
      windowMs: 60_000,
    };
    const existing = buckets.get(key);
    if (existing) {
      existing.config = config;
      existing.tokens = Math.min(existing.tokens, config.maxTokens);
    } else {
      buckets.set(key, { tokens: config.maxTokens, lastRefill: Date.now(), config, waitQueue: [] });
    }
    logger.info("rateLimitManager.setLimit", { marketplace, requestsPerMinute });
  },

  /** Get metrics */
  getMetrics() {
    const perMarketplace: Record<string, { available: number; queued: number }> = {};
    for (const [key, bucket] of buckets.entries()) {
      refillTokens(bucket);
      perMarketplace[key] = {
        available: Math.floor(bucket.tokens),
        queued: bucket.waitQueue.length,
      };
    }
    return {
      totalAcquired,
      totalRejected,
      totalWaited,
      perMarketplace,
    };
  },

  /** Clear all (for tests) */
  clear(): void {
    for (const bucket of buckets.values()) {
      bucket.waitQueue.forEach((w) => w.reject(new Error("Rate limiter cleared")));
    }
    buckets.clear();
    totalAcquired = 0;
    totalRejected = 0;
    totalWaited = 0;
  },
};
