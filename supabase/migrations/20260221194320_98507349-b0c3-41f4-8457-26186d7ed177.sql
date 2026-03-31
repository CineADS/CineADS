
-- Create returns table for Prompt 7
CREATE TABLE public.returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  order_id UUID REFERENCES public.orders(id),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can view returns" ON public.returns
  FOR SELECT USING (has_tenant_access(tenant_id));

CREATE POLICY "Admin/Op can insert returns" ON public.returns
  FOR INSERT WITH CHECK (has_tenant_access(tenant_id) AND has_any_role(ARRAY['admin'::app_role, 'operational'::app_role]));

CREATE POLICY "Admin/Op can update returns" ON public.returns
  FOR UPDATE USING (has_tenant_access(tenant_id) AND has_any_role(ARRAY['admin'::app_role, 'operational'::app_role]));

CREATE POLICY "Admin can delete returns" ON public.returns
  FOR DELETE USING (has_tenant_access(tenant_id) AND has_role('admin'::app_role));

-- Create storage bucket for product images (Prompt 4)
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

CREATE POLICY "Anyone can view product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update product images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete product images" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');
