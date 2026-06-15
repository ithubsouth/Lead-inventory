
-- Fix 1: Restrict custom_options INSERT to non-Reporter roles
DROP POLICY IF EXISTS "Authenticated can insert custom options" ON public.custom_options;
CREATE POLICY "Non-reporters can insert custom options"
ON public.custom_options
FOR INSERT
TO authenticated
WITH CHECK (public.current_user_role() = ANY (ARRAY['Super Admin', 'Admin', 'Operator']));

-- Fix 2: Restrict DELETE on old (history) table to Super Admin / Admin
DROP POLICY IF EXISTS "history_delete_policy" ON public.old;
DROP POLICY IF EXISTS "allow delete for authenticated users" ON public.old;
CREATE POLICY "Only admins can delete history"
ON public.old
FOR DELETE
TO authenticated
USING (public.current_user_role() = ANY (ARRAY['Super Admin', 'Admin']));

-- Fix 3: Add a restrictive UPDATE policy on asset_documents (admins only) for defense-in-depth
DROP POLICY IF EXISTS "Only admins can update asset_documents" ON public.asset_documents;
CREATE POLICY "Only admins can update asset_documents"
ON public.asset_documents
FOR UPDATE
TO authenticated
USING (public.current_user_role() = ANY (ARRAY['Super Admin', 'Admin']))
WITH CHECK (public.current_user_role() = ANY (ARRAY['Super Admin', 'Admin']));
