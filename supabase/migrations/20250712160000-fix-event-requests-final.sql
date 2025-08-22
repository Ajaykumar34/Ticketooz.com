
-- Fix event_requests RLS policies to avoid auth.users table access issues

-- Drop all existing policies first
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

-- Create simplified policies that don't reference auth.users

-- 1. Allow public to insert event requests (for unauthenticated users)
CREATE POLICY "public_can_insert_event_requests" 
ON public.event_requests 
FOR INSERT 
WITH CHECK (true);

-- 2. Allow authenticated users to view their own requests
CREATE POLICY "users_can_view_own_requests" 
ON public.event_requests 
FOR SELECT 
USING (
  CASE 
    WHEN auth.uid() IS NULL THEN false
    WHEN user_id IS NULL THEN false
    ELSE user_id = auth.uid()
  END
);

-- 3. Allow authenticated users to update their own pending requests
CREATE POLICY "users_can_update_own_pending_requests" 
ON public.event_requests 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid() 
  AND status = 'pending'
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND user_id = auth.uid()
);

-- 4. Allow admin users to have full access (using admin_users table only)
CREATE POLICY "admins_have_full_access" 
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
