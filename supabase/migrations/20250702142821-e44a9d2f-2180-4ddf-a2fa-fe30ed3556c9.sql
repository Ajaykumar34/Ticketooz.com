
-- First, let's ensure we have proper seat categories tied to events
-- Update the seat_categories table to support event-specific categories
ALTER TABLE public.seat_categories 
DROP CONSTRAINT IF EXISTS seat_categories_event_id_fkey;

-- Add foreign key constraint for event_id in seat_categories
ALTER TABLE public.seat_categories 
ADD CONSTRAINT seat_categories_event_id_fkey 
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

-- Update the trigger function to create 8 default seat categories for each new event
CREATE OR REPLACE FUNCTION public.create_default_seat_categories_for_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.seat_categories (event_id, name, color, base_price, is_active)
  VALUES
    (NEW.id, 'General', '#4ECDC4', 500, true),
    (NEW.id, 'VIP', '#FFD700', 1000, true),
    (NEW.id, 'Premium', '#FF6B6B', 750, true),
    (NEW.id, 'Balcony', '#45B7D1', 300, true),
    (NEW.id, 'Box', '#96CEB4', 600, true),
    (NEW.id, 'Orchestra', '#FFEAA7', 800, true),
    (NEW.id, 'Mezzanine', '#DDA0DD', 450, true),
    (NEW.id, 'Economy', '#98D8C8', 250, true);
  RETURN NEW;
END;
$$;

-- Create the trigger for new events
DROP TRIGGER IF EXISTS trg_create_default_seat_categories ON public.events;
CREATE TRIGGER trg_create_default_seat_categories
AFTER INSERT ON public.events
FOR EACH ROW
EXECUTE PROCEDURE public.create_default_seat_categories_for_event();

-- Ensure the event_seat_pricing table has proper foreign key constraints
ALTER TABLE public.event_seat_pricing 
DROP CONSTRAINT IF EXISTS event_seat_pricing_event_id_fkey;

ALTER TABLE public.event_seat_pricing 
ADD CONSTRAINT event_seat_pricing_event_id_fkey 
FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;

ALTER TABLE public.event_seat_pricing 
DROP CONSTRAINT IF EXISTS event_seat_pricing_seat_category_id_fkey;

ALTER TABLE public.event_seat_pricing 
ADD CONSTRAINT event_seat_pricing_seat_category_id_fkey 
FOREIGN KEY (seat_category_id) REFERENCES public.seat_categories(id) ON DELETE CASCADE;

-- Add unique constraint to prevent duplicate pricing entries
ALTER TABLE public.event_seat_pricing 
DROP CONSTRAINT IF EXISTS unique_event_category_pricing;

ALTER TABLE public.event_seat_pricing 
ADD CONSTRAINT unique_event_category_pricing 
UNIQUE (event_id, seat_category_id);
