CREATE TABLE IF NOT EXISTS public.custom_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key text NOT NULL,
  value text NOT NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (field_key, value)
);

CREATE INDEX IF NOT EXISTS idx_custom_options_field ON public.custom_options(field_key);

ALTER TABLE public.custom_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view custom options"
  ON public.custom_options FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert custom options"
  ON public.custom_options FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can delete custom options"
  ON public.custom_options FOR DELETE TO authenticated
  USING (current_user_role() = ANY (ARRAY['Super Admin'::text, 'Admin'::text]));