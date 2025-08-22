
-- Enable RLS on seat_layouts table (if not already enabled)
ALTER TABLE public.seat_layouts ENABLE ROW LEVEL SECURITY;

-- Add policy to allow all authenticated users to insert seat layouts
CREATE POLICY "Allow authenticated users to insert seat layouts" 
  ON public.seat_layouts 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Add policy to allow all authenticated users to select seat layouts
CREATE POLICY "Allow authenticated users to select seat layouts" 
  ON public.seat_layouts 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Add policy to allow all authenticated users to update seat layouts
CREATE POLICY "Allow authenticated users to update seat layouts" 
  ON public.seat_layouts 
  FOR UPDATE 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Add policy to allow all authenticated users to delete seat layouts
CREATE POLICY "Allow authenticated users to delete seat layouts" 
  ON public.seat_layouts 
  FOR DELETE 
  TO authenticated 
  USING (true);

-- Also add RLS policies for seats table
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to insert seats" 
  ON public.seats 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to select seats" 
  ON public.seats 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to update seats" 
  ON public.seats 
  FOR UPDATE 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete seats" 
  ON public.seats 
  FOR DELETE 
  TO authenticated 
  USING (true);

-- Add RLS policies for seat_categories table
ALTER TABLE public.seat_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to insert seat categories" 
  ON public.seat_categories 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to select seat categories" 
  ON public.seat_categories 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated users to update seat categories" 
  ON public.seat_categories 
  FOR UPDATE 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete seat categories" 
  ON public.seat_categories 
  FOR DELETE 
  TO authenticated 
  USING (true);
