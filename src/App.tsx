import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/layout/PageLoader";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import MLCallbackPage from "./pages/MLCallbackPage";
import DashboardPage from "./pages/DashboardPage";
import ProductsPage from "./pages/ProductsPage";
import CreateProductPage from "./pages/CreateProductPage";
import CategoriesPage from "./pages/CategoriesPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import PickingPackingPage from "./pages/PickingPackingPage";
import ReturnsPage from "./pages/ReturnsPage";
import InventoryPage from "./pages/InventoryPage";
import InventoryMovementsPage from "./pages/InventoryMovementsPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import IntegrationHealthPage from "./pages/IntegrationHealthPage";
import CashFlowPage from "./pages/CashFlowPage";
import PayablesPage from "./pages/PayablesPage";
import ReceivablesPage from "./pages/ReceivablesPage";
import InvoicesPage from "./pages/InvoicesPage";
import CompanySettingsPage from "./pages/CompanySettingsPage";
import UsersSettingsPage from "./pages/UsersSettingsPage";
import NotificationsSettingsPage from "./pages/NotificationsSettingsPage";
import NotificationsPage from "./pages/NotificationsPage";
import NotFound from "./pages/NotFound";

const MlbCategoriesPage = lazy(() => import("./pages/MlbCategoriesPage"));
const MarketplaceHealthPage = lazy(() => import("./pages/MarketplaceHealthPage"));
const MarketplaceCategoriesPage = lazy(() => import("./pages/MarketplaceCategoriesPage"));
const CategoryMappingPage = lazy(() => import("./pages/CategoryMappingPage"));
const CategoryAttributesPage = lazy(() => import("./pages/CategoryAttributesPage"));
const ListingsPage = lazy(() => import("./pages/ListingsPage"));
const CatalogSyncPage = lazy(() => import("./pages/CatalogSyncPage"));
const OperationsPage = lazy(() => import("./pages/OperationsPage"));
const AutomationPage = lazy(() => import("./pages/AutomationPage"));

// Lazy-loaded heavy pages (charts, maps, complex components)
const AbcReportPage = lazy(() => import("./pages/AbcReportPage"));
const HeatmapReportPage = lazy(() => import("./pages/HeatmapReportPage"));
const MarginReportPage = lazy(() => import("./pages/MarginReportPage"));
const SalesReportPage = lazy(() => import("./pages/SalesReportPage"));
const FinancialPage = lazy(() => import("./pages/FinancialPage"));
const PriceRulesPage = lazy(() => import("./pages/PriceRulesPage"));
const WarehousesPage = lazy(() => import("./pages/WarehousesPage"));

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Auth */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/auth/mercadolivre/callback" element={<MLCallbackPage />} />

              {/* Protected App */}
              <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/products/new" element={<CreateProductPage />} />
                <Route path="/products/categories" element={<CategoriesPage />} />
                <Route path="/products/price-rules" element={<Suspense fallback={<PageLoader />}><PriceRulesPage /></Suspense>} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/orders/:id" element={<OrderDetailPage />} />
                <Route path="/orders/picking" element={<PickingPackingPage />} />
                <Route path="/orders/returns" element={<ReturnsPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/inventory/movements" element={<InventoryMovementsPage />} />
                <Route path="/inventory/warehouses" element={<Suspense fallback={<PageLoader />}><WarehousesPage /></Suspense>} />
                <Route path="/integrations" element={<IntegrationsPage />} />
                <Route path="/integrations/health" element={<IntegrationHealthPage />} />
                <Route path="/integrations/:marketplace/health" element={<Suspense fallback={<PageLoader />}><MarketplaceHealthPage /></Suspense>} />
                <Route path="/catalog/categories" element={<Suspense fallback={<PageLoader />}><MarketplaceCategoriesPage /></Suspense>} />
                <Route path="/catalog/mappings" element={<Suspense fallback={<PageLoader />}><CategoryMappingPage /></Suspense>} />
                <Route path="/catalog/attributes" element={<Suspense fallback={<PageLoader />}><CategoryAttributesPage /></Suspense>} />
                <Route path="/catalog/listings" element={<Suspense fallback={<PageLoader />}><ListingsPage /></Suspense>} />
                <Route path="/catalog/sync" element={<Suspense fallback={<PageLoader />}><CatalogSyncPage /></Suspense>} />
                <Route path="/operations" element={<Suspense fallback={<PageLoader />}><OperationsPage /></Suspense>} />
                <Route path="/automation" element={<Suspense fallback={<PageLoader />}><AutomationPage /></Suspense>} />
                <Route path="/financial" element={<Suspense fallback={<PageLoader />}><FinancialPage /></Suspense>} />
                <Route path="/financial/cashflow" element={<CashFlowPage />} />
                <Route path="/financial/payables" element={<PayablesPage />} />
                <Route path="/financial/receivables" element={<ReceivablesPage />} />
                <Route path="/financial/invoices" element={<InvoicesPage />} />
                <Route path="/reports/sales" element={<Suspense fallback={<PageLoader />}><SalesReportPage /></Suspense>} />
                <Route path="/reports/abc" element={<Suspense fallback={<PageLoader />}><AbcReportPage /></Suspense>} />
                <Route path="/reports/heatmap" element={<Suspense fallback={<PageLoader />}><HeatmapReportPage /></Suspense>} />
                <Route path="/reports/margin" element={<Suspense fallback={<PageLoader />}><MarginReportPage /></Suspense>} />
                <Route path="/settings/company" element={<CompanySettingsPage />} />
                <Route path="/settings/users" element={<UsersSettingsPage />} />
                <Route path="/settings/notifications" element={<NotificationsSettingsPage />} />
                <Route path="/settings/mlb-categories" element={<Suspense fallback={<PageLoader />}><MlbCategoriesPage /></Suspense>} />
                <Route path="/notifications" element={<NotificationsPage />} />
              </Route>

              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
