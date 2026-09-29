-- "Generate Asset Code" and final approval look up the highest far_code.
-- Without an index Postgres scans and sorts the whole devices table each time.
CREATE INDEX IF NOT EXISTS idx_devices_far_code ON public.devices (far_code DESC) WHERE far_code IS NOT NULL;
