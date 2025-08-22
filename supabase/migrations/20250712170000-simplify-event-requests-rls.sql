
-- Completely rebuild event_requests RLS policies to avoid users table access

-- Drop all existing policies
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

-- Create the simplest possible policies

-- 1. Allow anyone to insert event requests (for public form submissions)
CREATE POLICY "allow_public_insert" 
ON public.event_requests 
FOR INSERT 
WITH CHECK (true);

-- 2. Allow admins to read all requests
CREATE POLICY "allow_admin_select" 
ON public.event_requests 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- 3. Allow admins to update all requests
CREATE POLICY "allow_admin_update" 
ON public.event_requests 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- 4. Allow admins to delete requests if needed
CREATE POLICY "allow_admin_delete" 
ON public.event_requests 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Grant necessary permissions
GRANT ALL ON public.event_requests TO authenticated;
GRANT SELECT, INSERT ON public.event_requests TO anon;
