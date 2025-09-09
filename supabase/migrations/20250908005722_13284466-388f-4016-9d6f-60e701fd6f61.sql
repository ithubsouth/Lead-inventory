-- Add asset_status to devices and orders tables
ALTER TABLE public.devices 
ADD COLUMN IF NOT EXISTS asset_status text DEFAULT 'Fresh';

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS asset_status text DEFAULT 'Fresh';

-- Add configuration fields to devices and orders
ALTER TABLE public.devices 
ADD COLUMN IF NOT EXISTS configuration text;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS configuration text;

-- Add product field to devices and orders (like Lead, Propel, etc.)
ALTER TABLE public.devices 
ADD COLUMN IF NOT EXISTS product_type text DEFAULT 'Lead';

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS product_type text DEFAULT 'Lead';

-- Create history table to track all changes
CREATE TABLE IF NOT EXISTS public.history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  operation text NOT NULL, -- INSERT, UPDATE, DELETE
  old_data jsonb,
  new_data jsonb,
  changed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on history table
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;

-- Create policies for history table
CREATE POLICY "Users can view history" 
ON public.history 
FOR SELECT 
USING (true);

CREATE POLICY "System can insert history" 
ON public.history 
FOR INSERT 
WITH CHECK (true);

-- Create history trigger function
CREATE OR REPLACE FUNCTION public.log_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.history (table_name, record_id, operation, old_data, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), auth.uid());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.history (table_name, record_id, operation, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO public.history (table_name, record_id, operation, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(NEW), auth.uid());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

-- Add history triggers to devices and orders tables
CREATE TRIGGER devices_history_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.devices
    FOR EACH ROW EXECUTE FUNCTION public.log_history();

CREATE TRIGGER orders_history_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.log_history();

CREATE TRIGGER users_history_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.log_history();