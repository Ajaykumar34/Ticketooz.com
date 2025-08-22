
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChangeEmailRequest {
  newEmail: string;
  currentEmail: string;
  userId: string;
  otpCode?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { newEmail, currentEmail, userId, otpCode }: ChangeEmailRequest = await req.json();

    console.log('Processing email change:', { newEmail, currentEmail, userId, hasOtpCode: !!otpCode });

    // Initialize Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // If OTP code is provided, verify it first
    if (otpCode) {
      const { data: otpRecord, error: fetchError } = await supabaseAdmin
        .from('otp_verifications')
        .select('*')
        .eq('email', newEmail)
        .eq('otp_code', otpCode)
        .eq('purpose', 'email_change')
        .eq('user_id', userId)
        .eq('verified', false)
        .single();

      if (fetchError || !otpRecord) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid or expired OTP code' 
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      // Check if OTP has expired
      const now = new Date();
      const expiresAt = new Date(otpRecord.expires_at);
      
      if (now > expiresAt) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'OTP has expired. Please request a new one.' 
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      // Mark OTP as verified
      const { error: updateOtpError } = await supabaseAdmin
        .from('otp_verifications')
        .update({ 
          verified: true, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', otpRecord.id);

      if (updateOtpError) {
        console.error('Update OTP error:', updateOtpError);
        throw new Error('Failed to verify OTP');
      }
    }

    // Update user's email in Supabase Auth (bypassing email confirmation when OTP verified)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { 
        email: newEmail,
        email_confirm: otpCode ? true : false  // Skip email confirmation if OTP was verified
      }
    );

    if (authError) {
      console.error('Auth update error:', authError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: authError.message 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Update email in profile table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        email: newEmail,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Profile update error:', profileError);
      // Don't fail the whole process for profile errors, but log it
    }

    console.log('Email change successful:', { newEmail, userId });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email updated successfully',
        data: authData
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in change-email function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to change email' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
