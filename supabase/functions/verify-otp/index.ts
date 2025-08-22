
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyOTPRequest {
  email: string;
  otp_code: string;
  purpose: 'registration' | 'password_reset' | 'email_change';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otp_code, purpose }: VerifyOTPRequest = await req.json();

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the OTP record
    const { data: otpRecord, error: fetchError } = await supabaseClient
      .from('otp_verifications')
      .select('*')
      .eq('email', email)
      .eq('otp_code', otp_code)
      .eq('purpose', purpose)
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

    // Check attempt limit (max 5 attempts)
    if (otpRecord.attempts >= 5) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Too many failed attempts. Please request a new OTP.' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Mark OTP as verified
    const { error: updateError } = await supabaseClient
      .from('otp_verifications')
      .update({ 
        verified: true, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', otpRecord.id);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error('Failed to verify OTP');
    }

    console.log('OTP verified successfully:', { email, purpose });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'OTP verified successfully',
        user_id: otpRecord.user_id 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in verify-otp function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to verify OTP' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
