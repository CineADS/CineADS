import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useMercadoLivreIntegration } from "@/hooks/useMercadoLivreIntegration";
import { ML_CONFIG } from "@/config/mlConfig";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  ShoppingCart, BarChart2, Zap, ArrowRight, ExternalLink, Plug,
} from "lucide-react";

const STORAGE_KEY = (userId: string) => `onboarding_dismissed_${userId}`;

const STEPS = [
  {
    icon: ShoppingCart,
    title: "Pedidos sincronizados",
    description: "Todos os seus pedidos do Mercado Livre aparecem aqui automaticamente, a cada 30 minutos.",
  },
  {
    icon: BarChart2,
    title: "Métricas em tempo real",
    description: "Faturamento, ticket médio e margem de lucro calculados automaticamente.",
  },
  {
    icon: Zap,
    title: "Automações inteligentes",
    description: "Crie regras para alertas de estoque, repricing e notificações sem escrever código.",
  },
];

export function OnboardingModal() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { isConnected, isLoading } = useMercadoLivreIntegration();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!profile?.id || isLoading) return;
    if (isConnected) return;

    const dismissed = localStorage.getItem(STORAGE_KEY(profile.id));
    if (!dismissed) setOpen(true);
  }, [profile?.id, isConnected, isLoading]);

  const dismiss = () => {
    if (profile?.id) localStorage.setItem(STORAGE_KEY(profile.id), "1");
    setOpen(false);
  };

  const connectML = () => {
    if (!profile?.tenant_id) return;
    dismiss();
    const url = `${ML_CONFIG.authUrl}?response_type=code&client_id=${ML_CONFIG.clientId}&redirect_uri=${encodeURIComponent(ML_CONFIG.redirectUri)}&state=${profile.tenant_id}`;
    window.location.href = url;
  };

  const goToIntegrations = () => {
    dismiss();
    navigate("/integrations");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent
        className="max-w-lg gap-0 p-0 overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header com gradiente */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Plug className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">Bem-vindo ao CineADS</DialogTitle>
              <DialogDescription className="text-sm">
                Conecte o Mercado Livre para começar
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="px-6 py-4 space-y-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-3"
              >
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Divider + CTAs */}
        <div className="border-t border-border px-6 py-4 space-y-2">
          <Button className="w-full gap-2" onClick={connectML}>
            <ExternalLink className="h-4 w-4" />
            Conectar Mercado Livre agora
          </Button>
          <Button variant="ghost" className="w-full text-sm text-muted-foreground" onClick={goToIntegrations}>
            Ver todas as integrações
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
          <button
            onClick={dismiss}
            className="w-full text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors py-1"
          >
            Fazer depois
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
