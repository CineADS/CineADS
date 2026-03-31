import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Senha deve ter pelo menos 8 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Senha alterada com sucesso!");
      navigate("/dashboard");
    }
  };

  return (
    <AuthLayout>
      <form onSubmit={handleReset} className="space-y-4">
        <h2 className="text-lg font-semibold text-center">Nova Senha</h2>
        <div className="space-y-2">
          <Label>Nova Senha</Label>
          <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          {password && password.length < 8 && <p className="text-xs text-destructive">Mínimo 8 caracteres</p>}
        </div>
        <div className="space-y-2">
          <Label>Confirmar Nova Senha</Label>
          <Input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} />
          {confirmPassword && password !== confirmPassword && <p className="text-xs text-destructive">As senhas não coincidem</p>}
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Salvando..." : "Redefinir Senha"}
        </Button>
      </form>
    </AuthLayout>
  );
}
