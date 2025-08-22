
import { supabase } from '@/integrations/supabase/client';

export interface SendOTPRequest {
  email: string;
  purpose: 'registration' | 'password_reset' | 'email_change';
  user_id?: string;
}

export interface VerifyOTPRequest {
  email: string;
  otp_code: string;
  purpose: 'registration' | 'password_reset' | 'email_change';
}

export interface OTPResponse {
  success: boolean;
  message?: string;
  error?: string;
  user_id?: string;
}

export const sendOTP = async (request: SendOTPRequest): Promise<OTPResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-otp', {
      body: request,
    });

    if (error) {
      console.error('SendGrid OTP error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send OTP',
      };
    }

    return data;
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send OTP',
    };
  }
};

export const verifyOTP = async (request: VerifyOTPRequest): Promise<OTPResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke('verify-otp', {
      body: request,
    });

    if (error) {
      console.error('Verify OTP error:', error);
      return {
        success: false,
        error: error.message || 'Failed to verify OTP',
      };
    }

    return data;
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify OTP',
    };
  }
};

export const formatOTPCode = (value: string): string => {
  // Remove non-digits and limit to 6 characters
  return value.replace(/\D/g, '').slice(0, 6);
};

export const validateOTPCode = (code: string): boolean => {
  return /^\d{6}$/.test(code);
};
