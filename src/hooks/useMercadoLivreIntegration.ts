import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useMercadoLivreIntegration() {
  const { profile } = useAuth();

  const query = useQuery({
    queryKey: ["ml-integration", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return null;
      const { data, error } = await supabase
        .from("marketplace_integrations")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .eq("marketplace", "Mercado Livre")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const integration = query.data;
  const credentials = integration?.credentials as Record<string, string> | null;
  const settings = integration?.settings as Record<string, any> | null;

  return {
    integration,
    isConnected: integration?.status === "connected",
    isError: integration?.status === "error",
    nickname: credentials?.ml_nickname || settings?.nickname || null,
    autoSync: settings?.auto_sync || false,
    status: integration?.status || "disconnected",
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
