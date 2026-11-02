ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS brand text;

ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS brand text;
