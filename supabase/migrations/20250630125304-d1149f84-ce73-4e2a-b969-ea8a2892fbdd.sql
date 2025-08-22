
-- Create RLS policies for tags table
CREATE POLICY "Public read access for tags" 
ON public.tags 
FOR SELECT 
USING (true);

CREATE POLICY "Admin full access on tags" 
ON public.tags 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create RLS policies for bookings table
CREATE POLICY "Users can view their own bookings" 
ON public.bookings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookings" 
ON public.bookings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin full access on bookings" 
ON public.bookings 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Ensure RLS is enabled on both tables
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
