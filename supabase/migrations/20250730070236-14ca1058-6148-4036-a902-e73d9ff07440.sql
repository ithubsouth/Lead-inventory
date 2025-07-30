-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_type TEXT NOT NULL CHECK (order_type IN ('Inward', 'Outward')),
  product TEXT NOT NULL CHECK (product IN ('Tablet', 'TV')),
  model TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  warehouse TEXT NOT NULL,
  serial_numbers TEXT[] NOT NULL DEFAULT '{}',
  order_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sales_order TEXT NOT NULL,
  school_name TEXT,
  deal_id TEXT,
  nucleus_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  last_modified_by UUID
);

-- Create devices table
CREATE TABLE public.devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product TEXT NOT NULL CHECK (product IN ('Tablet', 'TV')),
  model TEXT NOT NULL,
  serial_number TEXT NOT NULL UNIQUE,
  warehouse TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Available', 'Assigned', 'Maintenance')) DEFAULT 'Available',
  order_id UUID REFERENCES public.orders(id),
  sales_order TEXT,
  school_name TEXT,
  nucleus_id TEXT,
  profile_id TEXT,
  sd_card_size TEXT,
  deal_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  last_modified_by UUID
);

-- Enable Row Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Create policies for orders (allowing all operations for now)
CREATE POLICY "Allow all operations on orders" 
ON public.orders 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create policies for devices (allowing all operations for now)
CREATE POLICY "Allow all operations on devices" 
ON public.devices 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON public.devices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_orders_sales_order ON public.orders(sales_order);
CREATE INDEX idx_orders_deal_id ON public.orders(deal_id);
CREATE INDEX idx_orders_order_date ON public.orders(order_date);
CREATE INDEX idx_orders_is_deleted ON public.orders(is_deleted);

CREATE INDEX idx_devices_serial_number ON public.devices(serial_number);
CREATE INDEX idx_devices_order_id ON public.devices(order_id);
CREATE INDEX idx_devices_sales_order ON public.devices(sales_order);
CREATE INDEX idx_devices_status ON public.devices(status);
CREATE INDEX idx_devices_is_deleted ON public.devices(is_deleted);