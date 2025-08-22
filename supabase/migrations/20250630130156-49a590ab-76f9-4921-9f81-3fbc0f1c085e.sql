
-- Create RLS policies with IF NOT EXISTS checks
DO $$ BEGIN
  -- Create policies for profiles table (user management)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Public read access for profiles') THEN
    CREATE POLICY "Public read access for profiles" 
    ON public.profiles 
    FOR SELECT 
    USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can update their own profile') THEN
    CREATE POLICY "Users can update their own profile" 
    ON public.profiles 
    FOR UPDATE 
    USING (auth.uid() = id) 
    WITH CHECK (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Admin full access on profiles') THEN
    CREATE POLICY "Admin full access on profiles" 
    ON public.profiles 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);
  END IF;

  -- Create policies for carousel_slides table
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'carousel_slides' AND policyname = 'Public read access for carousel_slides') THEN
    CREATE POLICY "Public read access for carousel_slides" 
    ON public.carousel_slides 
    FOR SELECT 
    USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'carousel_slides' AND policyname = 'Admin full access on carousel_slides') THEN
    CREATE POLICY "Admin full access on carousel_slides" 
    ON public.carousel_slides 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);
  END IF;

  -- Create policies for seat_layouts table
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'seat_layouts' AND policyname = 'Public read access for seat_layouts') THEN
    CREATE POLICY "Public read access for seat_layouts" 
    ON public.seat_layouts 
    FOR SELECT 
    USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'seat_layouts' AND policyname = 'Admin full access on seat_layouts') THEN
    CREATE POLICY "Admin full access on seat_layouts" 
    ON public.seat_layouts 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);
  END IF;

  -- Create policies for venues table (for interconnected filters)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'venues' AND policyname = 'Public read access for venues') THEN
    CREATE POLICY "Public read access for venues" 
    ON public.venues 
    FOR SELECT 
    USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'venues' AND policyname = 'Admin full access on venues') THEN
    CREATE POLICY "Admin full access on venues" 
    ON public.venues 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);
  END IF;

  -- Create policies for events table
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Public read access for events') THEN
    CREATE POLICY "Public read access for events" 
    ON public.events 
    FOR SELECT 
    USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Admin full access on events') THEN
    CREATE POLICY "Admin full access on events" 
    ON public.events 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);
  END IF;

  -- Create policies for seat_categories table
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'seat_categories' AND policyname = 'Public read access for seat_categories') THEN
    CREATE POLICY "Public read access for seat_categories" 
    ON public.seat_categories 
    FOR SELECT 
    USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'seat_categories' AND policyname = 'Admin full access on seat_categories') THEN
    CREATE POLICY "Admin full access on seat_categories" 
    ON public.seat_categories 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);
  END IF;

END $$;

-- Enable RLS on all these tables (this is safe to run multiple times)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carousel_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_categories ENABLE ROW LEVEL SECURITY;
