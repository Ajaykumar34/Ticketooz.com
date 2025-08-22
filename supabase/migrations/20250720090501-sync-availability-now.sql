-- Force sync of all occurrence ticket categories with actual booking data
-- This will fix any current discrepancies and ensure accurate availability

-- Update occurrence_ticket_categories with correct availability based on actual bookings
UPDATE occurrence_ticket_categories 
SET available_quantity = (
  SELECT GREATEST(0, otc.total_quantity - COALESCE(SUM(b.quantity), 0))
  FROM occurrence_ticket_categories otc
  LEFT JOIN bookings b ON b.occurrence_ticket_category_id = otc.id 
    AND b.status = 'Confirmed'
  WHERE otc.id = occurrence_ticket_categories.id
  GROUP BY otc.id, otc.total_quantity
),
updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM event_occurrences eo 
  WHERE eo.id = occurrence_ticket_categories.occurrence_id
);

-- Also update the overall occurrence availability to match
UPDATE event_occurrences
SET available_tickets = (
  SELECT GREATEST(0, eo.total_tickets - COALESCE(SUM(b.quantity), 0))
  FROM event_occurrences eo
  LEFT JOIN bookings b ON b.event_occurrence_id = eo.id 
    AND b.status = 'Confirmed'
  WHERE eo.id = event_occurrences.id
  GROUP BY eo.id, eo.total_tickets
),
updated_at = NOW();

-- Log the sync operation
INSERT INTO public.system_logs (message, created_at) 
VALUES ('Synced occurrence ticket availability with actual bookings', NOW())
ON CONFLICT DO NOTHING;