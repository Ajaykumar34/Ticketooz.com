
-- Function to generate recurring occurrences
CREATE OR REPLACE FUNCTION generate_recurring_occurrences(
  p_event_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_recurrence_type TEXT,
  p_start_time TIME,
  p_total_tickets INTEGER DEFAULT 100
)
RETURNS INTEGER AS $$
DECLARE
  current_date DATE := p_start_date;
  occurrence_count INTEGER := 0;
BEGIN
  -- Delete existing future occurrences for this event
  DELETE FROM event_occurrences 
  WHERE event_id = p_event_id 
    AND occurrence_date >= CURRENT_DATE;

  WHILE current_date <= p_end_date LOOP
    -- Only insert future dates
    IF current_date >= CURRENT_DATE THEN
      INSERT INTO event_occurrences (
        event_id, 
        occurrence_date, 
        occurrence_time, 
        total_tickets, 
        available_tickets, 
        is_active
      )
      VALUES (
        p_event_id, 
        current_date, 
        p_start_time, 
        p_total_tickets,
        p_total_tickets,
        true
      )
      ON CONFLICT (event_id, occurrence_date) DO NOTHING;
      
      occurrence_count := occurrence_count + 1;
    END IF;

    -- Move to next occurrence based on pattern
    CASE UPPER(p_recurrence_type)
      WHEN 'DAILY' THEN
        current_date := current_date + INTERVAL '1 day';
      WHEN 'WEEKLY' THEN
        current_date := current_date + INTERVAL '1 week';
      WHEN 'MONTHLY' THEN
        current_date := current_date + INTERVAL '1 month';
      ELSE
        -- For non-recurring events, just exit after first iteration
        EXIT;
    END CASE;
  END LOOP;

  RETURN occurrence_count;
END;
$$ LANGUAGE plpgsql;

-- Generate occurrences for all existing recurring events that don't have any
DO $$
DECLARE
  event_rec RECORD;
  occurrence_count INTEGER;
  end_date DATE;
BEGIN
  FOR event_rec IN 
    SELECT e.* 
    FROM events e 
    LEFT JOIN event_occurrences eo ON e.id = eo.event_id
    WHERE e.is_recurring = true 
      AND eo.id IS NULL
  LOOP
    -- Calculate end date (30 days from start if no recurrence_end_date)
    end_date := COALESCE(event_rec.recurrence_end_date::DATE, event_rec.start_datetime::DATE + INTERVAL '30 days');
    
    SELECT generate_recurring_occurrences(
      event_rec.id,
      event_rec.start_datetime::DATE,
      end_date,
      event_rec.recurrence_type,
      event_rec.start_datetime::TIME,
      100 -- Default total tickets
    ) INTO occurrence_count;
    
    RAISE NOTICE 'Generated % occurrences for event %', occurrence_count, event_rec.name;
  END LOOP;
END;
$$;
