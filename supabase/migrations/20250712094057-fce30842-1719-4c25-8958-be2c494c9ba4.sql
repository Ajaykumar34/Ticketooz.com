
-- First, we'll use the create-user edge function to create the admin account
-- Since we can't directly insert into auth.users, we'll need to create the user through the proper channels
-- But we can directly insert into admin_users table assuming the user will be created

-- Let's create a temporary function to help with this process
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- We'll assume the user will be created with a specific UUID for consistency
    -- In practice, this should be done through the Supabase Auth API
    admin_user_id := '00000000-0000-0000-0000-000000000001';
    
    -- Insert into admin_users table with all permissions
    INSERT INTO admin_users (user_id, role, permissions)
    VALUES (
        admin_user_id,
        'super_admin',
        '{
            "events": true,
            "venues": true,
            "categories": true,
            "users": true,
            "bookings": true,
            "reports": true,
            "workshops": true,
            "carousel": true,
            "tags": true
        }'::jsonb
    )
    ON CONFLICT (user_id) DO UPDATE SET
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions,
        updated_at = now();
        
    -- Also insert a profile record
    INSERT INTO profiles (id, email, first_name, last_name)
    VALUES (
        admin_user_id,
        'admin@dexotix.com',
        'Admin',
        'User'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        updated_at = now();
END $$;
