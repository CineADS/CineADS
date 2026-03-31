
-- 1) Repricing Rules table
CREATE TABLE public.repricing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL,
  strategy TEXT NOT NULL DEFAULT 'FIXED_MARGIN',
  min_price NUMERIC NOT NULL DEFAULT 0,
  max_price NUMERIC,
  target_margin NUMERIC NOT NULL DEFAULT 15,
  competitor_price NUMERIC,
  current_price NUMERIC,
  last_repriced_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.repricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage repricing_rules" ON public.repricing_rules
  FOR ALL TO authenticated
  USING (has_tenant_access(tenant_id) AND has_any_role(ARRAY['admin'::app_role, 'operational'::app_role]));

CREATE POLICY "Tenant can view repricing_rules" ON public.repricing_rules
  FOR SELECT TO authenticated
  USING (has_tenant_access(tenant_id));

CREATE INDEX idx_repricing_rules_tenant ON public.repricing_rules(tenant_id);
CREATE INDEX idx_repricing_rules_product ON public.repricing_rules(product_id);
CREATE INDEX idx_repricing_rules_status ON public.repricing_rules(tenant_id, status);

-- 2) Stock Reservations table
CREATE TABLE public.stock_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'reserved',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Op can manage stock_reservations" ON public.stock_reservations
  FOR ALL TO authenticated
  USING (has_tenant_access(tenant_id) AND has_any_role(ARRAY['admin'::app_role, 'operational'::app_role]));

CREATE POLICY "Tenant can view stock_reservations" ON public.stock_reservations
  FOR SELECT TO authenticated
  USING (has_tenant_access(tenant_id));

CREATE INDEX idx_stock_reservations_tenant ON public.stock_reservations(tenant_id);
CREATE INDEX idx_stock_reservations_variant ON public.stock_reservations(product_variant_id);
CREATE INDEX idx_stock_reservations_order ON public.stock_reservations(order_id);
CREATE INDEX idx_stock_reservations_status ON public.stock_reservations(tenant_id, status);
