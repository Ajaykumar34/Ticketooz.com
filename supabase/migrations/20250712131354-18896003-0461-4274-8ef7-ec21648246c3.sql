
-- Add recurring event fields to existing events table if not already present
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_type TEXT CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'custom')),
ADD COLUMN IF NOT EXISTS recurrence_end_date DATE,
ADD COLUMN IF NOT EXISTS event_expiry_minutes INTEGER DEFAULT 60;

-- Create event_occurrences table for managing individual occurrences
CREATE TABLE IF NOT EXISTS event_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  occurrence_date DATE NOT NULL,
  occurrence_time TIME NOT NULL,
  total_tickets INTEGER DEFAULT 100,
  available_tickets INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_id, occurrence_date)
);

-- Enable RLS on event_occurrences
ALTER TABLE event_occurrences ENABLE ROW LEVEL SECURITY;

-- Create policies for event_occurrences
CREATE POLICY "Public read access to event_occurrences" 
ON event_occurrences FOR SELECT 
USING (true);

CREATE POLICY "Admin full access on event_occurrences" 
ON event_occurrences FOR ALL 
USING (true) 
WITH CHECK (true);

-- Function to generate recurring event occurrences
CREATE OR REPLACE FUNCTION generate_event_occurrences(p_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  event_row RECORD;
  current_date DATE;
  occurrence_time TIME;
BEGIN
  -- Get event details
  SELECT * INTO event_row FROM events WHERE id = p_event_id;
  
  -- Extract time from start_datetime
  occurrence_time := event_row.start_datetime::TIME;
  
  -- If not recurring, create single occurrence
  IF event_row.is_recurring IS FALSE OR event_row.is_recurring IS NULL THEN
    INSERT INTO event_occurrences (event_id, occurrence_date, occurrence_time, total_tickets, available_tickets)
    VALUES (event_row.id, event_row.start_datetime::DATE, occurrence_time, 100, 100)
    ON CONFLICT (event_id, occurrence_date) DO NOTHING;
    RETURN;
  END IF;

  -- Generate recurring occurrences
  current_date := event_row.start_datetime::DATE;
  
  WHILE current_date <= COALESCE(event_row.recurrence_end_date, event_row.start_datetime::DATE + INTERVAL '1 year') LOOP
    INSERT INTO event_occurrences (event_id, occurrence_date, occurrence_time, total_tickets, available_tickets)
    VALUES (event_row.id, current_date, occurrence_time, 100, 100)
    ON CONFLICT (event_id, occurrence_date) DO NOTHING;

    -- Increment based on recurrence type
    IF event_row.recurrence_type = 'daily' THEN
      current_date := current_date + INTERVAL '1 day';
    ELSIF event_row.recurrence_type = 'weekly' THEN
      current_date := current_date + INTERVAL '7 days';
    ELSIF event_row.recurrence_type = 'monthly' THEN
      current_date := current_date + INTERVAL '1 month';
    ELSE
      EXIT; -- Exit for custom or unknown types
    END IF;
  END LOOP;
END;
$$;

-- Function to get next available date for recurring events
CREATE OR REPLACE FUNCTION get_next_available_date(
  event_start_date DATE,
  event_end_date DATE,
  recurrence_type TEXT,
  event_time TIME,
  event_expiry_minutes INTEGER DEFAULT 60
)
RETURNS DATE
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  current_date DATE;
  check_datetime TIMESTAMP WITH TIME ZONE;
  expiry_datetime TIMESTAMP WITH TIME ZONE;
BEGIN
  current_date := GREATEST(event_start_date, CURRENT_DATE);
  
  WHILE current_date <= event_end_date LOOP
    -- Combine date and time
    check_datetime := current_date + event_time;
    expiry_datetime := check_datetime + (event_expiry_minutes || ' minutes')::INTERVAL;
    
    -- Check if this occurrence is still bookable (not expired)
    IF expiry_datetime > NOW() THEN
      RETURN current_date;
    END IF;
    
    -- Move to next occurrence based on recurrence type
    IF recurrence_type = 'daily' THEN
      current_date := current_date + INTERVAL '1 day';
    ELSIF recurrence_type = 'weekly' THEN
      current_date := current_date + INTERVAL '7 days';
    ELSIF recurrence_type = 'monthly' THEN
      current_date := current_date + INTERVAL '1 month';
    ELSE
      EXIT;
    END IF;
  END LOOP;
  
  RETURN NULL; -- No available dates found
END;
$$;

-- Function to check if an event is currently bookable
CREATE OR REPLACE FUNCTION is_event_bookable(event_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  event_row RECORD;
  next_date DATE;
BEGIN
  -- Get event details
  SELECT * INTO event_row FROM events WHERE id = event_id;
  
  -- For non-recurring events, check if not expired
  IF event_row.is_recurring IS FALSE OR event_row.is_recurring IS NULL THEN
    RETURN event_row.start_datetime + 
           (COALESCE(event_row.event_expiry_minutes, 60) || ' minutes')::INTERVAL > NOW();
  END IF;
  
  -- For recurring events, check if there's a next available date
  next_date := get_next_available_date(
    event_row.start_datetime::DATE,
    COALESCE(event_row.recurrence_end_date, event_row.start_datetime::DATE + INTERVAL '1 year'),
    event_row.recurrence_type,
    event_row.start_datetime::TIME,
    COALESCE(event_row.event_expiry_minutes, 60)
  );
  
  RETURN next_date IS NOT NULL;
END;
$$;

-- Trigger to auto-generate occurrences when events are created/updated
CREATE OR REPLACE FUNCTION trigger_generate_occurrences()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Generate occurrences for the event
  PERFORM generate_event_occurrences(NEW.id);
  RETURN NEW;
END;
$$;

-- Create trigger for new events
DROP TRIGGER IF EXISTS auto_generate_occurrences ON events;
CREATE TRIGGER auto_generate_occurrences
  AFTER INSERT OR UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_occurrences();
