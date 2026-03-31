
-- sync_jobs: persistent job queue for async sync processing
CREATE TABLE public.sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  marketplace text NOT NULL,
  type text NOT NULL,
  priority text NOT NULL DEFAULT 'MEDIUM',
  payload jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'PENDING',
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  processed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- sync_dead_jobs: dead letter queue for permanently failed jobs
CREATE TABLE public.sync_dead_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_job_id uuid,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  marketplace text NOT NULL,
  type text NOT NULL,
  priority text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  died_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_dead_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage sync_jobs" ON public.sync_jobs FOR ALL USING (has_tenant_access(tenant_id) AND has_role('admin'::app_role));
CREATE POLICY "Tenant can view sync_jobs" ON public.sync_jobs FOR SELECT USING (has_tenant_access(tenant_id));

CREATE POLICY "Admin can manage sync_dead_jobs" ON public.sync_dead_jobs FOR ALL USING (has_tenant_access(tenant_id) AND has_role('admin'::app_role));
CREATE POLICY "Tenant can view sync_dead_jobs" ON public.sync_dead_jobs FOR SELECT USING (has_tenant_access(tenant_id));

-- Index for queue processing
CREATE INDEX idx_sync_jobs_status_priority ON public.sync_jobs (status, priority, created_at);
CREATE INDEX idx_sync_jobs_tenant ON public.sync_jobs (tenant_id);
