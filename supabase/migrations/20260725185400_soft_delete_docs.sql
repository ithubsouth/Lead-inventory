
-- Add soft delete columns to request_documents
ALTER TABLE public.request_documents
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS deleted_by_email text;

-- Update RLS for soft delete
-- Note: 'delete docs' policy was previously restricted to Super Admin and Admin.
-- We change it to allow Admin/Super Admin to soft-delete by updating.
-- And we restrict the actual hard DELETE to Super Admin only if we want to be safe,
-- but the prompt implies we should just store deleted files.

-- Update the delete policy to prevent actual deletion if we want to strictly soft-delete
-- However, existing policy is:
-- CREATE POLICY "delete docs" ON public.request_documents FOR DELETE TO authenticated
--   USING (public.current_user_role() IN ('Super Admin','Admin'));

-- Let's add an update policy that allows soft deletion
CREATE POLICY "soft delete docs" ON public.request_documents FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('Super Admin','Admin') OR public.user_department() = 'Administrators');

-- Ensure read docs policy allows reading deleted ones (we filter in frontend)
-- CREATE POLICY "read docs" ON public.request_documents FOR SELECT TO authenticated USING (true);
-- This is already broad enough.
