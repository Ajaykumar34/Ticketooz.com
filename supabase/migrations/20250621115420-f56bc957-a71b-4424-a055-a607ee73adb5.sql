
-- Add state column to venues table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'venues' AND column_name = 'state') THEN
        ALTER TABLE public.venues ADD COLUMN state TEXT;
    END IF;
END $$;

-- Update venues table to ensure city is properly indexed
CREATE INDEX IF NOT EXISTS idx_venues_city ON public.venues(city);
CREATE INDEX IF NOT EXISTS idx_venues_state ON public.venues(state);

-- Add some sample venue data if the table is empty (optional)
INSERT INTO public.venues (name, address, city, state) 
SELECT * FROM (VALUES
    ('Phoenix Arena', '123 Main Street, Phoenix Downtown', 'Phoenix', 'Arizona'),
    ('Mumbai Concert Hall', '456 Marine Drive, Nariman Point', 'Mumbai', 'Maharashtra'),
    ('Delhi Convention Center', '789 CP Block, Connaught Place', 'Delhi', 'Delhi'),
    ('Bangalore Tech Hub', '101 MG Road, Brigade Road', 'Bangalore', 'Karnataka'),
    ('Chennai Music Academy', '202 T Nagar, Anna Salai', 'Chennai', 'Tamil Nadu')
) AS new_venues(name, address, city, state)
WHERE NOT EXISTS (SELECT 1 FROM public.venues LIMIT 1);
