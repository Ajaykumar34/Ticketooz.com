
-- Create function to generate occurrence ticket categories for an occurrence
CREATE OR REPLACE FUNCTION public.create_occurrence_ticket_categories(
  p_occurrence_id UUID,
  p_event_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  category_record RECORD;
  created_count INTEGER := 0;
BEGIN
  -- Loop through all active seat categories for the event
  FOR category_record IN
    SELECT id, name, base_price
    FROM seat_categories 
    WHERE event_id = p_event_id AND is_active = true
  LOOP
    -- Insert occurrence-specific ticket category
    INSERT INTO occurrence_ticket_categories (
      occurrence_id,
      category_name,
      base_price,
      convenience_fee,
      commission,
      total_quantity,
      available_quantity,
      is_active
    ) VALUES (
      p_occurrence_id,
      category_record.name,
      category_record.base_price,
      50, -- Default convenience fee
      0,  -- Default commission
      100, -- Default total quantity
      100, -- Default available quantity
      true
    )
    ON CONFLICT (occurrence_id, category_name) DO NOTHING;
    
    created_count := created_count + 1;
  END LOOP;
  
  RETURN created_count;
END;
$$;

-- Populate occurrence ticket categories for existing occurrences that don't have them
DO $$
DECLARE
  occurrence_record RECORD;
  category_count INTEGER;
BEGIN
  FOR occurrence_record IN
    SELECT eo.id as occurrence_id, eo.event_id
    FROM event_occurrences eo
    LEFT JOIN occurrence_ticket_categories otc ON eo.id = otc.occurrence_id
    WHERE otc.id IS NULL -- Only occurrences without categories
      AND eo.is_active = true
  LOOP
    SELECT create_occurrence_ticket_categories(
      occurrence_record.occurrence_id,
      occurrence_record.event_id
    ) INTO category_count;
    
    RAISE NOTICE 'Created % categories for occurrence %', category_count, occurrence_record.occurrence_id;
  END LOOP;
END;
$$;

-- Update the generate_recurring_occurrences function to automatically create categories
CREATE OR REPLACE FUNCTION public.generate_recurring_occurrences(
  p_event_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_recurrence_type TEXT DEFAULT 'daily',
  p_occurrence_time TIME DEFAULT '18:00:00',
  p_total_tickets INTEGER DEFAULT 100
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_date DATE := p_start_date;
  occurrence_count INTEGER := 0;
  new_occurrence_id UUID;
  category_count INTEGER;
BEGIN
  WHILE current_date <= p_end_date LOOP
    -- Insert the occurrence
    INSERT INTO event_occurrences (
      event_id,
      occurrence_date,
      occurrence_time,
      total_tickets,
      available_tickets,
      is_active
    ) VALUES (
      p_event_id,
      current_date,
      p_occurrence_time,
      p_total_tickets,
      p_total_tickets,
      true
    )
    RETURNING id INTO new_occurrence_id;
    
    -- Create occurrence ticket categories
    SELECT create_occurrence_ticket_categories(new_occurrence_id, p_event_id) INTO category_count;
    
    occurrence_count := occurrence_count + 1;
    
    -- Increment date based on recurrence type
    CASE p_recurrence_type
      WHEN 'daily' THEN
        current_date := current_date + INTERVAL '1 day';
      WHEN 'weekly' THEN
        current_date := current_date + INTERVAL '1 week';
      WHEN 'monthly' THEN
        current_date := current_date + INTERVAL '1 month';
      ELSE
        current_date := current_date + INTERVAL '1 day';
    END CASE;
  END LOOP;
  
  RETURN occurrence_count;
END;
$$;
