
-- Create helper function to get event occurrence dates
CREATE OR REPLACE FUNCTION get_event_occurrence_dates(p_event_id UUID)
RETURNS TABLE(occurrence_date DATE)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT eo.occurrence_date
  FROM event_occurrences eo
  WHERE eo.event_id = p_event_id
    AND eo.is_active = true
    AND eo.occurrence_date >= CURRENT_DATE
  ORDER BY eo.occurrence_date;
END;
$$;
