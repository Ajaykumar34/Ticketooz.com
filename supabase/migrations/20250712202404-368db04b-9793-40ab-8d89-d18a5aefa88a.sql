
-- Fix event_requests RLS policies to avoid accessing auth.users table

-- Drop all existing policies that might be causing issues
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

-- Create simple policies that only use admin_users table (no auth.users access)

-- 1. Allow public to insert event requests (for form submissions)
CREATE POLICY "allow_public_insert_event_requests" 
ON public.event_requests 
FOR INSERT 
WITH CHECK (true);

-- 2. Allow admins to view all event requests
CREATE POLICY "allow_admin_select_event_requests" 
ON public.event_requests 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- 3. Allow admins to update event requests
CREATE POLICY "allow_admin_update_event_requests" 
ON public.event_requests 
FOR UPDATE 
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

-- 4. Allow admins to delete event requests if needed
CREATE POLICY "allow_admin_delete_event_requests" 
ON public.event_requests 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Grant necessary permissions
GRANT ALL ON public.event_requests TO authenticated;
GRANT SELECT, INSERT ON public.event_requests TO anon;
