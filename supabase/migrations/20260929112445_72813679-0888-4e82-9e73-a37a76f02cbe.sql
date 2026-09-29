CREATE POLICY "tech operators verify serials" ON public.requests FOR UPDATE TO authenticated
USING (current_user_role() = 'Operator' AND user_department() = 'Technology Team' AND current_stage = 'tech_verify_serials')
WITH CHECK (current_user_role() = 'Operator' AND user_department() = 'Technology Team');
CREATE POLICY "tech operators update verify stage" ON public.request_stages FOR UPDATE TO authenticated
USING (current_user_role() = 'Operator' AND user_department() = 'Technology Team' AND assigned_dept = 'Technology Team');