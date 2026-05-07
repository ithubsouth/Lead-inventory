-- Documents per device asset
CREATE TABLE IF NOT EXISTS public.asset_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL,
  serial_number TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT,
  uploaded_by TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asset_documents_device ON public.asset_documents(device_id);
CREATE INDEX IF NOT EXISTS idx_asset_documents_serial ON public.asset_documents(serial_number);
CREATE INDEX IF NOT EXISTS idx_asset_documents_uploaded_at ON public.asset_documents(uploaded_at DESC);

ALTER TABLE public.asset_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view asset documents"
  ON public.asset_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert asset documents"
  ON public.asset_documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can delete asset documents"
  ON public.asset_documents FOR DELETE TO authenticated USING (true);

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('asset-documents', 'asset-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated can read asset-documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'asset-documents');
CREATE POLICY "Authenticated can upload asset-documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'asset-documents');
CREATE POLICY "Authenticated can delete asset-documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'asset-documents');

-- Ensure history triggers exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'devices_history_trigger') THEN
    CREATE TRIGGER devices_history_trigger
      AFTER INSERT OR UPDATE OR DELETE ON public.devices
      FOR EACH ROW EXECUTE FUNCTION public.log_history();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'orders_history_trigger') THEN
    CREATE TRIGGER orders_history_trigger
      AFTER INSERT OR UPDATE OR DELETE ON public.orders
      FOR EACH ROW EXECUTE FUNCTION public.log_history();
  END IF;
END $$;