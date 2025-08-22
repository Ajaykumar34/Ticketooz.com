
-- Add new columns for featured status, regular status, and category linking
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_regular BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS category_id UUID;

-- Set NOT NULL constraints after ensuring default values are applied to existing rows
-- (or new rows will get the default)
UPDATE public.events SET is_featured = false WHERE is_featured IS NULL;
UPDATE public.events SET is_regular = false WHERE is_regular IS NULL;

ALTER TABLE public.events
ALTER COLUMN is_featured SET NOT NULL,
ALTER COLUMN is_regular SET NOT NULL;

-- Add foreign key constraint to link events to categories
-- This assumes you have a 'categories' table with an 'id' primary key
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categories') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'id') THEN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'fk_events_category_id' AND conrelid = 'public.events'::regclass
            ) THEN
                ALTER TABLE public.events
                ADD CONSTRAINT fk_events_category_id
                FOREIGN KEY (category_id) REFERENCES public.categories(id)
                ON DELETE SET NULL ON UPDATE CASCADE;
            END IF;
        END IF;
    END IF;
END $$;

-- Enable Row Level Security (RLS) on the events table if it's not already enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'events' AND n.nspname = 'public' AND c.relrowsecurity
    ) THEN
        ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Policy to allow public read access to all events
CREATE POLICY "Allow public read access to events"
ON public.events
FOR SELECT
USING (true);

-- Note: The original 'category' TEXT column in 'events' will remain for now.
-- New events should populate 'category_id'.
-- Frontend queries will be updated to prefer 'category_id' and its joined data.
