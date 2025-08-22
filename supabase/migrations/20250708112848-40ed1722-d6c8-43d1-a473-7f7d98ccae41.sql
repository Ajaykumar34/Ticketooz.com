
-- Fix the admin_delete_user function to handle type conversions properly
CREATE OR REPLACE FUNCTION public.admin_delete_user(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Find the user ID for the given email (ensure proper type casting)
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email::text;
  
  -- Check if user exists
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Delete from related tables first to avoid foreign key constraints
  -- Delete from admin_users if exists
  DELETE FROM public.admin_users WHERE user_id = target_user_id;
  
  -- Delete from profiles
  DELETE FROM public.profiles WHERE id = target_user_id;
  
  -- Delete from bookings (set user_id to null to preserve booking records)
  UPDATE public.bookings SET user_id = NULL WHERE user_id = target_user_id;
  
  -- Delete from auth related tables
  DELETE FROM auth.identities WHERE user_id = target_user_id;
  DELETE FROM auth.sessions WHERE user_id = target_user_id;
  DELETE FROM auth.refresh_tokens WHERE user_id = target_user_id;
  DELETE FROM auth.mfa_factors WHERE user_id = target_user_id;
  DELETE FROM auth.mfa_challenges WHERE user_id = target_user_id;
  
  -- Finally delete from auth.users
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to delete user: %', SQLERRM;
END;
$$;
