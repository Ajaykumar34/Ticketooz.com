
-- Drop dependant tables first (foreign key order)
DROP TABLE IF EXISTS seat_reservations CASCADE;
DROP TABLE IF EXISTS venue_seats CASCADE;
DROP TABLE IF EXISTS event_pricing CASCADE;
DROP TABLE IF EXISTS seat_categories CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS venues CASCADE;

-- Remove any views or functions referencing events/venues
DROP FUNCTION IF EXISTS public.create_default_seat_categories CASCADE;
DROP FUNCTION IF EXISTS public.expire_old_events CASCADE;
DROP FUNCTION IF EXISTS public.trigger_expire_events CASCADE;
DROP FUNCTION IF EXISTS public.generate_event_id CASCADE;

-- Remove event_id_display column from other tables that might reference events
ALTER TABLE IF EXISTS bookings DROP COLUMN IF EXISTS event_id;
ALTER TABLE IF EXISTS booking_details DROP COLUMN IF EXISTS booking_id;
ALTER TABLE IF EXISTS booking_details DROP COLUMN IF EXISTS event_id;
-- Note: If any other tables reference events or venues, you may need to drop those columns or tables manually.
