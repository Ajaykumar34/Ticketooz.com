-- Fix event requests RLS policies to prevent "permission denied for table users" error

-- First, ensure RLS is enabled on event_requests
ALTER TABLE public.event_requests ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own event requests" ON public.event_requests;
DROP POLICY IF EXISTS "Users can create their own event requests" ON public.event_requests;
DROP POLICY IF EXISTS "Users can update their own pending event requests" ON public.event_requests;
DROP POLICY IF EXISTS "Admins can view all event requests" ON public.event_requests;
DROP POLICY IF EXISTS "Admins can update all event requests" ON public.event_requests;
DROP POLICY IF EXISTS "Admins can insert event requests" ON public.event_requests;
DROP POLICY IF EXISTS "Allow public to create event requests" ON public.event_requests;
DROP POLICY IF EXISTS "Administrators can manage all event requests" ON public.event_requests;

-- Create new, simplified policies that avoid auth.users table references

-- 1. Allow public to create event requests (for unauthenticated users)
CREATE POLICY "public_can_create_event_requests" 
ON public.event_requests 
FOR INSERT 
WITH CHECK (true);

-- 2. Allow users to view their own event requests (only if authenticated)
CREATE POLICY "users_can_view_own_requests" 
ON public.event_requests 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND user_id = auth.uid()
);

-- 3. Allow users to update their own pending requests
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
  AND status = 'pending'
);

-- 4. Allow admins to view all event requests
CREATE POLICY "admins_can_view_all_requests" 
ON public.event_requests 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() AND user_id IS NOT NULL
  )
);

-- 5. Allow admins to update all event requests
CREATE POLICY "admins_can_update_all_requests" 
ON public.event_requests 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() AND user_id IS NOT NULL
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() AND user_id IS NOT NULL
  )
);

-- 6. Allow admins to insert event requests
CREATE POLICY "admins_can_insert_requests" 
ON public.event_requests 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() AND user_id IS NOT NULL
  )
);

-- 7. Allow admins to delete event requests
CREATE POLICY "admins_can_delete_requests" 
ON public.event_requests 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() AND user_id IS NOT NULL
  )
);