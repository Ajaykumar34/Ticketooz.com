
-- 1. Create `venues` table
CREATE TABLE public.venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  seat_map JSONB, -- stores seat arrangement and categories/sections
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create `events` table
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- featured, upcoming, regular
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  sale_start TIMESTAMPTZ NOT NULL,
  sale_end TIMESTAMPTZ NOT NULL,
  poster TEXT,
  artist_name TEXT,
  artist_image TEXT,
  terms_and_conditions TEXT,
  status TEXT DEFAULT 'Active', -- Active/Expired/Cancelled
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create `event_pricing` for seat pricing (each row = one category/type for one event)
CREATE TABLE public.event_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  seat_category TEXT NOT NULL, -- e.g., VIP, Balcony, A, B, etc.
  base_price NUMERIC NOT NULL,
  multiplier NUMERIC DEFAULT 1.0, -- markup multiplier for base price
  convenience_fee NUMERIC DEFAULT 0,
  commission NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create index for querying current/upcoming/past events efficiently
CREATE INDEX idx_events_time_category ON public.events (category, start_datetime, end_datetime, sale_start, sale_end);

-- 5. Enable RLS for multi-admin/secure apps (optional, can skip if public)
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_pricing ENABLE ROW LEVEL SECURITY;

-- 6. RLS policy: Allow all access for now (you can restrict later if required)
CREATE POLICY "Allow all venues" ON public.venues FOR ALL USING (true);
CREATE POLICY "Allow all events" ON public.events FOR ALL USING (true);
CREATE POLICY "Allow all event pricing" ON public.event_pricing FOR ALL USING (true);

