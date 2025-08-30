
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get request body with admin details
    const { email, temporaryPassword, firstName, lastName } = await req.json()

    // Validate required fields
    if (!email || !temporaryPassword || !firstName || !lastName) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: email, temporaryPassword, firstName, lastName' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate password strength
    if (temporaryPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters long' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Starting secure admin user creation process for:', email)

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      return new Response(
        JSON.stringify({ error: `Failed to check existing users: ${listError.message}` }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const existingUser = existingUsers.users?.find(u => u.email === email)
    
    let userId: string
    
    if (existingUser) {
      console.log('Admin user already exists, using existing user ID:', existingUser.id)
      userId = existingUser.id
      
      // Update password for existing user and mark for password change
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { 
          password: temporaryPassword,
          user_metadata: {
            ...existingUser.user_metadata,
            force_password_change: true,
            password_changed_at: null
          }
        }
      )
      
      if (updateError) {
        console.error('Error updating user password:', updateError)
        return new Response(
          JSON.stringify({ error: `Failed to update password: ${updateError.message}` }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    } else {
      // Create the admin user with temporary password
      console.log('Creating new admin user...')
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          force_password_change: true,
          password_changed_at: null
        }
      })

      if (authError) {
        console.error('Error creating user:', authError)
        return new Response(
          JSON.stringify({ error: `Failed to create user: ${authError.message}` }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      if (!authData.user) {
        console.error('No user data returned from auth.admin.createUser')
        return new Response(
          JSON.stringify({ error: 'No user data returned' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      userId = authData.user.id
      console.log('Created new admin user with ID:', userId)
    }

    // Check if profiles table exists and create/update profile record
    console.log('Managing profile record...')
    const { error: profileUpsertError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        first_name: firstName,
        last_name: lastName,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (profileUpsertError) {
      console.error('Error upserting profile:', profileUpsertError)
      // Don't fail the entire operation for profile errors
    } else {
      console.log('Profile upserted successfully')
    }

    // Check if admin_users table exists and create/update admin record
    console.log('Managing admin_users record...')
    const { error: adminUpsertError } = await supabaseAdmin
      .from('admin_users')
      .upsert({
        user_id: userId,
        role: 'super_admin',
        permissions: {
          events: true,
          venues: true,
          categories: true,
          users: true,
          bookings: true,
          reports: true,
          workshops: true,
          carousel: true,
          tags: true
        },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (adminUpsertError) {
      console.error('Error upserting admin_users:', adminUpsertError)
      // Don't fail the entire operation for admin_users errors
    } else {
      console.log('Admin_users record upserted successfully')
    }

    // Log the admin creation for security audit
    try {
      await supabaseAdmin
        .from('profile_access_logs')
        .insert({
          user_id: userId,
          accessed_profile_id: userId,
          action: 'admin_user_created',
          ip_address: req.headers.get('x-forwarded-for') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown'
        })
    } catch (logError) {
      console.error('Failed to log admin creation:', logError)
      // Don't fail the operation for logging errors
    }

    console.log('Secure admin user setup completed successfully for:', email)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin user created/updated successfully with temporary password. User must change password on first login.',
        user: {
          id: userId,
          email: email,
          force_password_change: true
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error in create-admin-user function:', error)
    return new Response(
      JSON.stringify({ 
        error: `Internal server error: ${error.message}`,
        details: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
