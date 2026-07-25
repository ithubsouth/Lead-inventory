
-- Enable Realtime for request-related tables that are missing it
ALTER PUBLICATION supabase_realtime ADD TABLE public.request_serials;
ALTER PUBLICATION supabase_realtime ADD TABLE public.request_documents;

-- (Optional) Ensure other core tables are included if not already
-- orders and devices are usually already in or might be handled differently,
-- but let's make sure if they were missed.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'devices') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.devices;
  END IF;
END $$;
