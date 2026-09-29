-- Revoke now sends a request back to the person who raised it (first stage).
-- Allow the raiser to resubmit their own request only while it is at the first
-- stage AND the latest workflow action (ignoring comments) was a revoke.
DROP POLICY IF EXISTS "raiser resubmit requests" ON public.requests;
CREATE POLICY "raiser resubmit requests" ON public.requests FOR UPDATE TO authenticated
  USING (
    raised_by = auth.uid()
    AND status = 'open'
    AND current_stage IN ('proc_add_serials', 'planning_raise_sto')
    AND (
      SELECT rs.action::text FROM public.request_stages rs
      WHERE rs.request_id = requests.id AND rs.action::text <> 'commented'
      ORDER BY rs.created_at DESC
      LIMIT 1
    ) = 'revoked'
  )
  WITH CHECK (raised_by = auth.uid());
