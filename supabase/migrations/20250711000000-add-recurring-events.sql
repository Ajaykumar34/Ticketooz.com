
-- Add columns for recurring event functionality
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_type TEXT CHECK (recurrence_type IN ('none', 'daily', 'weekly', 'monthly', 'custom'));
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_pattern JSONB DEFAULT '{}';
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_expiry_minutes INTEGER DEFAULT 60;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;

-- Update existing events to have default values
UPDATE events SET 
  recurrence_type = 'none',
  is_recurring = false,
  event_expiry_minutes = 60
WHERE recurrence_type IS NULL;

-- Create function to get next available date for recurring events
CREATE OR REPLACE FUNCTION get_next_available_date(
  event_start_date DATE,
  event_end_date DATE,
  recurrence_type TEXT,
  event_time TIME,
  event_expiry_minutes INTEGER DEFAULT 60
) RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
AS $$
DECLARE
  current_date DATE;
  next_date DATE;
  event_datetime TIMESTAMP WITH TIME ZONE;
  expiry_datetime TIMESTAMP WITH TIME ZONE;
  now_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
  now_timestamp := NOW();
  current_date := CURRENT_DATE;
  
  -- Start from the event start date or current date, whichever is later
  IF current_date > event_start_date THEN
    next_date := current_date;
  ELSE
    next_date := event_start_date;
  END IF;
  
  -- Loop through dates to find the next available one
  WHILE next_date <= event_end_date LOOP
    -- Create the full datetime for this occurrence
    event_datetime := next_date + event_time;
    expiry_datetime := event_datetime - (event_expiry_minutes || ' minutes')::INTERVAL;
    
    -- If we haven't passed the expiry time for this occurrence, return it
    IF now_timestamp < expiry_datetime THEN
      RETURN event_datetime;
    END IF;
    
    -- Move to next occurrence based on recurrence type
    CASE recurrence_type
      WHEN 'daily' THEN
        next_date := next_date + INTERVAL '1 day';
      WHEN 'weekly' THEN
        next_date := next_date + INTERVAL '7 days';
      WHEN 'monthly' THEN
        next_date := next_date + INTERVAL '1 month';
      ELSE
        -- For 'none' or unknown types, just increment by 1 day
        next_date := next_date + INTERVAL '1 day';
    END CASE;
  END LOOP;
  
  -- No more available dates
  RETURN NULL;
END;
$$;

-- Create function to check if an event is currently bookable
CREATE OR REPLACE FUNCTION is_event_bookable(
  event_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  event_record RECORD;
  next_available_date TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT * INTO event_record FROM events WHERE id = event_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- For non-recurring events, use existing logic
  IF NOT event_record.is_recurring THEN
    RETURN NOW() >= event_record.sale_start AND NOW() <= event_record.sale_end;
  END IF;
  
  -- For recurring events, check if there's a next available date
  next_available_date := get_next_available_date(
    event_record.start_datetime::DATE,
    event_record.recurrence_end_date::DATE,
    event_record.recurrence_type,
    event_record.start_datetime::TIME,
    event_record.event_expiry_minutes
  );
  
  RETURN next_available_date IS NOT NULL;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_recurring ON events(is_recurring, recurrence_type, start_datetime);
CREATE INDEX IF NOT EXISTS idx_events_recurrence_end ON events(recurrence_end_date);
