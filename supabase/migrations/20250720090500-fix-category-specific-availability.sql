
-- Fix the trigger function to properly handle category-specific availability for recurring events
CREATE OR REPLACE FUNCTION public.update_occurrence_category_availability()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  ticket_change INTEGER := 0;
BEGIN
  -- Handle INSERT (new booking for recurring event)
  IF TG_OP = 'INSERT' AND NEW.event_occurrence_id IS NOT NULL AND NEW.occurrence_ticket_category_id IS NOT NULL THEN
    RAISE NOTICE 'INSERT trigger: Updating availability for category % with quantity %', NEW.occurrence_ticket_category_id, COALESCE(NEW.quantity, 1);
    
    -- Update the specific category availability
    UPDATE occurrence_ticket_categories 
    SET available_quantity = GREATEST(0, available_quantity - COALESCE(NEW.quantity, 1)),
        updated_at = NOW()
    WHERE id = NEW.occurrence_ticket_category_id;
    
    -- Also update the overall occurrence availability
    UPDATE event_occurrences
    SET available_tickets = GREATEST(0, available_tickets - COALESCE(NEW.quantity, 1)),
        updated_at = NOW()
    WHERE id = NEW.event_occurrence_id;
    
    RAISE NOTICE 'INSERT trigger: Updated category % and occurrence availability', NEW.occurrence_ticket_category_id;
    RETURN NEW;
  END IF;
  
  -- Handle DELETE (booking cancelled/deleted for recurring event)
  IF TG_OP = 'DELETE' AND OLD.event_occurrence_id IS NOT NULL AND OLD.occurrence_ticket_category_id IS NOT NULL THEN
    RAISE NOTICE 'DELETE trigger: Restoring availability for category % with quantity %', OLD.occurrence_ticket_category_id, COALESCE(OLD.quantity, 1);
    
    -- Restore the specific category availability
    UPDATE occurrence_ticket_categories 
    SET available_quantity = LEAST(total_quantity, available_quantity + COALESCE(OLD.quantity, 1)),
        updated_at = NOW()
    WHERE id = OLD.occurrence_ticket_category_id;
    
    -- Also update the overall occurrence availability
    UPDATE event_occurrences
    SET available_tickets = LEAST(total_tickets, available_tickets + COALESCE(OLD.quantity, 1)),
        updated_at = NOW()
    WHERE id = OLD.event_occurrence_id;
    
    RETURN OLD;
  END IF;
  
  -- Handle UPDATE (booking status change or quantity change for recurring event)
  IF TG_OP = 'UPDATE' AND NEW.event_occurrence_id IS NOT NULL AND NEW.occurrence_ticket_category_id IS NOT NULL THEN
    RAISE NOTICE 'UPDATE trigger: Processing status change from % to % for category %', OLD.status, NEW.status, NEW.occurrence_ticket_category_id;
    
    -- Calculate the change in ticket count based on status changes
    IF OLD.status != 'Confirmed' AND NEW.status = 'Confirmed' THEN
      -- Booking is being confirmed, reduce availability
      ticket_change := -COALESCE(NEW.quantity, 1);
    ELSIF OLD.status = 'Confirmed' AND NEW.status != 'Confirmed' THEN
      -- Booking is being cancelled/refunded, increase availability
      ticket_change := COALESCE(OLD.quantity, 1);
    ELSIF OLD.status = 'Confirmed' AND NEW.status = 'Confirmed' THEN
      -- Quantity change on confirmed booking
      ticket_change := COALESCE(OLD.quantity, 1) - COALESCE(NEW.quantity, 1);
    END IF;
    
    IF ticket_change != 0 THEN
      RAISE NOTICE 'UPDATE trigger: Applying ticket change % to category %', ticket_change, NEW.occurrence_ticket_category_id;
      
      -- Update the specific category availability
      UPDATE occurrence_ticket_categories 
      SET available_quantity = GREATEST(0, LEAST(total_quantity, available_quantity + ticket_change)),
          updated_at = NOW()
      WHERE id = NEW.occurrence_ticket_category_id;
      
      -- Also update the overall occurrence availability
      UPDATE event_occurrences
      SET available_tickets = GREATEST(0, LEAST(total_tickets, available_tickets + ticket_change)),
          updated_at = NOW()
      WHERE id = NEW.event_occurrence_id;
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Recreate the trigger to ensure it's working properly
DROP TRIGGER IF EXISTS update_occurrence_category_availability_trigger ON bookings;
CREATE TRIGGER update_occurrence_category_availability_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_occurrence_category_availability();

-- Fix any existing availability discrepancies by recalculating based on actual bookings
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

-- Also fix the overall occurrence availability
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
