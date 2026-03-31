
-- =============================================
-- AUTOMATION RULES TABLE
-- =============================================
CREATE TABLE public.automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL DEFAULT 'stock_alert',
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  actions JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage automation_rules"
  ON public.automation_rules FOR ALL
  USING (has_tenant_access(tenant_id) AND has_role('admin'::app_role));

CREATE POLICY "Tenant can view automation_rules"
  ON public.automation_rules FOR SELECT
  USING (has_tenant_access(tenant_id));

-- =============================================
-- AUTOMATION LOGS TABLE
-- =============================================
CREATE TABLE public.automation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  rule_name TEXT,
  event_type TEXT NOT NULL,
  conditions_matched JSONB DEFAULT '{}'::jsonb,
  actions_executed JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage automation_logs"
  ON public.automation_logs FOR ALL
  USING (has_tenant_access(tenant_id) AND has_role('admin'::app_role));

CREATE POLICY "Tenant can view automation_logs"
  ON public.automation_logs FOR SELECT
  USING (has_tenant_access(tenant_id));

-- =============================================
-- PERFORMANCE INDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON public.orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_created ON public.orders(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_marketplace ON public.orders(tenant_id, marketplace);
CREATE INDEX IF NOT EXISTS idx_products_tenant_status ON public.products(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_products_tenant_sku ON public.products(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant ON public.stock_movements(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_product ON public.marketplace_listings(product_id, status);
CREATE INDEX IF NOT EXISTS idx_integration_logs_tenant ON public.integration_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_tenant_status ON public.sync_jobs(tenant_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_automation_rules_tenant ON public.automation_rules(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_automation_logs_tenant ON public.automation_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_logs_rule ON public.automation_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_receivables_tenant_status ON public.receivables(tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_payables_tenant_status ON public.payables(tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_date ON public.transactions(tenant_id, date DESC);
