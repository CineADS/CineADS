
-- Accounts payable
CREATE TABLE public.payables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'overdue'
  category TEXT,
  supplier TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can view payables" ON public.payables FOR SELECT USING (has_tenant_access(tenant_id));
CREATE POLICY "Admin/Fin can insert payables" ON public.payables FOR INSERT WITH CHECK (has_tenant_access(tenant_id) AND has_any_role(ARRAY['admin'::app_role, 'financial'::app_role]));
CREATE POLICY "Admin/Fin can update payables" ON public.payables FOR UPDATE USING (has_tenant_access(tenant_id) AND has_any_role(ARRAY['admin'::app_role, 'financial'::app_role]));
CREATE POLICY "Admin can delete payables" ON public.payables FOR DELETE USING (has_tenant_access(tenant_id) AND has_role('admin'::app_role));

CREATE TRIGGER update_payables_updated_at BEFORE UPDATE ON public.payables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Accounts receivable
CREATE TABLE public.receivables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'received', 'overdue'
  category TEXT,
  customer_name TEXT,
  order_id UUID REFERENCES public.orders(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can view receivables" ON public.receivables FOR SELECT USING (has_tenant_access(tenant_id));
CREATE POLICY "Admin/Fin can insert receivables" ON public.receivables FOR INSERT WITH CHECK (has_tenant_access(tenant_id) AND has_any_role(ARRAY['admin'::app_role, 'financial'::app_role]));
CREATE POLICY "Admin/Fin can update receivables" ON public.receivables FOR UPDATE USING (has_tenant_access(tenant_id) AND has_any_role(ARRAY['admin'::app_role, 'financial'::app_role]));
CREATE POLICY "Admin can delete receivables" ON public.receivables FOR DELETE USING (has_tenant_access(tenant_id) AND has_role('admin'::app_role));

CREATE TRIGGER update_receivables_updated_at BEFORE UPDATE ON public.receivables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Indexes
CREATE INDEX idx_payables_tenant ON public.payables(tenant_id);
CREATE INDEX idx_payables_due ON public.payables(due_date);
CREATE INDEX idx_receivables_tenant ON public.receivables(tenant_id);
CREATE INDEX idx_receivables_due ON public.receivables(due_date);
