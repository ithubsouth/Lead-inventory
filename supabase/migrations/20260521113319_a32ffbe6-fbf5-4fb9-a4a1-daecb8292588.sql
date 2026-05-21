-- Enforce role-based access: Reporter is view-only.
-- Drop permissive ALL policies on orders/devices and add granular policies.

DROP POLICY IF EXISTS "Authenticated users can CRUD orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can read orders" ON public.orders;

CREATE POLICY "Authenticated can view orders"
  ON public.orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Non-reporters can insert orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('Super Admin','Admin','Operator'));

CREATE POLICY "Non-reporters can update orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('Super Admin','Admin','Operator'))
  WITH CHECK (public.current_user_role() IN ('Super Admin','Admin','Operator'));

CREATE POLICY "Non-reporters can delete orders"
  ON public.orders FOR DELETE TO authenticated
  USING (public.current_user_role() IN ('Super Admin','Admin','Operator'));

DROP POLICY IF EXISTS "Authenticated users can CRUD devices" ON public.devices;
DROP POLICY IF EXISTS "Admins can manage all devices" ON public.devices;
DROP POLICY IF EXISTS "Authenticated users can manage any devices" ON public.devices;

CREATE POLICY "Authenticated can view devices"
  ON public.devices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Non-reporters can insert devices"
  ON public.devices FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('Super Admin','Admin','Operator'));

CREATE POLICY "Non-reporters can update devices"
  ON public.devices FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('Super Admin','Admin','Operator'))
  WITH CHECK (public.current_user_role() IN ('Super Admin','Admin','Operator'));

CREATE POLICY "Non-reporters can delete devices"
  ON public.devices FOR DELETE TO authenticated
  USING (public.current_user_role() IN ('Super Admin','Admin','Operator'));

-- Tighten asset_documents (Reporter can view but not modify)
DROP POLICY IF EXISTS "Authenticated can insert asset documents" ON public.asset_documents;
DROP POLICY IF EXISTS "Authenticated can delete asset documents" ON public.asset_documents;

CREATE POLICY "Non-reporters can insert asset documents"
  ON public.asset_documents FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('Super Admin','Admin','Operator'));

CREATE POLICY "Non-reporters can delete asset documents"
  ON public.asset_documents FOR DELETE TO authenticated
  USING (public.current_user_role() IN ('Super Admin','Admin','Operator'));

-- History: Reporter should not write
DROP POLICY IF EXISTS "Authenticated can manage edit history" ON public.history;

CREATE POLICY "Authenticated can view history"
  ON public.history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Non-reporters can insert history"
  ON public.history FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('Super Admin','Admin','Operator'));