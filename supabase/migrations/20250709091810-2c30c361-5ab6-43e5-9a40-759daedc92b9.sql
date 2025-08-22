-- Add current user as an admin (replace with actual user ID from auth.users if needed)
-- First, let's check who you are currently logged in as
INSERT INTO admin_users (user_id, role, permissions)
VALUES (
  auth.uid(),
  'admin',
  '{"bookings": true, "carousel": true, "categories": true, "event-requests": true, "events": true, "reports": true, "tags": true, "users": true, "venues": true, "workshops": true}'::jsonb
) 
ON CONFLICT (user_id) DO NOTHING;