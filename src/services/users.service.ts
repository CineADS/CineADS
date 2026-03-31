/**
 * Users Service
 * Responsável por gestão de usuários e roles do tenant.
 * Tabelas: profiles, user_roles
 * Isolamento: tenant_id obrigatório em todas as queries.
 */
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import type { UserDTO } from "@/types/dto";

export const usersService = {
  /** Listar usuários do tenant com seus roles */
  async listTenantUsers(tenantId: string): Promise<UserDTO[]> {
    logger.debug("usersService.listTenantUsers", { tenantId });

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, email, status, avatar_url, last_seen_at")
      .eq("tenant_id", tenantId);
    if (profilesError) { logger.error("usersService.listTenantUsers profiles failed", { error: profilesError }); throw profilesError; }

    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("tenant_id", tenantId);
    if (rolesError) { logger.error("usersService.listTenantUsers roles failed", { error: rolesError }); throw rolesError; }

    return (profiles || []).map((p: any): UserDTO => ({
      id: p.id,
      fullName: p.full_name,
      email: p.email,
      status: p.status,
      avatarUrl: p.avatar_url,
      lastSeenAt: p.last_seen_at,
      role: roles?.find((r: any) => r.user_id === p.id)?.role || "viewer",
    }));
  },

  /** Atualizar role e status de um usuário */
  async updateUserRole(userId: string, tenantId: string, newRole: string, isActive: boolean): Promise<void> {
    logger.info("usersService.updateUserRole", { userId, newRole, isActive });
    await supabase.from("user_roles").delete().eq("user_id", userId).eq("tenant_id", tenantId);
    const { error } = await supabase.from("user_roles").insert({
      user_id: userId,
      tenant_id: tenantId,
      role: newRole as any,
    });
    if (error) { logger.error("usersService.updateUserRole failed", { error }); throw error; }
    await supabase.from("profiles").update({ status: isActive ? "active" : "inactive" } as any).eq("id", userId);
  },
};
