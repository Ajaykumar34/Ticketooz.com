
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

const Login = () => {
  const [emailOrMobile, setEmailOrMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { signIn } = useAuth();

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
    setIsLoading(true);

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
          toast({
            title: "Mobile Login Failed",
            description: "No account found with this mobile number. Please check your number or sign up.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Use the email associated with the mobile number for login
        loginResult = await signIn(userData[0].email, password);
      } else {
        toast({
          title: "Invalid Input",
          description: "Please enter a valid email address or mobile number.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { error } = loginResult;

      if (error) {
        console.error('Login error:', error);
        
        let errorMessage = "Login failed. Please check your credentials.";
        
        if (error.message?.includes('Invalid login credentials')) {
          errorMessage = "Invalid email or password. Please check your credentials.";
        } else if (error.message?.includes('Email not confirmed')) {
          errorMessage = "Please check your email and confirm your account before logging in.";
        } else if (error.message?.includes('Too many requests')) {
          errorMessage = "Too many login attempts. Please wait a moment and try again.";
        }
        
        toast({
          title: "Login Failed",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });
        navigate('/');
      }
    } catch (error: any) {
      console.error('Unexpected login error:', error);
      toast({
        title: "Login Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getInputPlaceholder = () => {
    return "Email or mobile number";
  };

  const getInputType = () => {
    if (isEmail(emailOrMobile)) return "email";
    if (isMobile(emailOrMobile)) return "tel";
    return "text";
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 w-full max-w-md px-4">
          <ForgotPasswordForm onBackToLogin={() => setShowForgotPassword(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800">
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="relative z-10 w-full max-w-md px-4">
        <Link to="/" className="inline-flex items-center text-white mb-6 hover:text-blue-200">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Link>
        
        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-full flex items-center justify-center mb-4">
              <img 
                src="/lovable-uploads/749dfa90-a1d6-4cd0-87ad-4fec3daeb6d2.png"
                alt="Ticketooz"
                className="h-12 w-auto"
                style={{ maxHeight: 48, maxWidth: 180 }}
              />
            </div>
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
            <CardDescription>Sign in to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type={getInputType()}
                  placeholder={getInputPlaceholder()}
                  value={emailOrMobile}
                  onChange={(e) => setEmailOrMobile(e.target.value)}
                  className="h-12"
                  required
                  autoComplete="username"
                />
                {emailOrMobile && (
                  <p className="text-xs text-gray-500">
                    {isEmail(emailOrMobile) && "✓ Email format detected"}
                    {isMobile(emailOrMobile) && "✓ Mobile number format detected"}
                    {!isEmail(emailOrMobile) && !isMobile(emailOrMobile) && emailOrMobile.length > 0 && "Please enter a valid email or mobile number"}
                  </p>
                )}
              </div>
              <div className="space-y-2 relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pr-12"
                  required
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
            
            <div className="mt-4 text-center">
              <Button 
                variant="ghost" 
                onClick={() => setShowForgotPassword(true)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Forgot your password?
              </Button>
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Don't have an account?{' '}
                <Link to="/register" className="text-blue-600 hover:text-blue-800 font-medium">
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
