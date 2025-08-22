
-- Add blocking functionality to profiles table (already exists but let's ensure proper structure)
-- The profiles table already has is_blocked, blocked_at, and blocked_reason columns

-- Create a table to track blocked contacts
CREATE TABLE IF NOT EXISTS public.blocked_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  phone TEXT,
  mobile_number TEXT,
  blocked_user_id UUID REFERENCES public.profiles(id),
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  blocked_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_blocked_email UNIQUE(email),
  CONSTRAINT unique_blocked_phone UNIQUE(phone),
  CONSTRAINT unique_blocked_mobile UNIQUE(mobile_number)
);

-- Enable RLS on blocked_contacts table
ALTER TABLE public.blocked_contacts ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to manage blocked contacts
CREATE POLICY "Admins can manage blocked contacts" 
ON public.blocked_contacts 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM admin_users 
  WHERE user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM admin_users 
  WHERE user_id = auth.uid()
));

-- Create function to block a user and their contacts
CREATE OR REPLACE FUNCTION public.block_user_with_contacts(
  p_user_id UUID,
  p_reason TEXT DEFAULT 'Administrative action'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile RECORD;
BEGIN
  -- Get user profile information
  SELECT * INTO user_profile 
  FROM profiles 
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update profile to blocked status
  UPDATE profiles 
  SET 
    is_blocked = TRUE,
    blocked_at = NOW(),
    blocked_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Add contacts to blocked_contacts table
  INSERT INTO blocked_contacts (email, phone, mobile_number, blocked_user_id, blocked_reason)
  VALUES (
    user_profile.email,
    user_profile.phone,
    user_profile.mobile_number,
    p_user_id,
    p_reason
  )
  ON CONFLICT DO NOTHING;
  
  RETURN TRUE;
END;
$$;

-- Create function to unblock a user and their contacts
CREATE OR REPLACE FUNCTION public.unblock_user_with_contacts(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update profile to unblocked status
  UPDATE profiles 
  SET 
    is_blocked = FALSE,
    blocked_at = NULL,
    blocked_reason = NULL,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Remove contacts from blocked_contacts table
  DELETE FROM blocked_contacts 
  WHERE blocked_user_id = p_user_id;
  
  RETURN TRUE;
END;
$$;

-- Create function to check if contact is blocked
CREATE OR REPLACE FUNCTION public.is_contact_blocked(
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_mobile TEXT DEFAULT NULL
)
RETURNS TABLE(is_blocked BOOLEAN, reason TEXT)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE as is_blocked,
    bc.blocked_reason as reason
  FROM blocked_contacts bc
  WHERE 
    (p_email IS NOT NULL AND bc.email = p_email) OR
    (p_phone IS NOT NULL AND bc.phone = p_phone) OR
    (p_mobile IS NOT NULL AND bc.mobile_number = p_mobile)
  LIMIT 1;
  
  -- If no blocked contact found, return false
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE as is_blocked, NULL::TEXT as reason;
  END IF;
END;
$$;
