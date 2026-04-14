-- ─────────────────────────────────────────────────────────────────────────────
-- Loja Virtual — extensão do CineADS para vitrine omnichannel
--
-- Adiciona:
--   1. store_slug e store_settings na tabela tenants
--   2. visibility nos products (public/private)
--   3. Tabela store_orders para pedidos da loja própria
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Campos da loja no tenant
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS store_slug       TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS store_active     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS store_settings   JSONB DEFAULT '{}'::jsonb;

-- store_settings guarda: template, primary_color, logo_url, banner_url,
-- store_name, store_description, infinitepay_api_key

-- Índice para busca rápida por slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_store_slug
  ON public.tenants (store_slug)
  WHERE store_slug IS NOT NULL;

-- 2. Visibilidade dos produtos
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS store_visible BOOLEAN DEFAULT true;

-- 3. Tabela de pedidos da loja própria
CREATE TABLE IF NOT EXISTS public.store_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_name   TEXT NOT NULL,
  customer_email  TEXT NOT NULL,
  customer_phone  TEXT,
  items           JSONB NOT NULL, -- [{product_id, title, qty, unit_price}]
  subtotal        NUMERIC(10,2) NOT NULL,
  shipping        NUMERIC(10,2) DEFAULT 0,
  total           NUMERIC(10,2) NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  -- pending | paid | preparing | shipped | delivered | cancelled
  payment_id      TEXT,           -- ID do pagamento no InfinitePay
  payment_method  TEXT,           -- pix | credit_card | boleto
  shipping_address JSONB,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;

-- Seller vê apenas os pedidos da sua loja
CREATE POLICY "Tenant vê seus pedidos da loja"
  ON public.store_orders FOR SELECT
  USING (public.has_tenant_access(tenant_id));

CREATE POLICY "Tenant atualiza seus pedidos da loja"
  ON public.store_orders FOR UPDATE
  USING (public.has_tenant_access(tenant_id));

-- INSERT público — cliente finaliza compra sem login
CREATE POLICY "Público pode criar pedido na loja"
  ON public.store_orders FOR INSERT
  WITH CHECK (true);

-- 4. Política pública para produtos visíveis na loja
CREATE POLICY "Produtos públicos visíveis na loja"
  ON public.products FOR SELECT
  USING (
    store_visible = true
    OR public.has_tenant_access(tenant_id)
  );

-- 5. Índices de performance
CREATE INDEX IF NOT EXISTS idx_store_orders_tenant
  ON public.store_orders (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_store_visible
  ON public.products (tenant_id, store_visible)
  WHERE store_visible = true;
