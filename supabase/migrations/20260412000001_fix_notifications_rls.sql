-- Fix RLS policies for notifications table
--
-- Problem 1: No INSERT policy → alert-engine (anon client) cannot insert
-- Problem 2: SELECT/UPDATE require user_id = auth.uid() → notifications without
--            user_id (tenant-wide alerts) are invisible to all users
--
-- Fix: scope all policies by tenant, make user_id optional filter

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

-- SELECT: any member of the tenant can see all tenant notifications
-- (including alerts without a specific user_id)
CREATE POLICY "Tenant members can view notifications"
  ON public.notifications
  FOR SELECT
  USING (public.has_tenant_access(tenant_id));

-- INSERT: any tenant member can insert (alert-engine runs as the logged-in user)
CREATE POLICY "Tenant members can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (public.has_tenant_access(tenant_id));

-- UPDATE: tenant members can mark notifications as read
CREATE POLICY "Tenant members can update notifications"
  ON public.notifications
  FOR UPDATE
  USING (public.has_tenant_access(tenant_id));
