
-- Add a custom event_id_display column to store the formatted event ID
ALTER TABLE events ADD COLUMN event_id_display TEXT;

-- Create an index for better performance when querying by event_id_display
CREATE INDEX idx_events_event_id_display ON events(event_id_display);

-- Update existing events to have the formatted event ID (using a placeholder state code)
UPDATE events 
SET event_id_display = 'IN' || SUBSTRING(id::text, 1, 8) || '-' || SUBSTRING(id::text, 10, 4) || '-' || SUBSTRING(id::text, 15, 4) || '-' || SUBSTRING(id::text, 20, 4) || '-' || SUBSTRING(id::text, 25, 12)
WHERE event_id_display IS NULL;

-- Create a function to generate formatted event ID with state code
CREATE OR REPLACE FUNCTION generate_formatted_event_id(event_uuid UUID, venue_state TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    state_code TEXT := 'IN'; -- Default to India if no state provided
    formatted_id TEXT;
BEGIN
    -- Map state names to codes
    CASE venue_state
        WHEN 'Andhra Pradesh' THEN state_code := 'AP';
        WHEN 'Arunachal Pradesh' THEN state_code := 'AR';
        WHEN 'Assam' THEN state_code := 'AS';
        WHEN 'Bihar' THEN state_code := 'BR';
        WHEN 'Chhattisgarh' THEN state_code := 'CG';
        WHEN 'Goa' THEN state_code := 'GA';
        WHEN 'Gujarat' THEN state_code := 'GJ';
        WHEN 'Haryana' THEN state_code := 'HR';
        WHEN 'Himachal Pradesh' THEN state_code := 'HP';
        WHEN 'Jharkhand' THEN state_code := 'JH';
        WHEN 'Karnataka' THEN state_code := 'KA';
        WHEN 'Kerala' THEN state_code := 'KL';
        WHEN 'Madhya Pradesh' THEN state_code := 'MP';
        WHEN 'Maharashtra' THEN state_code := 'MH';
        WHEN 'Manipur' THEN state_code := 'MN';
        WHEN 'Meghalaya' THEN state_code := 'ML';
        WHEN 'Mizoram' THEN state_code := 'MZ';
        WHEN 'Nagaland' THEN state_code := 'NL';
        WHEN 'Odisha' THEN state_code := 'OR';
        WHEN 'Punjab' THEN state_code := 'PB';
        WHEN 'Rajasthan' THEN state_code := 'RJ';
        WHEN 'Sikkim' THEN state_code := 'SK';
        WHEN 'Tamil Nadu' THEN state_code := 'TN';
        WHEN 'Telangana' THEN state_code := 'TG';
        WHEN 'Tripura' THEN state_code := 'TR';
        WHEN 'Uttar Pradesh' THEN state_code := 'UP';
        WHEN 'Uttarakhand' THEN state_code := 'UK';
        WHEN 'West Bengal' THEN state_code := 'WB';
        WHEN 'Delhi' THEN state_code := 'DL';
        WHEN 'Jammu and Kashmir' THEN state_code := 'JK';
        WHEN 'Ladakh' THEN state_code := 'LA';
        ELSE state_code := 'IN';
    END CASE;
    
    -- Generate formatted ID: StateCode + UUID without hyphens
    formatted_id := state_code || REPLACE(event_uuid::text, '-', '');
    
    RETURN formatted_id;
END;
$$;

-- Create a trigger function to automatically generate formatted event ID
CREATE OR REPLACE FUNCTION set_formatted_event_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    venue_state_name TEXT;
BEGIN
    -- Get the venue state for the event
    SELECT v.state INTO venue_state_name
    FROM venues v
    WHERE v.id = NEW.venue_id;
    
    -- Generate and set the formatted event ID
    NEW.event_id_display := generate_formatted_event_id(NEW.id, venue_state_name);
    
    RETURN NEW;
END;
$$;

-- Create trigger to automatically set formatted event ID on insert and update
DROP TRIGGER IF EXISTS trigger_set_formatted_event_id ON events;
CREATE TRIGGER trigger_set_formatted_event_id
    BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION set_formatted_event_id();
