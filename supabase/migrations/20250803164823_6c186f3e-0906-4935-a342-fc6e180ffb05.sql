-- Remove unique constraint on serial_number to allow reuse across multiple orders
ALTER TABLE public.devices DROP CONSTRAINT IF EXISTS devices_serial_number_key;