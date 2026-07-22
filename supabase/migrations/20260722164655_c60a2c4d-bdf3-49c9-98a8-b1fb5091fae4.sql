
-- ENUMS
DO $$ BEGIN CREATE TYPE public.request_type AS ENUM ('new_hardware', 'asset_movement'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.request_status AS ENUM ('open', 'approved', 'rejected', 'revoked', 'closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.stage_action AS ENUM ('pending', 'approved', 'rejected', 'revoked', 'commented', 'submitted'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- HELPER
CREATE OR REPLACE FUNCTION public.user_department()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT department FROM public.users WHERE id = auth.uid() LIMIT 1 $$;

-- REQUESTS
CREATE TABLE IF NOT EXISTS public.requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.request_type NOT NULL,
  status public.request_status NOT NULL DEFAULT 'open',
  current_stage text NOT NULL,
  current_stage_dept text NOT NULL,
  title text NOT NULL,
  po_number text,
  warehouse text,
  asset_type text,
  model text,
  configuration text,
  product text,
  quantity integer DEFAULT 0,
  asset_group text,
  agreement_type text,
  notes text,
  raised_by uuid REFERENCES auth.users(id),
  raised_by_email text,
  raised_dept text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.requests TO authenticated;
GRANT ALL ON public.requests TO service_role;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read requests" ON public.requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "create requests" ON public.requests FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('Super Admin','Admin','Operator') AND raised_by = auth.uid());
CREATE POLICY "update requests" ON public.requests FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'Super Admin'
    OR (public.current_user_role() = 'Admin' AND (public.user_department() = current_stage_dept OR public.user_department() = 'Administrators'))
  );
CREATE POLICY "delete requests" ON public.requests FOR DELETE TO authenticated USING (public.current_user_role() = 'Super Admin');
CREATE TRIGGER trg_requests_updated BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- STAGES
CREATE TABLE IF NOT EXISTS public.request_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  stage_key text NOT NULL,
  stage_label text NOT NULL,
  order_index integer NOT NULL,
  assigned_dept text NOT NULL,
  action public.stage_action NOT NULL DEFAULT 'pending',
  actor_id uuid REFERENCES auth.users(id),
  actor_email text,
  actor_dept text,
  comment text,
  acted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.request_stages TO authenticated;
GRANT ALL ON public.request_stages TO service_role;
ALTER TABLE public.request_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read stages" ON public.request_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert stages" ON public.request_stages FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('Super Admin','Admin','Operator'));
CREATE POLICY "update stages" ON public.request_stages FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'Super Admin'
    OR (public.current_user_role() = 'Admin' AND (public.user_department() = assigned_dept OR public.user_department() = 'Administrators'))
  );
CREATE INDEX IF NOT EXISTS idx_request_stages_req ON public.request_stages(request_id, order_index);

-- SERIALS
CREATE TABLE IF NOT EXISTS public.request_serials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  serial_number text NOT NULL,
  asset_group text,
  warehouse text,
  exists_in_devices boolean DEFAULT false,
  is_duplicate boolean DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.request_serials TO authenticated;
GRANT ALL ON public.request_serials TO service_role;
ALTER TABLE public.request_serials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read serials" ON public.request_serials FOR SELECT TO authenticated USING (true);
CREATE POLICY "write serials" ON public.request_serials FOR ALL TO authenticated
  USING (public.current_user_role() IN ('Super Admin','Admin','Operator'))
  WITH CHECK (public.current_user_role() IN ('Super Admin','Admin','Operator'));
CREATE INDEX IF NOT EXISTS idx_request_serials_req ON public.request_serials(request_id);

-- DOCUMENTS
CREATE TABLE IF NOT EXISTS public.request_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  stage_key text,
  kind text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  mime_type text,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_by_email text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.request_documents TO authenticated;
GRANT ALL ON public.request_documents TO service_role;
ALTER TABLE public.request_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read docs" ON public.request_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert docs" ON public.request_documents FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('Super Admin','Admin','Operator') AND uploaded_by = auth.uid());
CREATE POLICY "delete docs" ON public.request_documents FOR DELETE TO authenticated
  USING (public.current_user_role() IN ('Super Admin','Admin'));

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  target_dept text,
  request_id uuid REFERENCES public.requests(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read notifs" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (target_dept IS NOT NULL AND target_dept = public.user_department()) OR public.current_user_role() = 'Super Admin');
CREATE POLICY "insert notifs" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update notifs" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR (target_dept IS NOT NULL AND target_dept = public.user_department()));
CREATE INDEX IF NOT EXISTS idx_notif_user ON public.notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notif_dept ON public.notifications(target_dept, read_at);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.request_stages;

-- Storage policies for request-documents bucket
CREATE POLICY "req docs read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'request-documents');
CREATE POLICY "req docs upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'request-documents' AND public.current_user_role() IN ('Super Admin','Admin','Operator'));
CREATE POLICY "req docs delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'request-documents' AND public.current_user_role() IN ('Super Admin','Admin'));
