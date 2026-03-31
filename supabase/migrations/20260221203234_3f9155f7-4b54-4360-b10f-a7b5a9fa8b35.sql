
-- 1. Add logo_url to tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2. Create company-logos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read policy for company-logos
CREATE POLICY "Public read company logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- Admins can upload company logos
CREATE POLICY "Admins upload company logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] = (public.get_user_tenant_id())::text
  AND public.has_role('admin'::app_role)
);

-- Admins can update company logos
CREATE POLICY "Admins update company logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] = (public.get_user_tenant_id())::text
  AND public.has_role('admin'::app_role)
);

-- 3. Add status column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 4. Create notification_settings table
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_email TEXT,
  frequency TEXT DEFAULT 'immediate',
  stock_critical_email BOOLEAN DEFAULT true,
  listing_paused_email BOOLEAN DEFAULT true,
  order_delayed_email BOOLEAN DEFAULT true,
  integration_error_email BOOLEAN DEFAULT true,
  order_risk_email BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification settings"
ON public.notification_settings FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notification settings"
ON public.notification_settings FOR INSERT
WITH CHECK (user_id = auth.uid() AND has_tenant_access(tenant_id));

CREATE POLICY "Users can update own notification settings"
ON public.notification_settings FOR UPDATE
USING (user_id = auth.uid());
