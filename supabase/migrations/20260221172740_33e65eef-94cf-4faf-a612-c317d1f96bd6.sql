
-- Stock movements table for tracking inventory changes
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  product_variant_id UUID NOT NULL REFERENCES public.product_variants(id),
  type TEXT NOT NULL DEFAULT 'adjustment', -- 'in', 'out', 'adjustment', 'sale', 'return'
  quantity INTEGER NOT NULL,
  reason TEXT,
  reference_id UUID, -- optional link to order_id or other entity
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Tenant can view movements"
  ON public.stock_movements FOR SELECT
  USING (has_tenant_access(tenant_id));

CREATE POLICY "Admin/Op can insert movements"
  ON public.stock_movements FOR INSERT
  WITH CHECK (has_tenant_access(tenant_id) AND has_any_role(ARRAY['admin'::app_role, 'operational'::app_role]));

CREATE POLICY "Admin can delete movements"
  ON public.stock_movements FOR DELETE
  USING (has_tenant_access(tenant_id) AND has_role('admin'::app_role));

-- Index for faster queries
CREATE INDEX idx_stock_movements_tenant ON public.stock_movements(tenant_id);
CREATE INDEX idx_stock_movements_variant ON public.stock_movements(product_variant_id);
CREATE INDEX idx_stock_movements_created ON public.stock_movements(created_at DESC);
