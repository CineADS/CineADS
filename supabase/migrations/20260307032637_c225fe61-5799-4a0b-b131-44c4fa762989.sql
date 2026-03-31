
-- Tabela sync_state para sincronização incremental
CREATE TABLE public.sync_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL,
  entity TEXT NOT NULL,
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_cursor TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, marketplace, entity)
);

-- Indices
CREATE INDEX idx_sync_state_tenant_mkt ON public.sync_state(tenant_id, marketplace);

-- RLS
ALTER TABLE public.sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage sync_state"
  ON public.sync_state FOR ALL
  TO authenticated
  USING (has_tenant_access(tenant_id) AND has_role('admin'::app_role));

CREATE POLICY "Tenant can view sync_state"
  ON public.sync_state FOR SELECT
  TO authenticated
  USING (has_tenant_access(tenant_id));
