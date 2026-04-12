import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";
import { AppBreadcrumb } from "./AppBreadcrumb";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMLTokenRefresh } from "@/hooks/useMLTokenRefresh";
import { useMLAutoSync } from "@/hooks/useMLAutoSync";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";

export function AppShell() {
  useMLTokenRefresh();
  useMLAutoSync();
  // Onboarding: aparece uma vez para usuários sem integração ML
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile unless open */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 lg:static lg:z-auto transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Mobile close button */}
        {mobileOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 z-50 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <AppSidebar />
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar
          onMenuToggle={() => setMobileOpen(!mobileOpen)}
          showMenuButton
        />
        <div className="px-4 md:px-6 py-2 border-b border-border">
          <AppBreadcrumb />
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      <OnboardingModal />
    </div>
  );
}
