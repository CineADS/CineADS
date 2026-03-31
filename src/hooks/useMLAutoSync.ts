import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMercadoLivreIntegration } from "./useMercadoLivreIntegration";
import { useAuth } from "@/lib/auth";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

export function useMLAutoSync() {
  const { profile } = useAuth();
  const { isConnected, autoSync } = useMercadoLivreIntegration();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isConnected || !autoSync || !profile?.tenant_id) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const syncOrders = async () => {
      try {
        const { data } = await supabase.functions.invoke("ml-sync-orders", {
          body: { tenantId: profile.tenant_id },
        });

        console.log(`[ML Auto-Sync] ${data?.synced || 0} novos pedidos`);
      } catch (err) {
        console.error("[ML Auto-Sync] Error", err);
      }
    };

    // Don't run immediately on mount to avoid duplicate with manual sync
    intervalRef.current = setInterval(syncOrders, FIFTEEN_MINUTES_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isConnected, autoSync, profile?.tenant_id]);
}
