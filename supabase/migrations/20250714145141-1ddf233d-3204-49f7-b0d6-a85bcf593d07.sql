-- Add available_tickets column to event_seat_pricing for general admission events
ALTER TABLE public.event_seat_pricing 
ADD COLUMN IF NOT EXISTS available_tickets INTEGER DEFAULT 100;

-- Add comment to explain the column
COMMENT ON COLUMN public.event_seat_pricing.available_tickets IS 'Total available tickets for this seat category in general admission events';