-- 1) Request numbers (shown as REQ-00001) so every request is easy to track.
--    Existing requests are numbered in the order they were created.
CREATE SEQUENCE IF NOT EXISTS public.requests_request_no_seq;

ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS request_no bigint;

UPDATE public.requests r
SET request_no = s.n
FROM (SELECT id, row_number() OVER (ORDER BY created_at, id) AS n FROM public.requests) s
WHERE r.id = s.id AND r.request_no IS NULL;

SELECT setval(
  'public.requests_request_no_seq',
  COALESCE((SELECT max(request_no) FROM public.requests), 0) + 1,
  false
);

ALTER SEQUENCE public.requests_request_no_seq OWNED BY public.requests.request_no;
ALTER TABLE public.requests ALTER COLUMN request_no SET DEFAULT nextval('public.requests_request_no_seq');
ALTER TABLE public.requests ALTER COLUMN request_no SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS requests_request_no_key ON public.requests (request_no);
GRANT USAGE, SELECT ON SEQUENCE public.requests_request_no_seq TO authenticated;

-- 2) Procurement Operators can work on the "Add Serial Numbers" step, including when a
--    request is sent back to Procurement (before, only a Procurement Admin could, so
--    sent-back requests looked stuck). Release PO stays Admin-only.
DROP POLICY IF EXISTS "procurement operators add serials" ON public.requests;
CREATE POLICY "procurement operators add serials" ON public.requests FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'Operator'
    AND public.user_department() = 'Procurement Team'
    AND current_stage = 'proc_add_serials'
    AND current_stage_dept = 'Procurement Team'
  )
  WITH CHECK (public.current_user_role() = 'Operator' AND public.user_department() = 'Procurement Team');
