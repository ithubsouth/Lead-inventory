-- New Hardware Procurement is now raised by the Planning Team (new first stage
-- 'planning_raise_request'). Let the raiser resubmit a request that was sent back to
-- that stage, same as the existing first stages.
DROP POLICY IF EXISTS "raiser resubmit requests" ON public.requests;
CREATE POLICY "raiser resubmit requests" ON public.requests FOR UPDATE TO authenticated
  USING (
    raised_by = auth.uid()
    AND status = 'open'
    AND current_stage IN ('planning_raise_request', 'proc_add_serials', 'planning_raise_sto')
    AND (
      SELECT rs.action::text FROM public.request_stages rs
      WHERE rs.request_id = requests.id AND rs.action::text <> 'commented'
      ORDER BY rs.created_at DESC
      LIMIT 1
    ) = 'revoked'
  )
  WITH CHECK (raised_by = auth.uid());
