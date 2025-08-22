
-- Add sold_out status tracking to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS sold_out_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_sold_out BOOLEAN DEFAULT FALSE;

-- Create a function to check and update sold out status
CREATE OR REPLACE FUNCTION check_event_sold_out_status(event_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    total_seats INTEGER := 0;
    booked_seats INTEGER := 0;
    event_end_time TIMESTAMP WITH TIME ZONE;
    is_expired BOOLEAN := FALSE;
BEGIN
    -- Get event end time
    SELECT end_datetime INTO event_end_time
    FROM events 
    WHERE id = event_uuid;
    
    -- Check if event has expired
    IF event_end_time < NOW() THEN
        -- Reset sold out status for expired events
        UPDATE events 
        SET is_sold_out = FALSE, sold_out_at = NULL 
        WHERE id = event_uuid;
        RETURN FALSE;
    END IF;
    
    -- Count total available seats for the event
    SELECT COUNT(s.id) INTO total_seats
    FROM seats s
    JOIN seat_layouts sl ON s.seat_layout_id = sl.id
    JOIN venues v ON sl.venue_id = v.id
    JOIN events e ON e.venue_id = v.id
    WHERE e.id = event_uuid 
    AND s.is_available = TRUE 
    AND s.is_blocked = FALSE;
    
    -- Count booked seats for the event
    SELECT COALESCE(SUM(b.quantity), 0) INTO booked_seats
    FROM bookings b
    WHERE b.event_id = event_uuid 
    AND b.status = 'Confirmed';
    
    -- Update sold out status
    IF total_seats > 0 AND booked_seats >= total_seats THEN
        UPDATE events 
        SET is_sold_out = TRUE, sold_out_at = COALESCE(sold_out_at, NOW())
        WHERE id = event_uuid AND is_sold_out = FALSE;
        RETURN TRUE;
    ELSE
        UPDATE events 
        SET is_sold_out = FALSE, sold_out_at = NULL
        WHERE id = event_uuid AND is_sold_out = TRUE;
        RETURN FALSE;
    END IF;
END;
$$;

-- Create a trigger to automatically check sold out status when bookings change
CREATE OR REPLACE FUNCTION trigger_check_sold_out_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check sold out status for the event
    PERFORM check_event_sold_out_status(
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.event_id
            ELSE NEW.event_id
        END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on bookings table
DROP TRIGGER IF EXISTS bookings_sold_out_check ON public.bookings;
CREATE TRIGGER bookings_sold_out_check
    AFTER INSERT OR UPDATE OR DELETE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_check_sold_out_status();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_sold_out ON public.events(is_sold_out, sold_out_at);
CREATE INDEX IF NOT EXISTS idx_bookings_event_status ON public.bookings(event_id, status);
