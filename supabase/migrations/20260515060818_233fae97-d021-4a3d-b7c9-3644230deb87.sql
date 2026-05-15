
-- 1) active_users: enable RLS and restrict to authenticated, scoped to own row for writes
ALTER TABLE public.active_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view active users" ON public.active_users;
DROP POLICY IF EXISTS "Users manage their own presence" ON public.active_users;

CREATE POLICY "Authenticated can view active users"
ON public.active_users FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users insert their own presence"
ON public.active_users FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own presence"
ON public.active_users FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own presence"
ON public.active_users FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- 2) users: restrict SELECT to authenticated, fix role-based write policies using has_role helper
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE email = auth.email() LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

DROP POLICY IF EXISTS "All roles can view users" ON public.users;
DROP POLICY IF EXISTS "Role-based insert" ON public.users;
DROP POLICY IF EXISTS "Role-based update" ON public.users;
DROP POLICY IF EXISTS "Role-based delete" ON public.users;

CREATE POLICY "Authenticated can view users"
ON public.users FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert users"
ON public.users FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() IN ('Super Admin','Admin'));

CREATE POLICY "Admins can update users"
ON public.users FOR UPDATE TO authenticated
USING (public.current_user_role() IN ('Super Admin','Admin'))
WITH CHECK (public.current_user_role() IN ('Super Admin','Admin'));

CREATE POLICY "Super admins can delete users"
ON public.users FOR DELETE TO authenticated
USING (public.current_user_role() = 'Super Admin');

-- 3) old table: restrict to authenticated only
DROP POLICY IF EXISTS "Users can view history" ON public.old;
DROP POLICY IF EXISTS "System can insert history" ON public.old;

CREATE POLICY "Authenticated can view old history"
ON public.old FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert old history"
ON public.old FOR INSERT TO authenticated WITH CHECK (true);

-- 4) audit_check_history: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Allow all to view audit history" ON public.audit_check_history;
DROP POLICY IF EXISTS "Allow authenticated to insert audit history" ON public.audit_check_history;

CREATE POLICY "Authenticated can view audit history"
ON public.audit_check_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert audit history"
ON public.audit_check_history FOR INSERT TO authenticated WITH CHECK (true);

-- 5) Remove overly permissive public ALL policies on devices/orders, keep authenticated CRUD
DROP POLICY IF EXISTS "Allow all operations on devices" ON public.devices;
DROP POLICY IF EXISTS "Allow all operations on orders" ON public.orders;

-- 6) history table: scope to authenticated explicitly (already auth.role() check, but make role-targeted)
DROP POLICY IF EXISTS "Allow authenticated users to insert edit history" ON public.history;
CREATE POLICY "Authenticated can manage edit history"
ON public.history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7) Fix mutable search_path on existing functions
ALTER FUNCTION public.sync_device_order_type() SET search_path = public;
ALTER FUNCTION public.update_asset_check_only(text[], text) SET search_path = public;
ALTER FUNCTION public.get_user_by_email(text) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 8) Lock down SECURITY DEFINER function execution
REVOKE EXECUTE ON FUNCTION public.get_user_by_email(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_history() FROM PUBLIC, anon, authenticated;
