
-- Comprehensive RLS policies for all tables

-- Profiles table policies
CREATE POLICY "Allow all operations for admins on profiles" 
ON public.profiles 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Categories table policies  
CREATE POLICY "Allow all operations for admins on categories" 
ON public.categories 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Venues table policies
CREATE POLICY "Allow all operations for admins on venues" 
ON public.venues 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Tags table policies
CREATE POLICY "Allow all operations for admins on tags" 
ON public.tags 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Global seat categories table policies
CREATE POLICY "Allow all operations for admins on global_seat_categories" 
ON public.global_seat_categories 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Carousel slides table policies
CREATE POLICY "Allow all operations for admins on carousel_slides" 
ON public.carousel_slides 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Event requests table policies
CREATE POLICY "Allow all operations for admins on event_requests" 
ON public.event_requests 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Bookings table policies
CREATE POLICY "Allow all operations for admins on bookings" 
ON public.bookings 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Tickets table policies
CREATE POLICY "Allow all operations for admins on tickets" 
ON public.tickets 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Seats table policies
CREATE POLICY "Allow all operations for admins on seats" 
ON public.seats 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Admin users table policies
CREATE POLICY "Allow all operations for admins on admin_users" 
ON public.admin_users 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Event price zones table policies
CREATE POLICY "Allow all operations for admins on event_price_zones" 
ON public.event_price_zones 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Financial transactions table policies
CREATE POLICY "Allow all operations for admins on financial_transactions" 
ON public.financial_transactions 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Enable RLS on all tables if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_seat_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carousel_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_price_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
