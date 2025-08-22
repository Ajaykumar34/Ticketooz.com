
-- First, let's ensure the foreign key relationships are properly set up
ALTER TABLE events 
ADD CONSTRAINT fk_events_category 
FOREIGN KEY (category_id) REFERENCES categories(id);

ALTER TABLE events 
ADD CONSTRAINT fk_events_venue 
FOREIGN KEY (venue_id) REFERENCES venues(id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_category_id ON events(category_id);
CREATE INDEX IF NOT EXISTS idx_events_venue_id ON events(venue_id);
CREATE INDEX IF NOT EXISTS idx_events_start_datetime ON events(start_datetime);

-- Ensure the venue seat_map column can store complex seat map data
ALTER TABLE venues ALTER COLUMN seat_map TYPE jsonb;
