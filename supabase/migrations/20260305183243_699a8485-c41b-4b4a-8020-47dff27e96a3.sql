
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.mlb_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES public.mlb_categories(id) ON DELETE SET NULL,
  is_leaf BOOLEAN NOT NULL DEFAULT false,
  depth INT NOT NULL DEFAULT 0,
  path_from_root JSONB NOT NULL DEFAULT '[]'::jsonb,
  site_id TEXT NOT NULL DEFAULT 'MLB',
  total_items_in_this_category INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mlb_categories_parent ON public.mlb_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_mlb_categories_site ON public.mlb_categories(site_id);
CREATE INDEX IF NOT EXISTS idx_mlb_categories_leaf ON public.mlb_categories(is_leaf);
CREATE INDEX IF NOT EXISTS idx_mlb_categories_depth ON public.mlb_categories(depth);
CREATE INDEX IF NOT EXISTS idx_mlb_categories_name_trgm ON public.mlb_categories USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_mlb_categories_path ON public.mlb_categories USING GIN(path_from_root);

ALTER TABLE public.mlb_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mlb_categories_read_all" ON public.mlb_categories FOR SELECT USING (true);
CREATE POLICY "mlb_categories_service_write" ON public.mlb_categories FOR ALL TO service_role USING (true);

CREATE TABLE IF NOT EXISTS public.mlb_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running',
  total_processed INT DEFAULT 0,
  total_upserted INT DEFAULT 0,
  error_message TEXT,
  duration_seconds NUMERIC(10,2)
);

ALTER TABLE public.mlb_sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sync_logs_read_all" ON public.mlb_sync_logs FOR SELECT USING (true);
CREATE POLICY "sync_logs_service_write" ON public.mlb_sync_logs FOR ALL TO service_role USING (true);
