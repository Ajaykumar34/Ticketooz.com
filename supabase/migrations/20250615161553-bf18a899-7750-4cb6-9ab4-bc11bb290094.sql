
-- 1. Make sure `seat_categories` table is used for venue-level seat types.
-- (Already exists and is tied to venue_id.)

-- 2. Create a function that auto-creates 8 default categories when a new venue is inserted
CREATE OR REPLACE FUNCTION public.create_default_seat_categories_for_venue()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.seat_categories (venue_id, name, color, base_price, is_active)
  VALUES
    (NEW.id, 'General',    '#4ECDC4', 0, true),
    (NEW.id, 'VIP',        '#FFD700', 0, true),
    (NEW.id, 'Premium',    '#FF6B6B', 0, true),
    (NEW.id, 'Balcony',    '#45B7D1', 0, true),
    (NEW.id, 'Box',        '#96CEB4', 0, true),
    (NEW.id, 'Orchestra',  '#FFEAA7', 0, true),
    (NEW.id, 'Mezzanine',  '#DDA0DD', 0, true),
    (NEW.id, 'Economy',    '#98D8C8', 0, true);
  RETURN NEW;
END;
$$;

-- 3. Add a trigger so every new venue gets default categories automatically
DROP TRIGGER IF EXISTS trg_create_default_seat_categories ON public.venues;
CREATE TRIGGER trg_create_default_seat_categories
AFTER INSERT ON public.venues
FOR EACH ROW
EXECUTE PROCEDURE public.create_default_seat_categories_for_venue();

-- 4. Make sure event_seat_pricing table is ready for per-event, per-category pricing.
-- (Already exists: event_seat_pricing.event_id, seat_category_id, base_price, commission, convenience_fee)

-- 5. (Optional but recommended) Remove is_active=false seat categories from pricing selection logic (handled in code).

