import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function usePermissions() {
  const { user, profile } = useAuth();

  const { data: roles } = useQuery({
    queryKey: ["user-roles", user?.id, profile?.tenant_id],
    queryFn: async () => {
      if (!user?.id || !profile?.tenant_id) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("tenant_id", profile.tenant_id);
      if (error) throw error;
      return data?.map((r) => r.role) || [];
    },
    enabled: !!user?.id && !!profile?.tenant_id,
  });

  const userRoles = roles || [];
  const isAdmin = userRoles.includes("admin");
  const isOperational = userRoles.includes("operational");
  const isFinancial = userRoles.includes("financial");
  const isViewer = userRoles.includes("viewer");

  return {
    roles: userRoles,
    isAdmin,
    canAccessFinancial: isAdmin || isFinancial,
    canEditProducts: isAdmin || isOperational,
    canManageUsers: isAdmin,
    canManageOrders: isAdmin || isOperational,
    canViewOnly: !isAdmin && !isOperational && !isFinancial && (isViewer || userRoles.length === 0),
  };
}
