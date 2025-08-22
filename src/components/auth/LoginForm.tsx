
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LoginFormProps {
  onLogin: (user: any) => void;
}

const LoginForm = ({ onLogin }: LoginFormProps) => {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [emailOrMobile, setEmailOrMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Helper function to detect if input is email or mobile
  const isEmail = (input: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input);
  };

  const isMobile = (input: string) => {
    const mobileRegex = /^[+]?[\d\s\-\(\)]{10,}$/;
    return mobileRegex.test(input.replace(/\s/g, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let loginResult;
      
      if (isEmail(emailOrMobile)) {
        // Login with email
        loginResult = await signIn(emailOrMobile, password);
      } else if (isMobile(emailOrMobile)) {
        // Login with mobile number - find user by mobile and use their email
        const { data: userData, error: userError } = await supabase.rpc('get_user_by_mobile', {
          mobile_num: emailOrMobile.replace(/\s/g, '')
        });

        if (userError || !userData || userData.length === 0) {
          setError('No account found with this mobile number. Please check your number or sign up.');
          setLoading(false);
          return;
        }

        // Use the email associated with the mobile number for login
        loginResult = await signIn(userData[0].email, password);
      } else {
        setError('Please enter a valid email address or mobile number.');
        setLoading(false);
        return;
      }

      const { error } = loginResult;
      
      if (error) {
        console.error('Login error:', error);
        
        // Check if it's a blocked user error
        if (error.message && (error.message.includes('blocked') || error.message.includes('Your account has been blocked'))) {
          toast({
            title: "Account Blocked",
            description: "You are blocked by admin. Contact to administrator",
            variant: "destructive",
          });
          setError(''); // Clear regular error since we're showing toast
        } else if (error.message?.includes('Invalid login credentials')) {
          setError('Invalid credentials. Please check your email/mobile and password.');
        } else if (error.message?.includes('Email not confirmed')) {
          setError('Please verify your email address before signing in.');
        } else {
          setError(error.message || 'Login failed. Please try again.');
        }
      } else {
        onLogin({ email: emailOrMobile });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getInputPlaceholder = () => {
    return "Enter your email or mobile number";
  };

  const getInputType = () => {
    if (isEmail(emailOrMobile)) return "email";
    if (isMobile(emailOrMobile)) return "tel";
    return "text";
  };

  return (
    <>
      <Card className="w-full max-w-md mx-auto bg-white/95 backdrop-blur-sm shadow-2xl border-0">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">Admin Login</CardTitle>
          <p className="text-sm text-gray-600">Sign in with your admin account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailOrMobile" className="text-gray-700">Email or Mobile Number</Label>
              <Input
                id="emailOrMobile"
                type={getInputType()}
                placeholder={getInputPlaceholder()}
                value={emailOrMobile}
                onChange={(e) => setEmailOrMobile(e.target.value)}
                required
                className="border-gray-300 focus:border-blue-500"
              />
              {emailOrMobile && (
                <p className="text-xs text-gray-500">
                  {isEmail(emailOrMobile) && "✓ Email format detected"}
                  {isMobile(emailOrMobile) && "✓ Mobile number format detected"}
                  {!isEmail(emailOrMobile) && !isMobile(emailOrMobile) && emailOrMobile.length > 0 && "Please enter a valid email or mobile number"}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-gray-300 focus:border-blue-500 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Need Admin Access?</h3>
            <p className="text-xs text-blue-700">
              Contact your system administrator to create an admin account for you. 
              Admin accounts must be created through the admin user management system.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default LoginForm;
