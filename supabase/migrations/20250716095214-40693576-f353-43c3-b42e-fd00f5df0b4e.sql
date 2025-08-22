
-- Add mobile_number field to profiles table if not exists (for storing user mobile numbers)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mobile_number TEXT;

-- Create index on mobile_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_mobile_number ON profiles(mobile_number);

-- Create a function to find user by mobile number
CREATE OR REPLACE FUNCTION get_user_by_mobile(mobile_num TEXT)
RETURNS TABLE(user_id UUID, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.email
  FROM profiles p
  WHERE p.mobile_number = mobile_num
  LIMIT 1;
END;
$$;
