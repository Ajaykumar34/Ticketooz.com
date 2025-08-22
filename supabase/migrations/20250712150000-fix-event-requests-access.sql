
-- Fix event_requests table RLS policies for better admin access

-- First, ensure the table exists and RLS is enabled
DO $$ 
BEGIN
    -- Check if event_requests table exists, if not create it
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_requests') THEN
        CREATE TABLE public.event_requests (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            event_name TEXT NOT NULL,
            event_category TEXT NOT NULL,
            event_description TEXT,
            expected_attendees INTEGER,
            preferred_venue TEXT,
            preferred_date DATE,
            estimated_budget DECIMAL(12,2),
            contact_email TEXT NOT NULL,
            contact_phone TEXT,
            additional_info TEXT,
            admin_notes TEXT,
            status TEXT DEFAULT 'pending',
            user_id UUID REFERENCES auth.users(id),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.event_requests ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'event_requests' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON public.event_requests';
    END LOOP;
END $$;

-- Create simple, working policies

-- 1. Allow public to insert event requests (for unauthenticated users)
CREATE POLICY "public_insert_event_requests" 
ON public.event_requests 
FOR INSERT 
WITH CHECK (true);

-- 2. Allow users to view their own requests
CREATE POLICY "users_view_own_requests" 
ON public.event_requests 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 3. Allow users to update their own pending requests
CREATE POLICY "users_update_own_pending" 
ON public.event_requests 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND user_id = auth.uid() AND status = 'pending')
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 4. Allow admins full access to all requests
CREATE POLICY "admins_full_access" 
ON public.event_requests 
FOR ALL 
USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE user_id = auth.uid()
    )
);

-- Grant necessary permissions
GRANT ALL ON public.event_requests TO authenticated;
GRANT SELECT, INSERT ON public.event_requests TO anon;

-- Create updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_event_requests_updated_at ON public.event_requests;
CREATE TRIGGER update_event_requests_updated_at 
    BEFORE UPDATE ON public.event_requests 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();
