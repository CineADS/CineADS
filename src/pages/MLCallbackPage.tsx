import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function MLCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    if (processed) return;

    const oauthError = searchParams.get("error");
    const oauthErrorDescription = searchParams.get("error_description");

    if (oauthError) {
      toast({
        title: "Autorização recusada",
        description: oauthErrorDescription
          ? decodeURIComponent(oauthErrorDescription)
          : "A autorização no Mercado Livre foi cancelada.",
        variant: "destructive",
      });
      navigate("/integrations", { replace: true });
      return;
    }

    const code = searchParams.get("code");
    const tenantId = searchParams.get("state");

    if (!code) {
      toast({ title: "Erro", description: "Código de autorização não encontrado", variant: "destructive" });
      navigate("/integrations", { replace: true });
      return;
    }

    if (!tenantId || !UUID_REGEX.test(tenantId)) {
      toast({
        title: "Sessão inválida",
        description: "Não foi possível identificar sua empresa para concluir a conexão.",
        variant: "destructive",
      });
      navigate("/integrations", { replace: true });
      return;
    }

    setProcessed(true);

    const exchangeToken = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("Sua sessão expirou. Faça login novamente e tente reconectar.");
        }

        const { data, error } = await supabase.functions.invoke("ml-exchange-token", {
          body: { code, tenantId },
        });

        if (error || !data?.success) {
          throw new Error(data?.error || error?.message || "Falha na conexão");
        }

        toast({
          title: "Mercado Livre conectado!",
          description: `Conta @${data.nickname} vinculada com sucesso`,
        });
      } catch (err: any) {
        toast({
          title: "Erro ao conectar",
          description: err.message || "Tente novamente",
          variant: "destructive",
        });
      } finally {
        navigate("/integrations", { replace: true });
      }
    };

    exchangeToken();
  }, [searchParams, navigate, processed]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Conectando ao Mercado Livre...
        </p>
      </div>
    </div>
  );
}
