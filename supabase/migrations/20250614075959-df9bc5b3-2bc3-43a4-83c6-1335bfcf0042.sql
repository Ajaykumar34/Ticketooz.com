
-- 1. Restore venues table
CREATE TABLE IF NOT EXISTS public.venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  seat_map JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Restore events table
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  sale_start TIMESTAMPTZ NOT NULL,
  sale_end TIMESTAMPTZ NOT NULL,
  poster TEXT,
  artist_name TEXT,
  artist_image TEXT,
  terms_and_conditions TEXT,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Restore event_pricing table
CREATE TABLE IF NOT EXISTS public.event_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  seat_category TEXT NOT NULL,
  base_price NUMERIC NOT NULL,
  multiplier NUMERIC DEFAULT 1.0,
  convenience_fee NUMERIC DEFAULT 0,
  commission NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Add index for events table for performance (optional but recommended for dashboard queries)
CREATE INDEX IF NOT EXISTS idx_events_time_category 
  ON public.events (category, start_datetime, end_datetime, sale_start, sale_end);

-- 5. Enable Row Level Security
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_pricing ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies: Allow all access for now (you can restrict later if required)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow all venues' AND tablename = 'venues'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow all venues" ON public.venues FOR ALL USING (true);';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow all events' AND tablename = 'events'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow all events" ON public.events FOR ALL USING (true);';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow all event pricing' AND tablename = 'event_pricing'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow all event pricing" ON public.event_pricing FOR ALL USING (true);';
  END IF;
END $$;

