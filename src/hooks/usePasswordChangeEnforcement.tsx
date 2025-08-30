
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const usePasswordChangeEnforcement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.user_metadata?.force_password_change === true) {
      toast.error('You must change your password before continuing', {
        duration: 5000,
      });
      
      // Redirect to a password change page or show password change modal
      // For now, we'll redirect to profile page where password can be changed
      navigate('/profile?force_password_change=true');
    }
  }, [user, navigate]);

  return {
    requiresPasswordChange: user?.user_metadata?.force_password_change === true
  };
};
