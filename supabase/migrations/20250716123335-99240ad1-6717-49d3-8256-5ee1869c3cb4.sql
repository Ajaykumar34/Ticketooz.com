
-- Add a new table to store ticket categories specific to each event occurrence
CREATE TABLE IF NOT EXISTS public.occurrence_ticket_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  occurrence_id UUID NOT NULL REFERENCES public.event_occurrences(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  base_price NUMERIC NOT NULL DEFAULT 0,
  convenience_fee NUMERIC NOT NULL DEFAULT 0,
  commission NUMERIC NOT NULL DEFAULT 0,
  available_quantity INTEGER NOT NULL DEFAULT 0,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  seat_category_id UUID REFERENCES public.seat_categories(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(occurrence_id, category_name)
);

-- Enable RLS
ALTER TABLE public.occurrence_ticket_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admin full access on occurrence_ticket_categories" 
ON public.occurrence_ticket_categories 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Public read access to occurrence_ticket_categories" 
ON public.occurrence_ticket_categories 
FOR SELECT 
USING (true);

-- Add trigger for updated_at
CREATE OR REPLACE TRIGGER trigger_occurrence_ticket_categories_updated_at
  BEFORE UPDATE ON public.occurrence_ticket_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- Update bookings table to reference occurrence ticket categories
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS occurrence_ticket_category_id UUID REFERENCES public.occurrence_ticket_categories(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_occurrence_ticket_categories_occurrence_id 
ON public.occurrence_ticket_categories(occurrence_id);

CREATE INDEX IF NOT EXISTS idx_occurrence_ticket_categories_active 
ON public.occurrence_ticket_categories(occurrence_id, is_active);

-- Function to automatically create default ticket categories for new occurrences
CREATE OR REPLACE FUNCTION public.create_default_occurrence_categories()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default General category for new occurrence
  INSERT INTO public.occurrence_ticket_categories (
    occurrence_id,
    category_name,
    base_price,
    convenience_fee,
    commission,
    available_quantity,
    total_quantity
  ) VALUES (
    NEW.id,
    'General',
    500,
    50,
    25,
    NEW.available_tickets,
    NEW.total_tickets
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create default categories
CREATE OR REPLACE TRIGGER trigger_create_default_occurrence_categories
  AFTER INSERT ON public.event_occurrences
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_occurrence_categories();

-- Function to update occurrence availability when ticket categories change
CREATE OR REPLACE FUNCTION public.update_occurrence_availability_from_categories()
RETURNS TRIGGER AS $$
DECLARE
  total_available INTEGER;
  total_capacity INTEGER;
BEGIN
  -- Calculate totals from all active categories for this occurrence
  SELECT 
    COALESCE(SUM(available_quantity), 0),
    COALESCE(SUM(total_quantity), 0)
  INTO total_available, total_capacity
  FROM public.occurrence_ticket_categories 
  WHERE occurrence_id = COALESCE(NEW.occurrence_id, OLD.occurrence_id)
    AND is_active = true;
  
  -- Update the occurrence
  UPDATE public.event_occurrences 
  SET 
    available_tickets = total_available,
    total_tickets = total_capacity,
    updated_at = now()
  WHERE id = COALESCE(NEW.occurrence_id, OLD.occurrence_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync occurrence availability
CREATE OR REPLACE TRIGGER trigger_sync_occurrence_availability
  AFTER INSERT OR UPDATE OR DELETE ON public.occurrence_ticket_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_occurrence_availability_from_categories();
