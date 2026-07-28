-- Add raised_by_role to track originating user role
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS raised_by_role text;

-- Ensure acted_at defaults to now for new stage records
ALTER TABLE public.request_stages ALTER COLUMN acted_at SET DEFAULT now();

-- Update Notification RLS to allow Administrators department full access
DROP POLICY IF EXISTS "read notifs" ON public.notifications;
CREATE POLICY "read notifs" ON public.notifications FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (target_dept IS NOT NULL AND target_dept = public.user_department())
    OR public.current_user_role() = 'Super Admin'
    OR public.user_department() = 'Administrators'
  );

DROP POLICY IF EXISTS "update notifs" ON public.notifications;
CREATE POLICY "update notifs" ON public.notifications FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR (target_dept IS NOT NULL AND target_dept = public.user_department())
    OR public.user_department() = 'Administrators'
  );
