
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

    const adminEmail = 'admin1@dexotix.com'
    const adminPassword = 'admin123'

    console.log('Starting admin user creation process...')

    // First, check if user already exists
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

    const existingUser = existingUsers.users?.find(u => u.email === adminEmail)
    
    let userId: string
    
    if (existingUser) {
      console.log('Admin user already exists, using existing user ID:', existingUser.id)
      userId = existingUser.id
      
      // Update password for existing user
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password: adminPassword }
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
      // Create the admin user
      console.log('Creating new admin user...')
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          first_name: 'Admin',
          last_name: 'User'
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

    // Check if profiles table exists and create profile record
    console.log('Checking profiles table...')
    const { data: profileCheck, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (profileCheckError && !profileCheckError.message.includes('does not exist')) {
      console.error('Error checking profile:', profileCheckError)
    } else {
      // Try to upsert profile
      const { error: profileUpsertError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userId,
          email: adminEmail,
          first_name: 'Admin',
          last_name: 'User'
        }, {
          onConflict: 'id'
        })

      if (profileUpsertError) {
        console.error('Error upserting profile:', profileUpsertError)
        // Don't fail the entire operation for profile errors
      } else {
        console.log('Profile upserted successfully')
      }
    }

    // Check if admin_users table exists and create admin record
    console.log('Checking admin_users table...')
    const { data: adminCheck, error: adminCheckError } = await supabaseAdmin
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (adminCheckError && !adminCheckError.message.includes('does not exist')) {
      console.error('Error checking admin_users:', adminCheckError)
    } else {
      // Try to upsert admin_users record
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
          }
        }, {
          onConflict: 'user_id'
        })

      if (adminUpsertError) {
        console.error('Error upserting admin_users:', adminUpsertError)
        // Don't fail the entire operation for admin_users errors
      } else {
        console.log('Admin_users record upserted successfully')
      }
    }

    console.log('Admin user setup completed successfully for:', adminEmail)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin user created/updated successfully',
        user: {
          id: userId,
          email: adminEmail
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
