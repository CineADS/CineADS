import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";


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

  const triggerSync = useCallback(async (_tenantId?: string) => {
    setLoading(true);
    try {
      // Categorias do ML são públicas — delega para o edge function server-side
      const { data, error } = await supabase.functions.invoke("mlb-sync-categories");
      if (error) throw new Error(error.message || "Falha na sincronização");
      if (!data?.success) throw new Error(data?.error || "Falha na sincronização");
      return { success: true, total: data.total_upserted };
    } finally {
      setLoading(false);
    }
  }, []);

  const syncFromBrowser = triggerSync;

  return { getRoots, getChildren, getDetail, search, getCount, getSyncStatus, triggerSync, syncFromBrowser, syncProgress, loading };
}
