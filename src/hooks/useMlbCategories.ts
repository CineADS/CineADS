import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";


interface MlbCategory {
  id: string;
  name: string;
  is_leaf: boolean;
  depth: number;
  path_from_root?: Array<{ id: string; name: string }>;
}

interface SearchResult {
  data: MlbCategory[];
  total: number;
  page: number;
  limit: number;
}

interface CategoryNode {
  id: string;
  name: string;
  parent_id: string | null;
  is_leaf: boolean;
  depth: number;
  path_from_root: Array<{ id: string; name: string }>;
  site_id: string;
  total_items_in_this_category: number;
  updated_at: string;
}

const invokeApi = async (action: string, params: Record<string, string> = {}) => {
  const query = new URLSearchParams({ action, ...params }).toString();
  const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const res = await fetch(
    `${env.VITE_SUPABASE_URL}/functions/v1/mlb-categories-api?${query}`,
    {
      headers: {
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
    }
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useMlbCategories() {
  const [loading, setLoading] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);

  const getRoots = useCallback(async (): Promise<MlbCategory[]> => {
    const data = await invokeApi("roots");
    return data || [];
  }, []);

  const getChildren = useCallback(async (id: string): Promise<MlbCategory[]> => {
    const data = await invokeApi("children", { id });
    return data || [];
  }, []);

  const getDetail = useCallback(async (id: string) => {
    return invokeApi("detail", { id });
  }, []);

  const search = useCallback(async (q: string, page = 1): Promise<SearchResult> => {
    const data = await invokeApi("search", { q, page: String(page) });
    return data || { data: [], total: 0, page: 1, limit: 20 };
  }, []);

  const getCount = useCallback(async (): Promise<number> => {
    const data = await invokeApi("count");
    return data?.total || 0;
  }, []);

  const getSyncStatus = useCallback(async () => {
    return invokeApi("sync-status");
  }, []);

  const triggerSync = useCallback(async (tenantId: string) => {
    setLoading(true);
    const startTime = Date.now();

    try {
      // 1. Buscar token via Edge Function (bypassa RLS)
      const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const supabaseUrl = env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();

      const tokenRes = await fetch(`${supabaseUrl}/functions/v1/ml-get-token`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          apikey: anonKey,
        }
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.json();
        throw new Error(err.error || "Mercado Livre não está conectado.");
      }

      const { access_token: accessToken } = await tokenRes.json();

      const mlFetch = (url: string) => fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      // 2. Buscar raízes
      const rootRes = await mlFetch("https://api.mercadolibre.com/sites/MLB/categories");
      if (!rootRes.ok) throw new Error(`HTTP ${rootRes.status} ao buscar categorias raiz`);
      const roots = await rootRes.json();

      logger.info("[MLB Sync] roots encontradas:", roots?.length);

      const allCategories: any[] = [];

      const fetchChildren = async (id: string, parentId: string | null, depth: number, path: Array<{id:string, name:string}>) => {
        const res = await mlFetch(`https://api.mercadolibre.com/categories/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        const currentPath = [...path, { id: data.id, name: data.name }];
        const children = data.children_categories || [];
        allCategories.push({
          id: data.id, name: data.name, parent_id: parentId,
          depth, is_leaf: children.length === 0,
          path_from_root: currentPath, site_id: "MLB",
          total_items_in_this_category: data.total_items_in_this_category || 0,
          updated_at: new Date().toISOString(),
        });
        for (let i = 0; i < children.length; i += 5) {
          await Promise.all(children.slice(i, i + 5).map((c: any) => fetchChildren(c.id, data.id, depth + 1, currentPath)));
        }
      };

      for (let i = 0; i < roots.length; i += 5) {
        await Promise.all(roots.slice(i, i + 5).map((r: any) => fetchChildren(r.id, null, 0, [])));
      }

      // 3. Upsert no banco
      const CHUNK = 500;
      for (let i = 0; i < allCategories.length; i += CHUNK) {
        await supabase.from("mlb_categories").upsert(allCategories.slice(i, i + CHUNK), { onConflict: "id" });
      }

      const duration = (Date.now() - startTime) / 1000;

      // 4. Salvar log (sem travar se falhar)
      try {
        await supabase.from("mlb_sync_logs").insert({
          status: "success",
          started_at: new Date(startTime).toISOString(),
          finished_at: new Date().toISOString(),
          total_processed: allCategories.length,
          total_upserted: allCategories.length,
          duration_seconds: duration,
        });
      } catch (logErr) {
        logger.warn("[MLB Sync] Falha ao salvar log:", logErr);
      }

      return { success: true, total: allCategories.length };

    } catch (err) {
      try {
        await supabase.from("mlb_sync_logs").insert({
          status: "error",
          started_at: new Date(startTime).toISOString(),
          finished_at: new Date().toISOString(),
          error_message: String(err),
          duration_seconds: (Date.now() - startTime) / 1000,
        });
      } catch { /* ignorar falha de log */ }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const syncFromBrowser = triggerSync;

  return { getRoots, getChildren, getDetail, search, getCount, getSyncStatus, triggerSync, syncFromBrowser, syncProgress, loading };
}
