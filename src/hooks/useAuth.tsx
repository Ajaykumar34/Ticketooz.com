
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    // Get initial session only if user hasn't signed out
    const initSession = async () => {
      try {
        // Check if user manually signed out
        const signedOut = localStorage.getItem('user_signed_out');
        if (signedOut === 'true') {
          console.log('User manually signed out, skipping auto-login');
          if (mounted) {
            setSession(null);
            setUser(null);
            setLoading(false);
          }
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        if (mounted) {
          setSession(null);
          setUser(null); 
          setLoading(false);
        }
      }
    };

    initSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth event:', event, 'Session exists:', !!session);
        
        // Check if user manually signed out and prevent auto-login
        const signedOut = localStorage.getItem('user_signed_out');
        
        if (signedOut === 'true') {
          console.log('User signed out flag detected, preventing auto-login');
          
          // If we get a SIGNED_IN event but user has signed out flag, ignore it
          if (event === 'SIGNED_IN') {
            console.log('Ignoring SIGNED_IN event due to sign out flag');
            // Ensure we sign out again to clear any lingering session
            supabase.auth.signOut({ scope: 'global' });
            return;
          }
          
          // For other events, ensure we stay logged out
          if (event !== 'SIGNED_OUT') {
            setSession(null);
            setUser(null);
            return;
          }
        }
        
        // Check if user is blocked when session changes
        if (session?.user && event === 'SIGNED_IN') {
          setTimeout(async () => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('is_blocked')
              .eq('id', session.user.id)
              .single();

            if (profile?.is_blocked) {
              console.log('User is blocked, signing out...');
              await supabase.auth.signOut();
              return;
            }
          }, 0);
        }
        
        // Normal auth state handling
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          navigate('/');
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signIn = async (email: string, password: string) => {
    try {
      // Clear the signed out flag on successful login
      localStorage.removeItem('user_signed_out');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      // Check if user is blocked after successful authentication
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_blocked, blocked_reason')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          return { error: profileError };
        }

        if (profile?.is_blocked) {
          // Sign out the user immediately
          await supabase.auth.signOut();
          return { 
            error: { 
              message: profile.blocked_reason || 'Your account has been blocked. Please contact support for assistance.' 
            } 
          };
        }
      }

      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
          emailRedirectTo: `${window.location.origin}/`
        },
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out...');
      
      // Set flag to prevent automatic re-login
      localStorage.setItem('user_signed_out', 'true');
      
      // Clear local state first
      setUser(null);
      setSession(null);
      
      // Clear all auth-related localStorage items except our flag
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('supabase.auth')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear session storage as well
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('supabase.auth')) {
          sessionStorage.removeItem(key);
        }
      });
      
      // Sign out from Supabase
      await supabase.auth.signOut({ scope: 'global' });
      
      console.log('Signed out successfully');
      
      // Force reload to clear any cached auth state
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      // Still clear everything and force reload
      localStorage.setItem('user_signed_out', 'true');
      setUser(null);
      setSession(null);
      window.location.href = '/';
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
