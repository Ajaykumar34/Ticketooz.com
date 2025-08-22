
-- Check if the admin user exists in auth.users (we can't directly query this, but we can check profiles)
SELECT 'Profiles table check:' as check_type, count(*) as count FROM profiles WHERE email = 'admin@dexotix.com';

-- Check admin_users table
SELECT 'Admin users table check:' as check_type, count(*) as count FROM admin_users;

-- Check if there's a profile with admin privileges
SELECT 
  p.email,
  p.first_name,
  p.last_name,
  au.role,
  au.permissions
FROM profiles p
LEFT JOIN admin_users au ON p.id = au.user_id
WHERE p.email = 'admin@dexotix.com';
