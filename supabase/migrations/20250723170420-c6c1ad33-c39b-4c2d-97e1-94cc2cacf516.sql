
-- Final fix to ensure only the specific booked category is updated for non-recurring events
CREATE OR REPLACE FUNCTION public.update_occurrence_category_availability()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  ticket_change INTEGER := 0;
  seat_numbers_data JSONB;
  quantity_from_seat_numbers INTEGER := 0;
  target_seat_category_id UUID := NULL;
  category_name_from_booking TEXT := NULL;
  debug_seat_numbers TEXT := '';
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
  
  -- Handle INSERT for non-recurring events (update SPECIFIC category in event_seat_pricing)
  IF TG_OP = 'INSERT' AND NEW.event_occurrence_id IS NULL AND NEW.occurrence_ticket_category_id IS NULL THEN
    RAISE NOTICE 'INSERT trigger: Processing non-recurring event % with quantity %', NEW.event_id, COALESCE(NEW.quantity, 1);
    
    -- Debug: Log the seat_numbers data
    IF NEW.seat_numbers IS NOT NULL THEN
      debug_seat_numbers := NEW.seat_numbers::text;
      RAISE NOTICE 'INSERT trigger: seat_numbers data: %', debug_seat_numbers;
    END IF;
    
    -- Try to determine the specific seat category from seat_numbers
    IF NEW.seat_numbers IS NOT NULL THEN
      BEGIN
        -- Convert to JSONB if it's JSON
        IF pg_typeof(NEW.seat_numbers) = 'json'::regtype THEN
          seat_numbers_data := NEW.seat_numbers::jsonb;
        ELSE
          seat_numbers_data := NEW.seat_numbers;
        END IF;
        
        -- Extract category name from the first seat element with enhanced debugging
        IF jsonb_typeof(seat_numbers_data) = 'array' AND jsonb_array_length(seat_numbers_data) > 0 THEN
          -- Try multiple possible fields for category name
          category_name_from_booking := COALESCE(
            seat_numbers_data->0->>'seat_category',
            seat_numbers_data->0->>'category',
            seat_numbers_data->0->>'categoryName'
          );
          
          RAISE NOTICE 'INSERT trigger: Extracted category name: "%"', category_name_from_booking;
          
          -- Find the matching seat category ID with case-insensitive comparison
          IF category_name_from_booking IS NOT NULL THEN
            SELECT sc.id INTO target_seat_category_id
            FROM seat_categories sc
            WHERE sc.event_id = NEW.event_id 
              AND LOWER(sc.name) = LOWER(category_name_from_booking)
              AND sc.is_active = true
            LIMIT 1;
            
            RAISE NOTICE 'INSERT trigger: Found seat category ID: %', target_seat_category_id;
          END IF;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'INSERT trigger: Error processing seat_numbers: %', SQLERRM;
        target_seat_category_id := NULL;
      END;
    END IF;
    
    -- STRICT: Only update if we found a specific category
    IF target_seat_category_id IS NOT NULL THEN
      UPDATE event_seat_pricing 
      SET available_tickets = GREATEST(0, available_tickets - COALESCE(NEW.quantity, 1)),
          updated_at = NOW()
      WHERE event_id = NEW.event_id 
        AND seat_category_id = target_seat_category_id
        AND is_active = true;
      
      RAISE NOTICE 'INSERT trigger: Updated ONLY category % (%) for non-recurring event', target_seat_category_id, category_name_from_booking;
    ELSE
      -- DO NOT update all categories - log error instead
      RAISE NOTICE 'INSERT trigger: FAILED to identify specific category - NO UPDATE PERFORMED to prevent affecting all categories';
      RAISE NOTICE 'INSERT trigger: Please check booking data format - seat_numbers: %', debug_seat_numbers;
    END IF;
    
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
  
  -- Handle DELETE for non-recurring events (restore SPECIFIC category)
  IF TG_OP = 'DELETE' AND OLD.event_occurrence_id IS NULL AND OLD.occurrence_ticket_category_id IS NULL THEN
    RAISE NOTICE 'DELETE trigger: Processing non-recurring event deletion % with quantity %', OLD.event_id, COALESCE(OLD.quantity, 1);
    
    -- Try to determine the specific seat category from seat_numbers
    IF OLD.seat_numbers IS NOT NULL THEN
      BEGIN
        -- Convert to JSONB if it's JSON
        IF pg_typeof(OLD.seat_numbers) = 'json'::regtype THEN
          seat_numbers_data := OLD.seat_numbers::jsonb;
        ELSE
          seat_numbers_data := OLD.seat_numbers;
        END IF;
        
        -- Extract category name from the first seat element
        IF jsonb_typeof(seat_numbers_data) = 'array' AND jsonb_array_length(seat_numbers_data) > 0 THEN
          category_name_from_booking := COALESCE(
            seat_numbers_data->0->>'seat_category',
            seat_numbers_data->0->>'category',
            seat_numbers_data->0->>'categoryName'
          );
          
          -- Find the matching seat category ID with case-insensitive comparison
          IF category_name_from_booking IS NOT NULL THEN
            SELECT sc.id INTO target_seat_category_id
            FROM seat_categories sc
            WHERE sc.event_id = OLD.event_id 
              AND LOWER(sc.name) = LOWER(category_name_from_booking)
              AND sc.is_active = true
            LIMIT 1;
          END IF;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'DELETE trigger: Error processing seat_numbers: %', SQLERRM;
        target_seat_category_id := NULL;
      END;
    END IF;
    
    -- STRICT: Only restore if we found a specific category
    IF target_seat_category_id IS NOT NULL THEN
      UPDATE event_seat_pricing 
      SET available_tickets = LEAST(total_tickets, available_tickets + COALESCE(OLD.quantity, 1)),
          updated_at = NOW()
      WHERE event_id = OLD.event_id 
        AND seat_category_id = target_seat_category_id
        AND is_active = true;
      
      RAISE NOTICE 'DELETE trigger: Restored ONLY category % for non-recurring event', target_seat_category_id;
    ELSE
      -- DO NOT restore all categories - log error instead
      RAISE NOTICE 'DELETE trigger: FAILED to identify specific category - NO RESTORE PERFORMED';
    END IF;
    
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
    
    -- For non-recurring events (handle SPECIFIC category updates)
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
        
        -- Try to determine the specific seat category from seat_numbers
        IF NEW.seat_numbers IS NOT NULL THEN
          BEGIN
            -- Convert to JSONB if it's JSON
            IF pg_typeof(NEW.seat_numbers) = 'json'::regtype THEN
              seat_numbers_data := NEW.seat_numbers::jsonb;
            ELSE
              seat_numbers_data := NEW.seat_numbers;
            END IF;
            
            -- Extract category name from the first seat element
            IF jsonb_typeof(seat_numbers_data) = 'array' AND jsonb_array_length(seat_numbers_data) > 0 THEN
              category_name_from_booking := COALESCE(
                seat_numbers_data->0->>'seat_category',
                seat_numbers_data->0->>'category',
                seat_numbers_data->0->>'categoryName'
              );
              
              -- Find the matching seat category ID with case-insensitive comparison
              IF category_name_from_booking IS NOT NULL THEN
                SELECT sc.id INTO target_seat_category_id
                FROM seat_categories sc
                WHERE sc.event_id = NEW.event_id 
                  AND LOWER(sc.name) = LOWER(category_name_from_booking)
                  AND sc.is_active = true
                LIMIT 1;
              END IF;
            END IF;
          EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'UPDATE trigger: Error processing seat_numbers: %', SQLERRM;
            target_seat_category_id := NULL;
          END;
        END IF;
        
        -- STRICT: Only update if we found a specific category
        IF target_seat_category_id IS NOT NULL THEN
          UPDATE event_seat_pricing 
          SET available_tickets = GREATEST(0, LEAST(total_tickets, available_tickets + ticket_change)),
              updated_at = NOW()
          WHERE event_id = NEW.event_id 
            AND seat_category_id = target_seat_category_id
            AND is_active = true;
          
          RAISE NOTICE 'UPDATE trigger: Updated ONLY category % for non-recurring event', target_seat_category_id;
        ELSE
          -- DO NOT update all categories - log error instead
          RAISE NOTICE 'UPDATE trigger: FAILED to identify specific category - NO UPDATE PERFORMED';
        END IF;
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
