
-- Enhanced function to generate event occurrences with more flexibility
CREATE OR REPLACE FUNCTION generate_event_occurrences(
  p_event_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_pattern TEXT DEFAULT 'DAILY',
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
        p_total_tickets, -- Use the provided total tickets
        p_total_tickets, -- Use the provided total tickets for available tickets initially
        true
      )
      ON CONFLICT (event_id, occurrence_date) DO NOTHING;
      
      occurrence_count := occurrence_count + 1;
    END IF;

    -- Move to next occurrence based on pattern
    CASE UPPER(p_pattern)
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

-- Add unique constraint to prevent duplicate occurrences
ALTER TABLE event_occurrences 
ADD CONSTRAINT unique_event_occurrence 
UNIQUE (event_id, occurrence_date);
