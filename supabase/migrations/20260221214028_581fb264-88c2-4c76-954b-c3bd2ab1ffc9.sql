
-- 1. Integration logs table
CREATE TABLE IF NOT EXISTS public.integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can view integration logs"
ON public.integration_logs FOR SELECT
USING (has_tenant_access(tenant_id));

CREATE POLICY "Admin can manage integration logs"
ON public.integration_logs FOR ALL
USING (has_tenant_access(tenant_id) AND has_role('admin'::app_role));

-- 2. Add last_seen_at to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- 3. Add address and phone to tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS address JSONB DEFAULT '{}';
