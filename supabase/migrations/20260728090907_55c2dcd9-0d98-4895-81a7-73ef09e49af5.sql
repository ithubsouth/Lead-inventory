ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS received_from text;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS ref_po text;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS ref_grn text;