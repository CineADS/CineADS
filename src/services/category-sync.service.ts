/**
 * Category Sync Service
 * Parallel category tree fetching from ML API with authenticated requests.
 */
import { mlApiFetch } from "@/integrations/marketplace/ml-api-client";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

const ML_API = "https://api.mercadolibre.com";
const CONCURRENCY = 5;

async function fetchWithRetry(url: string, tenantId?: string, retries = 3): Promise<any> {
  try {
    let res: Response;

    if (tenantId) {
      res = await mlApiFetch(tenantId, url);
    } else {
      res = await fetch(url);
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    if (retries === 0) throw err;

    await new Promise((r) => setTimeout(r, 1000));
    return fetchWithRetry(url, tenantId, retries - 1);
  }
}

function flattenTree(node: any, parentId: string | null, pathSoFar: Array<{ id: string; name: string }>, result: any[]) {
  const currentPath = [...pathSoFar, { id: node.id, name: node.name }];
  const children = node.children_categories || [];

  result.push({
    marketplace: "Mercado Livre",
    category_id: node.id,
    name: node.name,
    parent_id: parentId,
    path: currentPath,
  });

  for (const child of children) {
    flattenTree(child, node.id, currentPath, result);
  }
}

async function runWorkers<T>(items: T[], worker: (item: T) => Promise<any>) {
  const queue = [...items];
  const workers = Array(Math.min(CONCURRENCY, items.length))
    .fill(null)
    .map(async () => {
      while (queue.length) {
        const item = queue.shift();
        if (!item) return;
        await worker(item);
      }
    });

  await Promise.all(workers);
}

export async function syncMarketplaceCategories(tenantId?: string) {
  logger.info("Starting ML category sync", { tenantId });

  let roots;

  try {
    roots = await fetchWithRetry(`${ML_API}/sites/MLB/categories`, tenantId);
  } catch {
    logger.warn("Authenticated category fetch failed. Trying public endpoint.");
    roots = await fetchWithRetry(`${ML_API}/sites/MLB/categories`);
  }

  if (!roots || roots.length === 0) {
    logger.warn("No root categories found.");
    return { success: true, total: 0 };
  }

  const allCategories: any[] = [];

  await runWorkers(roots, async (root: any) => {
    try {
      const tree = await fetchWithRetry(
        `${ML_API}/categories/${root.id}`,
        tenantId
      );
      flattenTree(tree, null, [], allCategories);
    } catch (err) {
      logger.error("Error fetching category tree", {
        root: root.id,
        error: String(err),
      });
    }
  });

  logger.info("Categories fetched", { count: allCategories.length });

  if (allCategories.length === 0) {
    return { success: true, total: 0 };
  }

  const batchSize = 500;

  for (let i = 0; i < allCategories.length; i += batchSize) {
    const batch = allCategories.slice(i, i + batchSize);

    const { error } = await supabase
      .from("marketplace_categories")
      .upsert(batch, { onConflict: "marketplace,category_id" });

    if (error) {
      logger.error("Category upsert error", { error });
      throw error;
    }
  }

  logger.info("Category sync completed", { saved: allCategories.length });

  return { success: true, total: allCategories.length };
}

// Keep backward-compatible named export
export const categorySyncService = {
  syncMarketplaceCategories: (marketplace: string, tenantId: string) =>
    syncMarketplaceCategories(tenantId),

  async getCategoryAttributes(marketplace: string, categoryId: string) {
    const { data, error } = await supabase
      .from("category_attributes")
      .select("*")
      .eq("marketplace", marketplace)
      .eq("category_id", categoryId);

    if (error) throw error;
    return data || [];
  },

  async getCategories(marketplace: string, parentId?: string | null) {
    let query = supabase
      .from("marketplace_categories")
      .select("*")
      .eq("marketplace", marketplace)
      .order("name");

    if (parentId) {
      query = query.eq("parent_id", parentId);
    } else {
      query = query.is("parent_id", null);
    }

    const { data, error } = await query.limit(500);
    if (error) throw error;
    return data || [];
  },
};
