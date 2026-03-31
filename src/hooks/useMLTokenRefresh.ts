import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMercadoLivreIntegration } from "./useMercadoLivreIntegration";
import { useAuth } from "@/lib/auth";

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

export function useMLTokenRefresh() {
  const { profile } = useAuth();
  const { integration, isConnected } = useMercadoLivreIntegration();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isConnected || !profile?.tenant_id || !integration) {
      return;
    }

    const checkAndRefresh = async () => {
      const creds = integration.credentials as Record<string, string> | null;
      if (!creds?.expires_at) return;

      const expiresAt = new Date(creds.expires_at).getTime();
      const now = Date.now();

      if (expiresAt - now < THIRTY_MINUTES_MS) {
        try {
          await supabase.functions.invoke("ml-refresh-token", {
            body: { tenantId: profile.tenant_id },
          });
          console.log("[ML] Token refreshed successfully");
        } catch (err) {
          console.error("[ML] Token refresh failed", err);
        }
      }
    };

    checkAndRefresh();
    intervalRef.current = setInterval(checkAndRefresh, FIVE_HOURS_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isConnected, profile?.tenant_id, integration?.id]);
}
