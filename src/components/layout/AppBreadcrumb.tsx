import { useLocation, useParams, Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const routeMap: Record<string, { label: string; parent?: string }> = {
  "/dashboard": { label: "Dashboard" },
  "/products": { label: "Produtos" },
  "/products/new": { label: "Cadastrar Produto", parent: "/products" },
  "/products/categories": { label: "Categorias Internas", parent: "/products" },
  "/products/price-rules": { label: "Regras de Preço", parent: "/products" },
  "/orders": { label: "Todos os Pedidos", parent: "/orders" },
  "/orders/picking": { label: "Picking & Packing", parent: "/orders" },
  "/orders/returns": { label: "Devoluções", parent: "/orders" },
  "/inventory": { label: "Visão Geral", parent: "/inventory" },
  "/inventory/movements": { label: "Movimentações", parent: "/inventory" },
  "/inventory/warehouses": { label: "Armazéns", parent: "/inventory" },
  "/integrations": { label: "Integrações", parent: "/integrations" },
  "/integrations/health": { label: "Saúde", parent: "/integrations" },
  "/integrations/:marketplace/health": { label: "Diagnóstico", parent: "/integrations" },
  "/catalog/categories": { label: "Categorias Marketplace", parent: "/catalog" },
  "/catalog/mappings": { label: "Mapeamento", parent: "/catalog" },
  "/catalog/attributes": { label: "Atributos", parent: "/catalog" },
  "/catalog/listings": { label: "Anúncios", parent: "/catalog" },
  "/catalog/sync": { label: "Sincronização", parent: "/catalog" },
  "/operations": { label: "Centro de Operações" },
  "/automation": { label: "Automação" },
  "/financial": { label: "Financeiro" },
  "/financial/cashflow": { label: "Fluxo de Caixa", parent: "/financial" },
  "/financial/payables": { label: "Contas a Pagar", parent: "/financial" },
  "/financial/receivables": { label: "Contas a Receber", parent: "/financial" },
  "/reports/sales": { label: "Vendas", parent: "/reports" },
  "/reports/abc": { label: "Curva ABC", parent: "/reports" },
  "/reports/heatmap": { label: "Heatmap", parent: "/reports" },
  "/reports/margin": { label: "Margem", parent: "/reports" },
  "/settings/company": { label: "Empresa", parent: "/settings" },
  "/settings/users": { label: "Usuários", parent: "/settings" },
  "/settings/notifications": { label: "Notificações", parent: "/settings" },
  "/notifications": { label: "Notificações" },
};

const parentLabels: Record<string, string> = {
  "/products": "Produtos",
  "/orders": "Pedidos",
  "/inventory": "Estoque",
  "/integrations": "Marketplaces",
  "/catalog": "Catálogo",
  "/financial": "Financeiro",
  "/reports": "Relatórios",
  "/settings": "Configurações",
};

export function AppBreadcrumb() {
  const location = useLocation();
  const params = useParams();
  const path = location.pathname;

  // Don't show on dashboard
  if (path === "/dashboard") return null;

  // Handle dynamic order detail route
  const isOrderDetail = path.match(/^\/orders\/[^/]+$/) && params.id && path !== "/orders/picking" && path !== "/orders/returns";

  const route = isOrderDetail ? null : routeMap[path];
  if (!route && !isOrderDetail) return null;

  const crumbs: { label: string; href?: string }[] = [];

  if (isOrderDetail) {
    crumbs.push({ label: "Pedidos", href: "/orders" });
    crumbs.push({ label: `Pedido #${params.id?.slice(0, 8)}` });
  } else if (route) {
    if (route.parent) {
      const parentLabel = parentLabels[route.parent];
      if (parentLabel) {
        // Check if parent has its own route entry
        const parentRoute = routeMap[route.parent];
        crumbs.push({ label: parentLabel, href: parentRoute ? route.parent : undefined });
      }
    }
    crumbs.push({ label: route.label });
  }

  if (crumbs.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <BreadcrumbItem key={i}>
              {i > 0 && <BreadcrumbSeparator />}
              {isLast || !crumb.href ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
