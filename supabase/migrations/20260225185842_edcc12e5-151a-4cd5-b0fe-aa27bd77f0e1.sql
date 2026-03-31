
-- Create warehouses table
CREATE TABLE public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  address JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can view warehouses" ON public.warehouses
  FOR SELECT USING (has_tenant_access(tenant_id));

CREATE POLICY "Admin/Op can manage warehouses" ON public.warehouses
  FOR ALL USING (has_tenant_access(tenant_id) AND has_any_role(ARRAY['admin'::app_role, 'operational'::app_role]));

-- Add warehouse_id to stock_movements
ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES public.warehouses(id);

-- Add warehouse_stocks JSONB to product_variants
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS warehouse_stocks JSONB DEFAULT '{}';
