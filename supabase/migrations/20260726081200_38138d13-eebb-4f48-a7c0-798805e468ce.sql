-- Request serials: verification + asset attributes
ALTER TABLE public.request_serials
  ADD COLUMN IF NOT EXISTS asset_status text,
  ADD COLUMN IF NOT EXISTS asset_code text,
  ADD COLUMN IF NOT EXISTS asset_condition text,
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verify_result text,
  ADD COLUMN IF NOT EXISTS verified_by text,
  ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone;

-- Requests: asset status shown in detail view
ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS asset_status text;

-- Request documents: soft delete / history
ALTER TABLE public.request_documents
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS deleted_by_email text;

DROP POLICY IF EXISTS "update docs" ON public.request_documents;
CREATE POLICY "update docs" ON public.request_documents
  FOR UPDATE TO authenticated
  USING (current_user_role() = ANY (ARRAY['Super Admin','Admin','Operator']))
  WITH CHECK (current_user_role() = ANY (ARRAY['Super Admin','Admin','Operator']));

-- Per-user tab access rights (NULL = department default)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS tab_access text[];