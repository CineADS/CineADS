/**
 * Cache Service — cache em memória com TTL, preparado para migração a Redis.
 * Suporta get/set/delete, invalidação por padrão, e locks distribuídos.
 */
import { logger } from "@/lib/logger";
import { CacheTTL } from "./cache-keys";

interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();
const locks = new Map<string, { owner: string; expiresAt: number }>();

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.expiresAt <= now) store.delete(key);
    }
    for (const [key, lock] of locks.entries()) {
      if (lock.expiresAt <= now) locks.delete(key);
    }
  }, 60_000);
}

export const cacheService = {
  /** Get cached value */
  get<T = unknown>(key: string): T | null {
    const entry = store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      store.delete(key);
      return null;
    }
    return entry.value as T;
  },

  /** Set value with TTL (ms) */
  set<T = unknown>(key: string, value: T, ttlMs = CacheTTL.STANDARD): void {
    store.set(key, { value, expiresAt: Date.now() + ttlMs });
    startCleanup();
  },

  /** Delete single key */
  delete(key: string): boolean {
    return store.delete(key);
  },

  /** Invalidate all keys matching prefix */
  invalidateByPrefix(prefix: string): number {
    let count = 0;
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) {
        store.delete(key);
        count++;
      }
    }
    if (count > 0) logger.debug("cache.invalidateByPrefix", { prefix, count });
    return count;
  },

  /** Get or set — returns cached value or computes and caches */
  async getOrSet(key: string, fn: () => Promise<unknown>, ttlMs = CacheTTL.STANDARD): Promise<unknown> {
    const cached = this.get(key);
    if (cached !== null) return cached;
    const value = await fn();
    this.set(key, value, ttlMs);
    return value;
  },

  // ─── Distributed Locks ──────────────────────────────────
  /** Acquire a lock. Returns true if acquired. */
  acquireLock(resource: string, owner: string, ttlMs = CacheTTL.LOCK): boolean {
    const existing = locks.get(resource);
    if (existing && existing.expiresAt > Date.now()) return false;
    locks.set(resource, { owner, expiresAt: Date.now() + ttlMs });
    startCleanup();
    return true;
  },

  /** Release a lock (only by owner) */
  releaseLock(resource: string, owner: string): boolean {
    const existing = locks.get(resource);
    if (!existing || existing.owner !== owner) return false;
    locks.delete(resource);
    return true;
  },

  /** Check if resource is locked */
  isLocked(resource: string): boolean {
    const existing = locks.get(resource);
    if (!existing) return false;
    if (existing.expiresAt <= Date.now()) {
      locks.delete(resource);
      return false;
    }
    return true;
  },

  // ─── Stats ──────────────────────────────────────────────
  getStats() {
    return {
      entries: store.size,
      locks: locks.size,
    };
  },

  /** Clear all cache (for tests) */
  clear(): void {
    store.clear();
    locks.clear();
  },
};
