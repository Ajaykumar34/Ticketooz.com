
-- Create function to get next available date for recurring events
CREATE OR REPLACE FUNCTION public.get_next_available_date(
  event_start_date DATE,
  event_end_date DATE,
  recurrence_type TEXT,
  event_time TIME,
  event_expiry_minutes INTEGER DEFAULT 60
) RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
AS $$
DECLARE
  next_date DATE;
  next_datetime TIMESTAMPTZ;
BEGIN
  -- Start from today or event start date, whichever is later
  next_date := GREATEST(CURRENT_DATE, event_start_date);
  
  -- Loop through dates based on recurrence type
  WHILE next_date <= event_end_date LOOP
    next_datetime := next_date + event_time;
    
    -- Check if this datetime is in the future and not expired
    IF next_datetime > NOW() + INTERVAL '1 minute' * event_expiry_minutes THEN
      RETURN next_datetime;
    END IF;
    
    -- Move to next occurrence
    CASE LOWER(recurrence_type)
      WHEN 'daily' THEN next_date := next_date + INTERVAL '1 day';
      WHEN 'weekly' THEN next_date := next_date + INTERVAL '1 week';
      WHEN 'monthly' THEN next_date := next_date + INTERVAL '1 month';
      ELSE next_date := next_date + INTERVAL '1 day';
    END CASE;
  END LOOP;
  
  RETURN NULL;
END;
$$;

-- Create function to check if event is bookable
CREATE OR REPLACE FUNCTION public.is_event_bookable(
  event_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  event_record RECORD;
  next_available TIMESTAMPTZ;
BEGIN
  -- Get event details
  SELECT * INTO event_record
  FROM events e
  WHERE e.id = event_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- For recurring events, check if there's a next available date
  IF event_record.is_recurring THEN
    SELECT get_next_available_date(
      event_record.start_datetime::DATE,
      COALESCE(event_record.recurrence_end_date, event_record.start_datetime::DATE + INTERVAL '30 days'),
      event_record.recurrence_type,
      event_record.start_datetime::TIME,
      COALESCE(event_record.event_expiry_minutes, 60)
    ) INTO next_available;
    
    RETURN next_available IS NOT NULL;
  ELSE
    -- For non-recurring events, check if event is in the future
    RETURN event_record.start_datetime > NOW();
  END IF;
END;
$$;

-- Generate occurrences for existing recurring events that don't have any
DO $$
DECLARE
  event_rec RECORD;
  occurrence_count INTEGER;
BEGIN
  FOR event_rec IN 
    SELECT e.* 
    FROM events e 
    LEFT JOIN event_occurrences eo ON e.id = eo.event_id
    WHERE e.is_recurring = true 
      AND eo.id IS NULL
      AND e.recurrence_end_date >= CURRENT_DATE
  LOOP
    SELECT generate_recurring_occurrences(
      event_rec.id,
      event_rec.start_datetime::DATE,
      COALESCE(event_rec.recurrence_end_date, event_rec.start_datetime::DATE + INTERVAL '30 days'),
      event_rec.recurrence_type,
      event_rec.start_datetime::TIME,
      100 -- Default total tickets
    ) INTO occurrence_count;
    
    RAISE NOTICE 'Generated % occurrences for event %', occurrence_count, event_rec.name;
  END LOOP;
END;
$$;
