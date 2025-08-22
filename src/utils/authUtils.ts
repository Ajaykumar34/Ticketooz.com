
import { supabase } from '@/integrations/supabase/client';

export interface CreateUserRequest {
  email: string;
  password: string;
  metadata: any;
}

export interface CreateUserResponse {
  success: boolean;
  message?: string;
  error?: string;
  user?: any;
}

export const createUserAccount = async (request: CreateUserRequest): Promise<CreateUserResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: request,
    });

    if (error) {
      console.error('Create user error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create user account',
      };
    }

    return data;
  } catch (error: any) {
    console.error('Create user account error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create user account',
    };
  }
};
