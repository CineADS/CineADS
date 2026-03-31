import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
      toast.success("Email de recuperação enviado!");
    }
  };

  return (
    <AuthLayout>
      {sent ? (
        <div className="text-center space-y-4">
          <Mail className="mx-auto h-12 w-12 text-primary" />
          <h2 className="text-lg font-semibold">Email enviado!</h2>
          <p className="text-sm text-muted-foreground">Verifique sua caixa de entrada para redefinir sua senha.</p>
          <Link to="/login" className="text-sm text-primary hover:underline">Voltar ao login</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-lg font-semibold text-center">Recuperar Senha</h2>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Enviando..." : "Enviar link de recuperação"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline">Voltar ao login</Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
