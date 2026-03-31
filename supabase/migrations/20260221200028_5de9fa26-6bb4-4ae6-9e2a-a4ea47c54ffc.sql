
-- 1. product_attributes
CREATE TABLE public.product_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL,
  attribute_key TEXT NOT NULL,
  attribute_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant select product_attributes" ON public.product_attributes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = product_attributes.product_id AND has_tenant_access(p.tenant_id)
  ));
CREATE POLICY "Admin/Op manage product_attributes" ON public.product_attributes
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = product_attributes.product_id
      AND has_tenant_access(p.tenant_id)
      AND has_any_role(ARRAY['admin'::app_role, 'operational'::app_role])
  ));

-- 2. marketplace_integrations
CREATE TABLE public.marketplace_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected',
  credentials JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.marketplace_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant select marketplace_integrations" ON public.marketplace_integrations
  FOR SELECT USING (has_tenant_access(tenant_id));
CREATE POLICY "Admin manage marketplace_integrations" ON public.marketplace_integrations
  FOR ALL USING (has_tenant_access(tenant_id) AND has_role('admin'::app_role));

-- 3. marketplace_listings
CREATE TABLE public.marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.marketplace_integrations(id) ON DELETE CASCADE,
  listing_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive',
  price NUMERIC(10,2),
  stock INTEGER DEFAULT 0,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant select marketplace_listings" ON public.marketplace_listings
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = marketplace_listings.product_id AND has_tenant_access(p.tenant_id)
  ));
CREATE POLICY "Admin/Op manage marketplace_listings" ON public.marketplace_listings
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = marketplace_listings.product_id
      AND has_tenant_access(p.tenant_id)
      AND has_any_role(ARRAY['admin'::app_role, 'operational'::app_role])
  ));

-- 4. order_timeline
CREATE TABLE public.order_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  message TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.order_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant select order_timeline" ON public.order_timeline
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = order_timeline.order_id AND has_tenant_access(o.tenant_id)
  ));
CREATE POLICY "Admin/Op manage order_timeline" ON public.order_timeline
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = order_timeline.order_id
      AND has_tenant_access(o.tenant_id)
      AND has_any_role(ARRAY['admin'::app_role, 'operational'::app_role])
  ));

-- 5. order_shipping
CREATE TABLE public.order_shipping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  carrier TEXT,
  tracking_code TEXT,
  address JSONB DEFAULT '{}',
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.order_shipping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant select order_shipping" ON public.order_shipping
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = order_shipping.order_id AND has_tenant_access(o.tenant_id)
  ));
CREATE POLICY "Admin/Op manage order_shipping" ON public.order_shipping
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = order_shipping.order_id
      AND has_tenant_access(o.tenant_id)
      AND has_any_role(ARRAY['admin'::app_role, 'operational'::app_role])
  ));

-- 6. transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  date DATE NOT NULL,
  category TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant select transactions" ON public.transactions
  FOR SELECT USING (has_tenant_access(tenant_id));
CREATE POLICY "Admin/Fin manage transactions" ON public.transactions
  FOR ALL USING (has_tenant_access(tenant_id) AND has_any_role(ARRAY['admin'::app_role, 'financial'::app_role]));

-- 7. invoices
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id),
  nfe_key TEXT,
  nfe_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant select invoices" ON public.invoices
  FOR SELECT USING (has_tenant_access(tenant_id));
CREATE POLICY "Admin/Fin manage invoices" ON public.invoices
  FOR ALL USING (has_tenant_access(tenant_id) AND has_any_role(ARRAY['admin'::app_role, 'financial'::app_role]));

-- 8. stock_rules
CREATE TABLE public.stock_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL,
  min_stock INTEGER DEFAULT 0,
  max_available INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.stock_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant select stock_rules" ON public.stock_rules
  FOR SELECT USING (has_tenant_access(tenant_id));
CREATE POLICY "Admin/Op manage stock_rules" ON public.stock_rules
  FOR ALL USING (has_tenant_access(tenant_id) AND has_any_role(ARRAY['admin'::app_role, 'operational'::app_role]));

-- Update triggers for updated_at
CREATE TRIGGER update_marketplace_integrations_updated_at BEFORE UPDATE ON public.marketplace_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_marketplace_listings_updated_at BEFORE UPDATE ON public.marketplace_listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
