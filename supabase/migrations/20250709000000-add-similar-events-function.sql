
-- RPC function to get similar events
CREATE OR REPLACE FUNCTION public.get_similar_events(
  p_event_id UUID,
  p_category TEXT,
  p_city TEXT,
  p_limit INT DEFAULT 6
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  start_datetime TIMESTAMPTZ,
  poster TEXT,
  category TEXT,
  sub_category TEXT,
  venue_name TEXT,
  venue_city TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.name,
    e.description,
    e.start_datetime,
    e.poster,
    e.category,
    e.sub_category,
    v.name as venue_name,
    v.city as venue_city
  FROM events e
  LEFT JOIN venues v ON e.venue_id = v.id
  WHERE 
    e.id != p_event_id
    AND e.category = p_category
    AND (v.city = p_city OR e.id IS NOT NULL)
    AND e.start_datetime >= NOW()
    AND e.status = 'Active'
  ORDER BY e.start_datetime ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_similar_events TO anon, authenticated;
