import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function NotAuthorized() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <ShieldOff className="h-10 w-10 text-destructive" />
      </div>
      <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        Você não tem permissão para acessar esta área. Entre em contato com o administrador.
      </p>
      <Button asChild>
        <Link to="/dashboard">Voltar ao Dashboard</Link>
      </Button>
    </div>
  );
}
