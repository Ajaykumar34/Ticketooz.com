-- Create improved functions for general admission ticket management

-- Function to update event_seat_pricing availability when bookings are made
CREATE OR REPLACE FUNCTION update_general_admission_availability()
RETURNS TRIGGER AS $$
DECLARE
  seat_data JSONB;
  category_name TEXT;
  quantity INTEGER;
  pricing_id UUID;
BEGIN
  -- Handle INSERT (new booking)
  IF TG_OP = 'INSERT' AND NEW.status = 'Confirmed' THEN
    -- For non-recurring events (general admission)
    IF NEW.event_occurrence_id IS NULL AND NEW.seat_numbers IS NOT NULL THEN
      FOR seat_data IN SELECT * FROM jsonb_array_elements(NEW.seat_numbers)
      LOOP
        category_name := seat_data->>'seat_category';
        quantity := COALESCE((seat_data->>'quantity')::INTEGER, 1);
        
        -- Find corresponding pricing record
        UPDATE event_seat_pricing esp
        SET available_tickets = GREATEST(0, available_tickets - quantity),
            updated_at = NOW()
        FROM seat_categories sc
        WHERE esp.seat_category_id = sc.id
          AND esp.event_id = NEW.event_id 
          AND sc.name = category_name 
          AND esp.is_active = true;
      END LOOP;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Handle UPDATE (status change)
  IF TG_OP = 'UPDATE' THEN
    -- If booking was cancelled, restore availability
    IF OLD.status = 'Confirmed' AND NEW.status != 'Confirmed' THEN
      IF OLD.event_occurrence_id IS NULL AND OLD.seat_numbers IS NOT NULL THEN
        FOR seat_data IN SELECT * FROM jsonb_array_elements(OLD.seat_numbers)
        LOOP
          category_name := seat_data->>'seat_category';
          quantity := COALESCE((seat_data->>'quantity')::INTEGER, 1);
          
          UPDATE event_seat_pricing esp
          SET available_tickets = LEAST(total_tickets, available_tickets + quantity),
              updated_at = NOW()
          FROM seat_categories sc
          WHERE esp.seat_category_id = sc.id
            AND esp.event_id = OLD.event_id 
            AND sc.name = category_name 
            AND esp.is_active = true;
        END LOOP;
      END IF;
    -- If booking was confirmed, reduce availability
    ELSIF OLD.status != 'Confirmed' AND NEW.status = 'Confirmed' THEN
      IF NEW.event_occurrence_id IS NULL AND NEW.seat_numbers IS NOT NULL THEN
        FOR seat_data IN SELECT * FROM jsonb_array_elements(NEW.seat_numbers)
        LOOP
          category_name := seat_data->>'seat_category';
          quantity := COALESCE((seat_data->>'quantity')::INTEGER, 1);
          
          UPDATE event_seat_pricing esp
          SET available_tickets = GREATEST(0, available_tickets - quantity),
              updated_at = NOW()
          FROM seat_categories sc
          WHERE esp.seat_category_id = sc.id
            AND esp.event_id = NEW.event_id 
            AND sc.name = category_name 
            AND esp.is_active = true;
        END LOOP;
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Handle DELETE (booking cancelled/deleted)
  IF TG_OP = 'DELETE' AND OLD.status = 'Confirmed' THEN
    IF OLD.event_occurrence_id IS NULL AND OLD.seat_numbers IS NOT NULL THEN
      FOR seat_data IN SELECT * FROM jsonb_array_elements(OLD.seat_numbers)
      LOOP
        category_name := seat_data->>'seat_category';
        quantity := COALESCE((seat_data->>'quantity')::INTEGER, 1);
        
        UPDATE event_seat_pricing esp
        SET available_tickets = LEAST(total_tickets, available_tickets + quantity),
            updated_at = NOW()
        FROM seat_categories sc
        WHERE esp.seat_category_id = sc.id
          AND esp.event_id = OLD.event_id 
          AND sc.name = category_name 
          AND esp.is_active = true;
      END LOOP;
    END IF;
    
    RETURN OLD;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_update_general_admission_availability ON bookings;
CREATE TRIGGER trigger_update_general_admission_availability
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_general_admission_availability();

-- Function to initialize general admission categories for an event
CREATE OR REPLACE FUNCTION initialize_general_admission_categories(p_event_id UUID)
RETURNS VOID AS $$
DECLARE
  category_record RECORD;
BEGIN
  -- Create default ticket categories for general admission events
  -- Get existing seat categories for this event
  FOR category_record IN 
    SELECT id, name FROM seat_categories 
    WHERE event_id = p_event_id AND is_active = true
  LOOP
    -- Create pricing record for each category
    INSERT INTO event_seat_pricing (
      event_id,
      seat_category_id,
      base_price,
      convenience_fee,
      commission,
      total_tickets,
      available_tickets,
      is_active
    ) VALUES (
      p_event_id,
      category_record.id,
      500, -- Default base price
      50,  -- Default convenience fee  
      25,  -- Default commission
      100, -- Default total tickets
      100, -- Default available tickets
      true
    )
    ON CONFLICT (event_id, seat_category_id) 
    DO UPDATE SET
      total_tickets = COALESCE(event_seat_pricing.total_tickets, 100),
      available_tickets = COALESCE(event_seat_pricing.available_tickets, 100),
      updated_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to get general admission availability for an event
CREATE OR REPLACE FUNCTION get_general_admission_availability(p_event_id UUID)
RETURNS TABLE(
  seat_category_id UUID,
  category_name TEXT,
  base_price NUMERIC,
  convenience_fee NUMERIC,
  commission NUMERIC,
  total_tickets INTEGER,
  available_tickets INTEGER,
  booked_tickets INTEGER,
  color TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    esp.seat_category_id,
    sc.name as category_name,
    esp.base_price,
    esp.convenience_fee,
    esp.commission,
    esp.total_tickets,
    esp.available_tickets,
    (esp.total_tickets - esp.available_tickets) as booked_tickets,
    sc.color
  FROM event_seat_pricing esp
  JOIN seat_categories sc ON esp.seat_category_id = sc.id
  WHERE esp.event_id = p_event_id 
    AND esp.is_active = true
    AND sc.is_active = true
  ORDER BY sc.name;
END;
$$ LANGUAGE plpgsql;