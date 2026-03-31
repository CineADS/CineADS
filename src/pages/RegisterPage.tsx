import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function validateCnpj(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;
  const calc = (base: number) => {
    let sum = 0;
    let weight = base;
    for (let i = 0; i < base - 1; i++) {
      sum += parseInt(digits[i]) * weight--;
      if (weight < 2) weight = 9;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return calc(13) === parseInt(digits[12]) && calc(14) === parseInt(digits[13]);
}

export default function RegisterPage() {
  const [form, setForm] = useState({ company: "", cnpj: "", email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && session) navigate("/dashboard", { replace: true });
  }, [session, authLoading, navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error("Senha deve ter pelo menos 8 caracteres");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (form.cnpj && !validateCnpj(form.cnpj)) {
      toast.error("CNPJ inválido");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          company_name: form.company,
          cnpj: form.cnpj.replace(/\D/g, ""),
        },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else if (data.session) {
      toast.success("Conta criada com sucesso!");
      navigate("/dashboard");
    } else {
      toast.success("Conta criada! Verifique seu email para confirmar o cadastro.");
      navigate("/login");
    }
  };

  return (
    <AuthLayout>
      <form onSubmit={handleRegister} className="space-y-4">
        <div className="space-y-2">
          <Label>Nome da Empresa</Label>
          <Input placeholder="Minha Empresa LTDA" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>CNPJ</Label>
          <Input placeholder="00.000.000/0000-00" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: formatCnpj(e.target.value) })} />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" placeholder="seu@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Senha</Label>
          <Input type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
          {form.password && form.password.length < 8 && <p className="text-xs text-destructive">Senha deve ter pelo menos 8 caracteres</p>}
        </div>
        <div className="space-y-2">
          <Label>Confirmar Senha</Label>
          <Input type="password" placeholder="••••••••" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required minLength={8} />
          {form.confirmPassword && form.password !== form.confirmPassword && <p className="text-xs text-destructive">As senhas não coincidem</p>}
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          <UserPlus className="mr-2 h-4 w-4" />
          {loading ? "Criando conta..." : "Criar Conta"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Já tem uma conta? <Link to="/login" className="text-primary hover:underline">Entrar</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
