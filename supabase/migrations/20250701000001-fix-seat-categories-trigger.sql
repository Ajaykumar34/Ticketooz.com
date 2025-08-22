
-- Update the trigger function to create seat categories for events instead of venues
DROP FUNCTION IF EXISTS create_default_seat_categories_for_venue() CASCADE;
DROP FUNCTION IF EXISTS create_default_seat_categories_for_event() CASCADE;

-- Create function to add default seat categories for new events
CREATE OR REPLACE FUNCTION create_default_seat_categories_for_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.seat_categories (event_id, name, color, base_price, is_active)
  VALUES
    (NEW.id, 'General', '#4ECDC4', 500, true),
    (NEW.id, 'VIP', '#FFD700', 1000, true),
    (NEW.id, 'Premium', '#FF6B6B', 750, true),
    (NEW.id, 'Balcony', '#45B7D1', 300, true);
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create seat categories for new events
CREATE TRIGGER create_default_seat_categories
  AFTER INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION create_default_seat_categories_for_event();
