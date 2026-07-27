ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS grn_number text;

ALTER TABLE public.requests REPLICA IDENTITY FULL;
ALTER TABLE public.request_stages REPLICA IDENTITY FULL;
ALTER TABLE public.request_serials REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.requests'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.request_stages'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.request_serials'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications'; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;