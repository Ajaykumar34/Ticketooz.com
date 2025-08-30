
-- CRITICAL SECURITY FIX: Replace public profiles access with secure user-specific access
DROP POLICY IF EXISTS "Public read access for profiles" ON public.profiles;

-- Allow users to view only their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT 
USING (auth.uid() = id);

-- Allow users to update only their own profile  
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow admins to view all profiles for user management
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM admin_users 
  WHERE user_id = auth.uid()
));

-- Allow admins to update all profiles for user management
CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM admin_users 
  WHERE user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM admin_users 
  WHERE user_id = auth.uid()
));

-- Add missing RLS policies for tables that have RLS enabled but no policies
CREATE POLICY "Users can view their own tickets" ON public.tickets
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM bookings b 
  WHERE b.id = tickets.booking_id 
    AND b.user_id = auth.uid()
));

-- Secure database functions by adding search_path restriction
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_by_mobile(mobile_num text)
RETURNS TABLE(user_id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.email
  FROM public.profiles p
  WHERE p.mobile_number = mobile_num
  LIMIT 1;
END;
$$;

-- Add security audit logging for profile access
CREATE TABLE IF NOT EXISTS public.profile_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  accessed_profile_id uuid REFERENCES public.profiles(id),
  action text NOT NULL,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.profile_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view access logs" ON public.profile_access_logs
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM admin_users 
  WHERE user_id = auth.uid()
));

CREATE POLICY "System can insert access logs" ON public.profile_access_logs
FOR INSERT 
WITH CHECK (true);
