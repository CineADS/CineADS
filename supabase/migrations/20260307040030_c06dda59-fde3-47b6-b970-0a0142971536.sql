
-- Add tenant_id and marketplace to marketplace_listings for direct querying
ALTER TABLE public.marketplace_listings
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS marketplace TEXT;

-- Add unique constraint for tenant + product + marketplace
ALTER TABLE public.marketplace_listings
  ADD CONSTRAINT uq_listing_tenant_product_marketplace UNIQUE (tenant_id, product_id, marketplace);

-- Index for tenant queries
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_tenant ON public.marketplace_listings(tenant_id, marketplace);
