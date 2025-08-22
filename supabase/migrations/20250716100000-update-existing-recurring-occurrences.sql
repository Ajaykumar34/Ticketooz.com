-- Function to update existing recurring event occurrences with correct ticket quantities
CREATE OR REPLACE FUNCTION update_recurring_event_occurrences(p_event_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_capacity INTEGER := 0;
  occurrence_count INTEGER := 0;
BEGIN
  -- Calculate total capacity from event pricing
  SELECT COALESCE(SUM(quantity), 100) INTO total_capacity
  FROM event_pricing 
  WHERE event_id = p_event_id AND is_active = true;
  
  -- If no pricing found, try to get from ticket categories (legacy)
  IF total_capacity = 0 OR total_capacity IS NULL THEN
    total_capacity := 100; -- Default fallback
  END IF;
  
  -- Update all future occurrences for this event
  UPDATE event_occurrences 
  SET 
    total_tickets = total_capacity,
    available_tickets = total_capacity,
    max_capacity = total_capacity,
    updated_at = NOW()
  WHERE event_id = p_event_id 
    AND occurrence_date >= CURRENT_DATE
    AND is_active = true;
  
  -- Get count of updated occurrences
  GET DIAGNOSTICS occurrence_count = ROW_COUNT;
  
  RETURN occurrence_count;
END;
$$ LANGUAGE plpgsql;

-- Update the existing event's occurrences
SELECT update_recurring_event_occurrences('b7d35830-6470-4237-aedc-18ee40fab234'::UUID);