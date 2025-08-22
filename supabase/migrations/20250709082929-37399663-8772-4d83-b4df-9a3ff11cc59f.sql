
-- Enable RLS on event_requests table (if not already enabled)
ALTER TABLE public.event_requests ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own event requests
CREATE POLICY "Users can view their own event requests" 
ON public.event_requests 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to create their own event requests
CREATE POLICY "Users can create their own event requests" 
ON public.event_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own event requests (only if status is 'pending')
CREATE POLICY "Users can update their own pending event requests" 
ON public.event_requests 
FOR UPDATE 
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Allow admins to view all event requests
CREATE POLICY "Admins can view all event requests" 
ON public.event_requests 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Allow admins to update all event requests (for status changes and admin notes)
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

-- Allow public to insert event requests (for unauthenticated users)
CREATE POLICY "Allow public to create event requests" 
ON public.event_requests 
FOR INSERT 
WITH CHECK (true);
