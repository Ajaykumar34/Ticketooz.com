
-- Fix RLS policies for seats table and other missing policies

-- Seats table policies - allow public read access and admin write access
DROP POLICY IF EXISTS "Public read access for seats" ON public.seats;
DROP POLICY IF EXISTS "Admin full access on seats" ON public.seats;

CREATE POLICY "Public read access for seats" 
ON public.seats 
FOR SELECT 
USING (true);

CREATE POLICY "Admin full access on seats" 
ON public.seats 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Seat categories policies
DROP POLICY IF EXISTS "Public read access for seat_categories" ON public.seat_categories;
DROP POLICY IF EXISTS "Admin full access on seat_categories" ON public.seat_categories;

CREATE POLICY "Public read access for seat_categories" 
ON public.seat_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Admin full access on seat_categories" 
ON public.seat_categories 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Admin policies for venues table (for CRUD operations)
DROP POLICY IF EXISTS "Admin full access on venues" ON public.venues;
CREATE POLICY "Admin full access on venues" 
ON public.venues 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Admin policies for events table (for CRUD operations)
DROP POLICY IF EXISTS "Admin full access on events" ON public.events;
CREATE POLICY "Admin full access on events" 
ON public.events 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Admin policies for categories table (for CRUD operations)
DROP POLICY IF EXISTS "Admin full access on categories" ON public.categories;
CREATE POLICY "Admin full access on categories" 
ON public.categories 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Global seat categories policies
DROP POLICY IF EXISTS "Public read access for global_seat_categories" ON public.global_seat_categories;
DROP POLICY IF EXISTS "Admin full access on global_seat_categories" ON public.global_seat_categories;

CREATE POLICY "Public read access for global_seat_categories" 
ON public.global_seat_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Admin full access on global_seat_categories" 
ON public.global_seat_categories 
FOR ALL 
USING (true) 
WITH CHECK (true);
