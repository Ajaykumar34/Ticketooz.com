
-- Enable OLS (Row-Level Security) if not already enabled
ALTER TABLE seat_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_seat_pricing ENABLE ROW LEVEL SECURITY;

-- Allow public SELECT access for seat layout/viewing modules
CREATE POLICY "Public read access for seat_layouts" 
    ON seat_layouts FOR SELECT USING (true);

CREATE POLICY "Public read access for seats" 
    ON seats FOR SELECT USING (true);

CREATE POLICY "Public read access for seat_categories" 
    ON seat_categories FOR SELECT USING (true);

CREATE POLICY "Public read access for event_seat_pricing" 
    ON event_seat_pricing FOR SELECT USING (true);
