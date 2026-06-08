
DROP POLICY IF EXISTS "Authenticated can upload asset-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete asset-documents" ON storage.objects;

CREATE POLICY "Non-reporters can upload asset-documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'asset-documents'
  AND public.current_user_role() = ANY (ARRAY['Super Admin','Admin','Operator'])
);

CREATE POLICY "Admins can delete asset-documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'asset-documents'
  AND public.current_user_role() = ANY (ARRAY['Super Admin','Admin'])
);
