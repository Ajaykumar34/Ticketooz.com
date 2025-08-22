
-- Fix the trigger to ensure it only deducts from the specific category mentioned in the booking
CREATE OR REPLACE FUNCTION public.update_occurrence_category_availability()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  ticket_change INTEGER := 0;
  seat_numbers_data JSONB;
  quantity_from_seat_numbers INTEGER := 0;
BEGIN
  -- Handle INSERT (new booking for recurring event)
  IF TG_OP = 'INSERT' AND NEW.event_occurrence_id IS NOT NULL AND NEW.occurrence_ticket_category_id IS NOT NULL THEN
    RAISE NOTICE 'INSERT trigger: Updating availability for SPECIFIC category % with quantity %', NEW.occurrence_ticket_category_id, COALESCE(NEW.quantity, 1);
    
    -- Get quantity from seat_numbers if available and valid
    IF NEW.seat_numbers IS NOT NULL THEN
      BEGIN
        -- Convert to JSONB if it's JSON
        IF pg_typeof(NEW.seat_numbers) = 'json'::regtype THEN
          seat_numbers_data := NEW.seat_numbers::jsonb;
        ELSE
          seat_numbers_data := NEW.seat_numbers;
        END IF;
        
        -- Calculate quantity from seat_numbers array
        IF jsonb_typeof(seat_numbers_data) = 'array' THEN
          SELECT COALESCE(SUM(CASE 
            WHEN jsonb_typeof(elem->'quantity') = 'string' THEN 
              CAST(elem->>'quantity' AS INTEGER)
            WHEN jsonb_typeof(elem->'quantity') = 'number' THEN 
              CAST(elem->>'quantity' AS INTEGER)
            ELSE 1
          END), 0) INTO quantity_from_seat_numbers
          FROM jsonb_array_elements(seat_numbers_data) AS elem;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'INSERT trigger: Error processing seat_numbers, using booking quantity';
        quantity_from_seat_numbers := 0;
      END;
    END IF;
    
    -- Use the larger of the two quantities
    ticket_change := GREATEST(COALESCE(NEW.quantity, 1), quantity_from_seat_numbers);
    
    -- Update ONLY the specific category availability
    UPDATE occurrence_ticket_categories 
    SET available_quantity = GREATEST(0, available_quantity - ticket_change),
        updated_at = NOW()
    WHERE id = NEW.occurrence_ticket_category_id;
    
    RAISE NOTICE 'INSERT trigger: Updated ONLY category % with quantity %', NEW.occurrence_ticket_category_id, ticket_change;
    
    RETURN NEW;
  END IF;
  
  -- Handle INSERT for non-recurring events (update event_seat_pricing)
  IF TG_OP = 'INSERT' AND NEW.event_occurrence_id IS NULL AND NEW.occurrence_ticket_category_id IS NULL THEN
    RAISE NOTICE 'INSERT trigger: Updating non-recurring event availability for event % with quantity %', NEW.event_id, COALESCE(NEW.quantity, 1);
    
    -- Update event_seat_pricing availability
    UPDATE event_seat_pricing 
    SET available_tickets = GREATEST(0, available_tickets - COALESCE(NEW.quantity, 1)),
        updated_at = NOW()
    WHERE event_id = NEW.event_id AND is_active = true;
    
    RETURN NEW;
  END IF;
  
  -- Handle DELETE (booking cancelled/deleted for recurring event)
  IF TG_OP = 'DELETE' AND OLD.event_occurrence_id IS NOT NULL AND OLD.occurrence_ticket_category_id IS NOT NULL THEN
    RAISE NOTICE 'DELETE trigger: Restoring availability for SPECIFIC category % with quantity %', OLD.occurrence_ticket_category_id, COALESCE(OLD.quantity, 1);
    
    -- Restore ONLY the specific category availability
    UPDATE occurrence_ticket_categories 
    SET available_quantity = LEAST(total_quantity, available_quantity + COALESCE(OLD.quantity, 1)),
        updated_at = NOW()
    WHERE id = OLD.occurrence_ticket_category_id;
    
    RETURN OLD;
  END IF;
  
  -- Handle DELETE for non-recurring events
  IF TG_OP = 'DELETE' AND OLD.event_occurrence_id IS NULL AND OLD.occurrence_ticket_category_id IS NULL THEN
    RAISE NOTICE 'DELETE trigger: Restoring non-recurring event availability for event % with quantity %', OLD.event_id, COALESCE(OLD.quantity, 1);
    
    -- Restore event_seat_pricing availability
    UPDATE event_seat_pricing 
    SET available_tickets = LEAST(total_tickets, available_tickets + COALESCE(OLD.quantity, 1)),
        updated_at = NOW()
    WHERE event_id = OLD.event_id AND is_active = true;
    
    RETURN OLD;
  END IF;
  
  -- Handle UPDATE (booking status change or quantity change)
  IF TG_OP = 'UPDATE' THEN
    -- For recurring events
    IF NEW.event_occurrence_id IS NOT NULL AND NEW.occurrence_ticket_category_id IS NOT NULL THEN
      RAISE NOTICE 'UPDATE trigger: Processing status change from % to % for SPECIFIC category %', OLD.status, NEW.status, NEW.occurrence_ticket_category_id;
      
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
        RAISE NOTICE 'UPDATE trigger: Applying ticket change % to SPECIFIC category %', ticket_change, NEW.occurrence_ticket_category_id;
        
        -- Update ONLY the specific category availability
        UPDATE occurrence_ticket_categories 
        SET available_quantity = GREATEST(0, LEAST(total_quantity, available_quantity + ticket_change)),
            updated_at = NOW()
        WHERE id = NEW.occurrence_ticket_category_id;
      END IF;
    
    -- For non-recurring events
    ELSE
      RAISE NOTICE 'UPDATE trigger: Processing status change from % to % for non-recurring event %', OLD.status, NEW.status, NEW.event_id;
      
      -- Calculate the change in ticket count based on status changes
      IF OLD.status != 'Confirmed' AND NEW.status = 'Confirmed' THEN
        ticket_change := -COALESCE(NEW.quantity, 1);
      ELSIF OLD.status = 'Confirmed' AND NEW.status != 'Confirmed' THEN
        ticket_change := COALESCE(OLD.quantity, 1);
      ELSIF OLD.status = 'Confirmed' AND NEW.status = 'Confirmed' THEN
        ticket_change := COALESCE(OLD.quantity, 1) - COALESCE(NEW.quantity, 1);
      END IF;
      
      IF ticket_change != 0 THEN
        RAISE NOTICE 'UPDATE trigger: Applying ticket change % to non-recurring event %', ticket_change, NEW.event_id;
        
        -- Update event_seat_pricing availability
        UPDATE event_seat_pricing 
        SET available_tickets = GREATEST(0, LEAST(total_tickets, available_tickets + ticket_change)),
            updated_at = NOW()
        WHERE event_id = NEW.event_id AND is_active = true;
      END IF;
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

-- Function to recalculate availability for a specific category
CREATE OR REPLACE FUNCTION public.recalculate_specific_category_availability(category_id_param UUID)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Recalculate availability for the specific category only
  UPDATE occurrence_ticket_categories 
  SET available_quantity = (
    SELECT GREATEST(0, otc.total_quantity - COALESCE(SUM(b.quantity), 0))
    FROM occurrence_ticket_categories otc
    LEFT JOIN bookings b ON b.occurrence_ticket_category_id = otc.id 
      AND b.status = 'Confirmed'
    WHERE otc.id = category_id_param
    GROUP BY otc.id, otc.total_quantity
  ),
  updated_at = NOW()
  WHERE id = category_id_param;
  
  RAISE NOTICE 'Recalculated availability for specific category %', category_id_param;
END;
$function$;
