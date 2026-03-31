
-- Category Mappings: maps internal categories to marketplace categories
CREATE TABLE public.category_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  internal_category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL,
  marketplace_category_id TEXT NOT NULL,
  marketplace_category_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, internal_category_id, marketplace)
);

ALTER TABLE public.category_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Op can manage category_mappings" ON public.category_mappings
  FOR ALL TO authenticated
  USING (has_tenant_access(tenant_id) AND has_any_role(ARRAY['admin'::app_role, 'operational'::app_role]));

CREATE POLICY "Tenant can view category_mappings" ON public.category_mappings
  FOR SELECT TO authenticated
  USING (has_tenant_access(tenant_id));

CREATE TRIGGER update_category_mappings_updated_at
  BEFORE UPDATE ON public.category_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Category Attributes: marketplace-specific attributes for categories
CREATE TABLE public.category_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace TEXT NOT NULL,
  category_id TEXT NOT NULL,
  attribute_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'string',
  required BOOLEAN NOT NULL DEFAULT false,
  values JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(marketplace, category_id, attribute_id)
);

ALTER TABLE public.category_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read category_attributes" ON public.category_attributes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service can manage category_attributes" ON public.category_attributes
  FOR ALL TO authenticated USING (true);

-- Marketplace Categories: generic tree for all marketplaces
CREATE TABLE public.marketplace_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace TEXT NOT NULL,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_id TEXT,
  path JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(marketplace, category_id)
);

ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read marketplace_categories" ON public.marketplace_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service can manage marketplace_categories" ON public.marketplace_categories
  FOR ALL TO authenticated USING (true);

-- Index for tree queries
CREATE INDEX idx_marketplace_categories_parent ON public.marketplace_categories(marketplace, parent_id);
CREATE INDEX idx_category_mappings_tenant ON public.category_mappings(tenant_id, marketplace);
