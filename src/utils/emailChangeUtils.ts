
import { supabase } from '@/integrations/supabase/client';

export interface ChangeEmailRequest {
  newEmail: string;
  currentEmail: string;
  userId: string;
}

export interface ChangeEmailResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

export const changeUserEmail = async (request: ChangeEmailRequest): Promise<ChangeEmailResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke('change-email', {
      body: request,
    });

    if (error) {
      console.error('Change email error:', error);
      return {
        success: false,
        error: error.message || 'Failed to change email',
      };
    }

    return data;
  } catch (error: any) {
    console.error('Change email request error:', error);
    return {
      success: false,
      error: error.message || 'Failed to change email',
    };
  }
};
