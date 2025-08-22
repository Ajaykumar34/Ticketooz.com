
-- Final fix for the jsonb_array_length type issue in booking triggers

-- Drop and recreate the trigger function with proper type handling
DROP FUNCTION IF EXISTS public.update_occurrence_category_availability() CASCADE;

CREATE OR REPLACE FUNCTION public.update_occurrence_category_availability()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  ticket_change INTEGER := 0;
  seat_numbers_jsonb jsonb;
  calculated_quantity INTEGER := 0;
BEGIN
  -- Helper function to safely extract quantity from seat_numbers
  -- Convert JSON to JSONB if needed and calculate quantity
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Safely convert seat_numbers to JSONB if it's JSON
    IF NEW.seat_numbers IS NOT NULL THEN
      -- Handle both JSON and JSONB types safely
      BEGIN
        -- Try to cast to JSONB directly first
        seat_numbers_jsonb := NEW.seat_numbers::jsonb;
      EXCEPTION WHEN OTHERS THEN
        -- If that fails, it might already be JSONB or NULL
        seat_numbers_jsonb := NEW.seat_numbers;
      END;
      
      -- Calculate quantity from seat_numbers array
      IF seat_numbers_jsonb IS NOT NULL AND jsonb_typeof(seat_numbers_jsonb) = 'array' THEN
        SELECT COALESCE(SUM(COALESCE((item->>'quantity')::integer, 1)), 0)
        INTO calculated_quantity
        FROM jsonb_array_elements(seat_numbers_jsonb) AS item;
        
        -- Use calculated quantity if NEW.quantity is null or 0
        IF NEW.quantity IS NULL OR NEW.quantity = 0 THEN
          NEW.quantity := GREATEST(calculated_quantity, 1);
        END IF;
      END IF;
    END IF;
  END IF;
  
  -- Handle INSERT (new booking for recurring event)
  IF TG_OP = 'INSERT' AND NEW.event_occurrence_id IS NOT NULL AND NEW.occurrence_ticket_category_id IS NOT NULL THEN
    RAISE NOTICE 'INSERT trigger: Updating availability for category % with quantity %', NEW.occurrence_ticket_category_id, COALESCE(NEW.quantity, 1);
    
    -- Update the specific category availability
    UPDATE occurrence_ticket_categories 
    SET available_quantity = GREATEST(0, available_quantity - COALESCE(NEW.quantity, 1)),
        updated_at = NOW()
    WHERE id = NEW.occurrence_ticket_category_id;
    
    -- Get the updated availability for logging
    DECLARE
      updated_availability INTEGER;
    BEGIN
      SELECT available_quantity INTO updated_availability
      FROM occurrence_ticket_categories
      WHERE id = NEW.occurrence_ticket_category_id;
      
      RAISE NOTICE 'INSERT trigger: Category % now has % tickets available', NEW.occurrence_ticket_category_id, updated_availability;
    END;
    
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
    RAISE NOTICE 'DELETE trigger: Restoring availability for category % with quantity %', OLD.occurrence_ticket_category_id, COALESCE(OLD.quantity, 1);
    
    -- Restore the specific category availability
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

-- Recreate the trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS update_occurrence_category_availability_trigger ON bookings;
CREATE TRIGGER update_occurrence_category_availability_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_occurrence_category_availability();

-- Ensure the bookings table has the correct column types
DO $$
BEGIN
  -- Check if seat_numbers column exists and its type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' 
    AND column_name = 'seat_numbers'
    AND data_type = 'json'
  ) THEN
    -- If it's JSON, alter to JSONB for better performance and compatibility
    ALTER TABLE bookings ALTER COLUMN seat_numbers TYPE jsonb USING seat_numbers::jsonb;
    RAISE NOTICE 'Changed seat_numbers column type from json to jsonb';
  END IF;
END $$;
