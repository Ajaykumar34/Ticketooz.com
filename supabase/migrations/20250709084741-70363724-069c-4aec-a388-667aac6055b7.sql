
-- Drop the problematic policy that references auth.users table directly
DROP POLICY IF EXISTS "Administrators can manage all event requests" ON public.event_requests;

-- Update the RLS policies to use proper admin check without referencing auth.users
-- Keep existing policies for users and public access
-- Update admin policies to use the admin_users table properly

-- Allow admins to view all event requests (updated policy)
DROP POLICY IF EXISTS "Admins can view all event requests" ON public.event_requests;
CREATE POLICY "Admins can view all event requests" 
ON public.event_requests 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Allow admins to update all event requests (updated policy)  
DROP POLICY IF EXISTS "Admins can update all event requests" ON public.event_requests;
CREATE POLICY "Admins can update all event requests" 
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

-- Allow admins to insert event requests (for admin management)
CREATE POLICY "Admins can insert event requests" 
ON public.event_requests 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);
