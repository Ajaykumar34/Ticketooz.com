
-- Check if occurrences exist for the recurring event
SELECT 
  e.id,
  e.name,
  e.is_recurring,
  e.recurrence_type,
  e.start_datetime,
  e.recurrence_end_date,
  COUNT(eo.id) as occurrence_count
FROM events e
LEFT JOIN event_occurrences eo ON e.id = eo.event_id
WHERE e.id = '7f7cfe9a-d5c6-437d-b40f-3bdccccab620'
GROUP BY e.id, e.name, e.is_recurring, e.recurrence_type, e.start_datetime, e.recurrence_end_date;

-- Generate occurrences for this specific recurring event if none exist
DO $$
DECLARE
  event_record RECORD;
  occurrence_count INTEGER;
  end_date DATE;
BEGIN
  -- Get the event details
  SELECT * INTO event_record 
  FROM events 
  WHERE id = '7f7cfe9a-d5c6-437d-b40f-3bdccccab620'
    AND is_recurring = true;
  
  IF FOUND THEN
    -- Calculate end date (use recurrence_end_date or default to 30 days from start)
    end_date := COALESCE(
      event_record.recurrence_end_date::DATE, 
      event_record.start_datetime::DATE + INTERVAL '30 days'
    );
    
    -- Generate occurrences using the existing function
    SELECT generate_recurring_occurrences(
      event_record.id,
      event_record.start_datetime::DATE,
      end_date,
      event_record.recurrence_type,
      event_record.start_datetime::TIME,
      100 -- Default total tickets
    ) INTO occurrence_count;
    
    RAISE NOTICE 'Generated % occurrences for recurring event %', occurrence_count, event_record.name;
  ELSE
    RAISE NOTICE 'Event not found or not recurring';
  END IF;
END;
$$;

-- Verify occurrences were created
SELECT 
  eo.id,
  eo.occurrence_date,
  eo.occurrence_time,
  eo.total_tickets,
  eo.available_tickets,
  eo.is_active
FROM event_occurrences eo
WHERE eo.event_id = '7f7cfe9a-d5c6-437d-b40f-3bdccccab620'
  AND eo.occurrence_date >= CURRENT_DATE
ORDER BY eo.occurrence_date, eo.occurrence_time;
