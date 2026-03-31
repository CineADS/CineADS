import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";
import { NotAuthorized } from "@/components/auth/NotAuthorized";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus, Pencil } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useState } from "react";

const roleLabels: Record<string, { label: string; color: string; description: string }> = {
  admin: { label: "Admin", color: "bg-primary/15 text-primary border-primary/30", description: "Acesso total a todas as funcionalidades" },
  operational: { label: "Operacional", color: "bg-blue-500/15 text-blue-400 border-blue-500/30", description: "Pedidos, estoque e produtos (sem financeiro)" },
  financial: { label: "Financeiro", color: "bg-success/15 text-success border-success/30", description: "Relatórios e financeiro (sem cadastro de produtos)" },
  viewer: { label: "Visualizador", color: "bg-muted text-muted-foreground border-border", description: "Somente leitura no dashboard" },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  active: { label: "Ativo", color: "bg-success/15 text-success border-success/30" },
  invited: { label: "Convidado", color: "bg-warning/15 text-warning border-warning/30" },
  inactive: { label: "Inativo", color: "bg-destructive/15 text-destructive border-destructive/30" },
};

export default function UsersSettingsPage() {
  const { profile, user } = useAuth();
  const { canManageUsers } = usePermissions();
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [editUser, setEditUser] = useState<any>(null);
  const [editRole, setEditRole] = useState("viewer");
  const [editActive, setEditActive] = useState(true);

  const { data: users, isLoading } = useQuery({
    queryKey: ["tenant-users", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles").select("id, full_name, email, avatar_url, created_at, status, last_seen_at")
        .eq("tenant_id", profile.tenant_id);
      if (profilesError) throw profilesError;
      const { data: roles, error: rolesError } = await supabase.from("user_roles").select("user_id, role").eq("tenant_id", profile.tenant_id);
      if (rolesError) throw rolesError;
      return (profiles || []).map((p: any) => ({
        ...p,
        status: p.status || "active",
        roles: (roles || []).filter((r) => r.user_id === p.id).map((r) => r.role),
      }));
    },
    enabled: !!profile?.tenant_id,
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, newRole, isActive }: { userId: string; newRole: string; isActive: boolean }) => {
      if (!profile?.tenant_id) return;
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("tenant_id", profile.tenant_id);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, tenant_id: profile.tenant_id, role: newRole as any });
      if (error) throw error;
      await supabase.from("profiles").update({ status: isActive ? "active" : "inactive" } as any).eq("id", userId);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tenant-users"] }); toast.success("Perfil atualizado com sucesso"); setEditUser(null); },
    onError: (err: any) => toast.error("Erro: " + err.message),
  });

  const inviteUser = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id || !inviteEmail) return;
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email: inviteEmail, role: inviteRole, tenantId: profile.tenant_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-users"] });
      toast.success(`Convite enviado para ${inviteEmail}`);
      setShowInvite(false);
      setInviteEmail("");
      setInviteRole("viewer");
    },
    onError: (err: any) => {
      const msg = err.message || "";
      if (msg.includes("already registered") || msg.includes("already been registered")) {
        toast.error("Este email já possui uma conta");
      } else {
        toast.error("Erro ao enviar convite: " + msg);
      }
    },
  });

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
    return email.slice(0, 2).toUpperCase();
  };

  if (!canManageUsers) return <NotAuthorized />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Gestão de Usuários</h1><p className="text-sm text-muted-foreground">{(users || []).length} usuário(s) na empresa</p></div>
        <Button onClick={() => setShowInvite(true)}><UserPlus className="mr-2 h-4 w-4" /> Convidar Usuário</Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead><TableHead>Email</TableHead><TableHead>Perfil</TableHead><TableHead>Status</TableHead><TableHead>Último Acesso</TableHead><TableHead>Desde</TableHead><TableHead className="w-16">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(users || []).map((u: any) => {
                const sCfg = statusLabels[u.status] || statusLabels.active;
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(u.full_name, u.email)}</AvatarFallback></Avatar>
                        <span className="font-medium text-sm">{u.full_name || u.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">{u.roles.map((r: string) => { const cfg = roleLabels[r] || roleLabels.viewer; return <Badge key={r} variant="outline" className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>; })}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className={`text-xs ${sCfg.color}`}>{sCfg.label}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.last_seen_at ? formatDistanceToNow(new Date(u.last_seen_at), { addSuffix: true, locale: ptBR }) : "Nunca acessou"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(u.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => { setEditUser(u); setEditRole(u.roles[0] || "viewer"); setEditActive(u.status !== "inactive"); }}><Pencil className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Invite Modal */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader><DialogTitle>Convidar Usuário</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Email</Label><Input placeholder="email@exemplo.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(roleLabels).map(([key, cfg]) => (<SelectItem key={key} value={key}><span className="font-medium">{cfg.label}</span><span className="text-xs text-muted-foreground ml-2">— {cfg.description}</span></SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancelar</Button>
            <Button onClick={() => inviteUser.mutate()} disabled={inviteUser.isPending || !inviteEmail}>{inviteUser.isPending ? "Enviando..." : "Enviar Convite"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Modal */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Permissões</DialogTitle></DialogHeader>
          {editUser && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10"><AvatarFallback className="bg-primary/10 text-primary">{getInitials(editUser.full_name, editUser.email)}</AvatarFallback></Avatar>
                <div><p className="font-medium">{editUser.full_name || editUser.email}</p><p className="text-xs text-muted-foreground">{editUser.email}</p></div>
              </div>
              <div className="space-y-2">
                <Label>Perfil</Label>
                <Select value={editRole} onValueChange={setEditRole}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(roleLabels).map(([key, cfg]) => (<SelectItem key={key} value={key}><span className="font-medium">{cfg.label}</span><span className="text-xs text-muted-foreground ml-2">— {cfg.description}</span></SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div><p className="text-sm font-medium">Usuário Ativo</p><p className="text-xs text-muted-foreground">Desativar impede o acesso ao sistema</p></div>
                <Switch checked={editActive} onCheckedChange={setEditActive} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button onClick={() => updateRole.mutate({ userId: editUser.id, newRole: editRole, isActive: editActive })} disabled={updateRole.isPending}>{updateRole.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
