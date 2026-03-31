
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'operational', 'financial', 'viewer');

-- Tenants
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User Roles (separate table per security guidelines)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer helper functions
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_access(_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND tenant_id = _tenant_id
  )
$$;

CREATE OR REPLACE FUNCTION public.has_role(_role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND tenant_id = public.get_user_tenant_id()
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_roles app_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND tenant_id = public.get_user_tenant_id()
      AND role = ANY(_roles)
  )
$$;

-- Auto-create profile + tenant on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id UUID;
  _company_name TEXT;
BEGIN
  _company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', 'Minha Empresa');
  
  INSERT INTO public.tenants (name, cnpj)
  VALUES (_company_name, NEW.raw_user_meta_data->>'cnpj')
  RETURNING id INTO _tenant_id;

  INSERT INTO public.profiles (id, tenant_id, email, full_name)
  VALUES (NEW.id, _tenant_id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.id, _tenant_id, 'admin');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies: tenants
CREATE POLICY "Users can view own tenant" ON public.tenants FOR SELECT USING (public.has_tenant_access(id));
CREATE POLICY "Admins can update own tenant" ON public.tenants FOR UPDATE USING (public.has_tenant_access(id) AND public.has_role('admin'));

-- RLS Policies: profiles
CREATE POLICY "Users can view tenant profiles" ON public.profiles FOR SELECT USING (public.has_tenant_access(tenant_id));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- RLS Policies: user_roles
CREATE POLICY "Users can view tenant roles" ON public.user_roles FOR SELECT USING (public.has_tenant_access(tenant_id));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_tenant_access(tenant_id) AND public.has_role('admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (public.has_tenant_access(tenant_id) AND public.has_role('admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.has_tenant_access(tenant_id) AND public.has_role('admin'));

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.categories(id),
  marketplace_mapping JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant access" ON public.categories FOR SELECT USING (public.has_tenant_access(tenant_id));
CREATE POLICY "Admin/Op can manage" ON public.categories FOR ALL USING (public.has_tenant_access(tenant_id) AND public.has_any_role(ARRAY['admin','operational']::app_role[]));

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  model TEXT,
  ean TEXT,
  sku TEXT,
  category_id UUID REFERENCES public.categories(id),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE POLICY "Tenant can view products" ON public.products FOR SELECT USING (public.has_tenant_access(tenant_id));
CREATE POLICY "Admin/Op can manage products" ON public.products FOR INSERT WITH CHECK (public.has_tenant_access(tenant_id) AND public.has_any_role(ARRAY['admin','operational']::app_role[]));
CREATE POLICY "Admin/Op can update products" ON public.products FOR UPDATE USING (public.has_tenant_access(tenant_id) AND public.has_any_role(ARRAY['admin','operational']::app_role[]));
CREATE POLICY "Admin/Op can delete products" ON public.products FOR DELETE USING (public.has_tenant_access(tenant_id) AND public.has_any_role(ARRAY['admin','operational']::app_role[]));

-- Product Images
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INT DEFAULT 0,
  is_primary BOOLEAN DEFAULT false
);
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant access via product" ON public.product_images FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.has_tenant_access(p.tenant_id))
);
CREATE POLICY "Admin/Op can manage images" ON public.product_images FOR ALL USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.has_tenant_access(p.tenant_id) AND public.has_any_role(ARRAY['admin','operational']::app_role[]))
);

-- Product Variants
CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT,
  ean TEXT,
  combination JSONB DEFAULT '{}',
  price NUMERIC(12,2) DEFAULT 0,
  cost NUMERIC(12,2) DEFAULT 0,
  stock INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant access via product" ON public.product_variants FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.has_tenant_access(p.tenant_id))
);
CREATE POLICY "Admin/Op can manage variants" ON public.product_variants FOR ALL USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND public.has_tenant_access(p.tenant_id) AND public.has_any_role(ARRAY['admin','operational']::app_role[]))
);

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  marketplace TEXT,
  order_number TEXT,
  customer JSONB DEFAULT '{}',
  total NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE POLICY "Tenant can view orders" ON public.orders FOR SELECT USING (public.has_tenant_access(tenant_id));
CREATE POLICY "Admin/Op can manage orders" ON public.orders FOR INSERT WITH CHECK (public.has_tenant_access(tenant_id) AND public.has_any_role(ARRAY['admin','operational']::app_role[]));
CREATE POLICY "Admin/Op/Fin can update orders" ON public.orders FOR UPDATE USING (public.has_tenant_access(tenant_id) AND public.has_any_role(ARRAY['admin','operational','financial']::app_role[]));
CREATE POLICY "Admin can delete orders" ON public.orders FOR DELETE USING (public.has_tenant_access(tenant_id) AND public.has_role('admin'));

-- Order Items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_variant_id UUID REFERENCES public.product_variants(id),
  title TEXT,
  quantity INT NOT NULL DEFAULT 1,
  price NUMERIC(12,2) DEFAULT 0
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant access via order" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.has_tenant_access(o.tenant_id))
);
CREATE POLICY "Admin/Op can manage order items" ON public.order_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.has_tenant_access(o.tenant_id) AND public.has_any_role(ARRAY['admin','operational']::app_role[]))
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (public.has_tenant_access(tenant_id) AND user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (public.has_tenant_access(tenant_id) AND user_id = auth.uid());
