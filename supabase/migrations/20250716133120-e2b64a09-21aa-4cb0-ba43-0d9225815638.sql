-- Create function to update occurrence ticket category availability when bookings are made
CREATE OR REPLACE FUNCTION public.update_occurrence_category_availability()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  category_id UUID;
  ticket_change INTEGER := 0;
BEGIN
  -- Handle INSERT (new booking)
  IF TG_OP = 'INSERT' AND NEW.event_occurrence_id IS NOT NULL AND NEW.occurrence_ticket_category_id IS NOT NULL THEN
    UPDATE occurrence_ticket_categories 
    SET available_quantity = GREATEST(0, available_quantity - COALESCE(NEW.quantity, 1)),
        updated_at = NOW()
    WHERE id = NEW.occurrence_ticket_category_id;
    RETURN NEW;
  END IF;
  
  -- Handle DELETE (booking cancelled/deleted)
  IF TG_OP = 'DELETE' AND OLD.event_occurrence_id IS NOT NULL AND OLD.occurrence_ticket_category_id IS NOT NULL THEN
    UPDATE occurrence_ticket_categories 
    SET available_quantity = LEAST(total_quantity, available_quantity + COALESCE(OLD.quantity, 1)),
        updated_at = NOW()
    WHERE id = OLD.occurrence_ticket_category_id;
    RETURN OLD;
  END IF;
  
  -- Handle UPDATE (booking status change or quantity change)
  IF TG_OP = 'UPDATE' AND NEW.event_occurrence_id IS NOT NULL AND NEW.occurrence_ticket_category_id IS NOT NULL THEN
    -- Calculate the change in ticket count
    IF OLD.status != 'Confirmed' AND NEW.status = 'Confirmed' THEN
      ticket_change := -COALESCE(NEW.quantity, 1);
    ELSIF OLD.status = 'Confirmed' AND NEW.status != 'Confirmed' THEN
      ticket_change := COALESCE(OLD.quantity, 1);
    ELSIF OLD.status = 'Confirmed' AND NEW.status = 'Confirmed' THEN
      ticket_change := COALESCE(OLD.quantity, 1) - COALESCE(NEW.quantity, 1);
    END IF;
    
    IF ticket_change != 0 THEN
      UPDATE occurrence_ticket_categories 
      SET available_quantity = GREATEST(0, LEAST(total_quantity, available_quantity + ticket_change)),
          updated_at = NOW()
      WHERE id = NEW.occurrence_ticket_category_id;
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create trigger for bookings table to update occurrence ticket category availability
DROP TRIGGER IF EXISTS update_occurrence_category_availability_trigger ON bookings;
CREATE TRIGGER update_occurrence_category_availability_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_occurrence_category_availability();