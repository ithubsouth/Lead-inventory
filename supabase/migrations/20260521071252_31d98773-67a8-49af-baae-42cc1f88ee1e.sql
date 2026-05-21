
-- 1) Harden current_user_role() to use immutable auth.uid() instead of email
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- 2) audit_check_history: restrict INSERT to admins (no direct client insert exists)
DROP POLICY IF EXISTS "Authenticated can insert audit history" ON public.audit_check_history;
CREATE POLICY "Admins can insert audit history"
ON public.audit_check_history
FOR INSERT TO authenticated
WITH CHECK (current_user_role() = ANY (ARRAY['Super Admin'::text, 'Admin'::text]));

-- 3) Revoke EXECUTE on internal trigger functions from regular users
REVOKE EXECUTE ON FUNCTION public.log_history() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.sync_device_order_type() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_by_email(text) FROM PUBLIC, anon;
