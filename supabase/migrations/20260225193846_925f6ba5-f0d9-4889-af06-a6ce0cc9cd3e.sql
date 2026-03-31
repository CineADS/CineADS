
CREATE TABLE IF NOT EXISTS public.price_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'active', 'paused', 'expired', 'cancelled')),
  adjustment_type TEXT NOT NULL
    CHECK (adjustment_type IN ('percent_increase', 'percent_decrease', 'fixed_increase', 'fixed_decrease', 'fixed_price')),
  adjustment_value NUMERIC(10,2) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  min_margin_percent NUMERIC(5,2) DEFAULT 0,
  min_price NUMERIC(10,2) DEFAULT 0,
  scope JSONB DEFAULT '{}',
  products_affected INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.price_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can view price_rules" ON public.price_rules
  FOR SELECT USING (has_tenant_access(tenant_id));

CREATE POLICY "Admin/Op can manage price_rules" ON public.price_rules
  FOR ALL USING (has_tenant_access(tenant_id) AND has_any_role(ARRAY['admin'::app_role, 'operational'::app_role]));

CREATE TABLE IF NOT EXISTS public.price_rule_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.price_rules(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_variant_id UUID REFERENCES public.product_variants(id),
  sku TEXT,
  product_name TEXT,
  marketplace TEXT,
  price_before NUMERIC(10,2),
  price_after NUMERIC(10,2),
  margin_before NUMERIC(5,2),
  margin_after NUMERIC(5,2),
  blocked_by_margin BOOLEAN DEFAULT false,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.price_rule_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can view price_rule_history" ON public.price_rule_history
  FOR SELECT USING (has_tenant_access(tenant_id));

CREATE POLICY "Admin/Op can manage price_rule_history" ON public.price_rule_history
  FOR ALL USING (has_tenant_access(tenant_id) AND has_any_role(ARRAY['admin'::app_role, 'operational'::app_role]));
