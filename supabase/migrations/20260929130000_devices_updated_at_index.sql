-- Speeds up the incremental "what changed since last sync" query used by the
-- Devices / Order Summary / Audit tabs.
CREATE INDEX IF NOT EXISTS idx_devices_updated_at ON public.devices (updated_at);
