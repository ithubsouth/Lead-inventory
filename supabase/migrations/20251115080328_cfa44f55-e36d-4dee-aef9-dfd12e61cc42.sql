-- Add audit history table for tracking asset check changes
CREATE TABLE IF NOT EXISTS public.audit_check_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  serial_number TEXT NOT NULL,
  old_asset_check TEXT,
  new_asset_check TEXT NOT NULL,
  audited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  audited_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_check_history ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing audit history
CREATE POLICY "Allow all to view audit history"
  ON public.audit_check_history
  FOR SELECT
  USING (true);

-- Create policy for inserting audit history
CREATE POLICY "Allow authenticated to insert audit history"
  ON public.audit_check_history
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_audit_check_history_serial ON public.audit_check_history(serial_number);
CREATE INDEX IF NOT EXISTS idx_audit_check_history_device ON public.audit_check_history(device_id);

-- SD Cards default to NFA asset_group
-- Update existing SD Card devices to have asset_group = 'NFA' if null
UPDATE public.devices
SET asset_group = 'NFA'
WHERE asset_type = 'SD Card' AND (asset_group IS NULL OR asset_group = '');

COMMENT ON TABLE public.audit_check_history IS 'Tracks asset check changes for audit purposes';
COMMENT ON COLUMN public.audit_check_history.old_asset_check IS 'Previous asset check status';
COMMENT ON COLUMN public.audit_check_history.new_asset_check IS 'New asset check status';
COMMENT ON COLUMN public.audit_check_history.audited_by IS 'Email of user who made the change';