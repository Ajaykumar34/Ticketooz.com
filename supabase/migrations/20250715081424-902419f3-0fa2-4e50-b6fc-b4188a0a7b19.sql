
-- Drop the conflicting function and create a new one with a clear signature
DROP FUNCTION IF EXISTS generate_event_occurrences(uuid, date, date, text, time, integer);
DROP FUNCTION IF EXISTS generate_event_occurrences(uuid, date, date, date, text, time, integer);

-- Create the enhanced function with a unique name to avoid conflicts
CREATE OR REPLACE FUNCTION generate_enhanced_event_occurrences(
  p_event_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_pattern TEXT DEFAULT 'DAILY'
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
        100, -- Default total tickets
        100, -- Default available tickets
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
