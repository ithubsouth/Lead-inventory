-- Bug: "update requests" had only a USING clause, so Postgres also applied it to
-- the UPDATED row. When a department Admin approved, the request's new
-- current_stage_dept was the NEXT department, which failed the check and the
-- request never moved on (e.g. Procurement -> Technology Team).
-- USING still decides who may act (Admin of the current department, or
-- Administrators / Super Admin); WITH CHECK now lets them hand it to any stage.
DROP POLICY IF EXISTS "update requests" ON public.requests;
CREATE POLICY "update requests" ON public.requests FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'Super Admin'
    OR (public.current_user_role() = 'Admin'
        AND (public.user_department() = current_stage_dept OR public.user_department() = 'Administrators'))
  )
  WITH CHECK (public.current_user_role() IN ('Super Admin', 'Admin'));

