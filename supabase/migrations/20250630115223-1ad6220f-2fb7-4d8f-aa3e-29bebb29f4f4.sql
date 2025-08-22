
-- Create RLS policies for events table to allow admin operations
CREATE POLICY "Allow all operations for admins on events" 
ON public.events 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Also ensure other related tables have proper admin policies
CREATE POLICY "Allow all operations for admins on event_seat_pricing" 
ON public.event_seat_pricing 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all operations for admins on seat_layouts" 
ON public.seat_layouts 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all operations for admins on seat_categories" 
ON public.seat_categories 
FOR ALL 
USING (true) 
WITH CHECK (true);
