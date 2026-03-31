/**
 * Cache Keys — padrões centralizados para chaves de cache.
 * Garante consistência e facilita invalidação por namespace.
 */

export const CacheKeys = {
  // Orders
  ordersByTenant: (tenantId: string, date?: string) =>
    `orders:tenant:${tenantId}${date ? `:${date}` : ""}`,
  orderDetail: (orderId: string) => `order:${orderId}`,

  // Products
  productsByTenant: (tenantId: string) => `products:tenant:${tenantId}`,
  productDetail: (productId: string) => `product:${productId}`,

  // Inventory
  stockByProduct: (tenantId: string, productId: string) =>
    `stock:${tenantId}:${productId}`,

  // Analytics
  analyticsRevenue: (tenantId: string, period: string) =>
    `analytics:revenue:${tenantId}:${period}`,
  analyticsTopProducts: (tenantId: string) =>
    `analytics:top:${tenantId}`,
  analyticsByMarketplace: (tenantId: string) =>
    `analytics:marketplace:${tenantId}`,

  // Integration health
  integrationHealth: (tenantId: string) =>
    `integration:health:${tenantId}`,
  jobStats: (tenantId: string) => `jobs:stats:${tenantId}`,

  // Sync state
  syncState: (tenantId: string, marketplace: string, entity: string) =>
    `sync:state:${tenantId}:${marketplace}:${entity}`,

  // Rate limit
  rateLimit: (marketplace: string) => `ratelimit:${marketplace}`,

  // Categories
  marketplaceCategories: (marketplace: string, parentId?: string) =>
    `mkt_categories:${marketplace}:${parentId ?? "root"}`,
  categoryTree: (marketplace: string) => `mkt_categories:tree:${marketplace}`,
  categoryAttributes: (marketplace: string, categoryId: string) =>
    `cat_attrs:${marketplace}:${categoryId}`,

  // Locks
  lock: (resource: string) => `lock:${resource}`,
} as const;

/** Default TTLs in milliseconds */
export const CacheTTL = {
  SHORT: 30 * 1000,        // 30s
  MEDIUM: 2 * 60 * 1000,   // 2min
  STANDARD: 5 * 60 * 1000, // 5min
  LONG: 15 * 60 * 1000,    // 15min
  ANALYTICS: 10 * 60 * 1000, // 10min
  CATEGORIES: 12 * 60 * 60 * 1000, // 12h
  LOCK: 60 * 1000,         // 1min lock
} as const;
