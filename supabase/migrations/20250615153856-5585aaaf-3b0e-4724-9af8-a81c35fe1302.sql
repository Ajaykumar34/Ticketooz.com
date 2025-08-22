
-- Add event_id column to bookings and make it a foreign key to events(id)
ALTER TABLE public.bookings
ADD COLUMN event_id uuid REFERENCES public.events(id);

-- Optionally, update existing records if needed (set to NULL for existing)
