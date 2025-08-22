
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Mail } from 'lucide-react';
import { sendOTP } from '@/utils/otpUtils';
import OTPVerification from './OTPVerification';
import NewPasswordForm from './NewPasswordForm';

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

const ForgotPasswordForm = ({ onBackToLogin }: ForgotPasswordFormProps) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [showNewPasswordForm, setShowNewPasswordForm] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await sendOTP({
        email,
        purpose: 'password_reset'
      });

      if (result.success) {
        setShowOTPVerification(true);
        toast({
          title: "Verification Code Sent",
          description: "Please check your email for the verification code",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to send verification code. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerified = () => {
    setShowOTPVerification(false);
    setShowNewPasswordForm(true);
    toast({
      title: "Email Verified",
      description: "You can now set your new password",
    });
  };

  const handlePasswordUpdateSuccess = () => {
    setShowNewPasswordForm(false);
    setEmailSent(true);
    toast({
      title: "Password Updated Successfully",
      description: "You can now login with your new password",
    });
  };

  const handleBackFromOTP = () => {
    setShowOTPVerification(false);
  };

  const handleBackFromNewPassword = () => {
    setShowNewPasswordForm(false);
    setShowOTPVerification(true);
  };

  if (showNewPasswordForm) {
    return (
      <NewPasswordForm
        email={email}
        onBack={handleBackFromNewPassword}
        onSuccess={handlePasswordUpdateSuccess}
      />
    );
  }

  if (showOTPVerification) {
    return (
      <OTPVerification
        email={email}
        purpose="password_reset"
        onVerified={handleOTPVerified}
        onBack={handleBackFromOTP}
      />
    );
  }

  if (emailSent) {
    return (
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-full flex items-center justify-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Ticketooz</h2>
          </div>
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Password Updated</CardTitle>
          <CardDescription>
            Your password has been successfully updated
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              Your password has been updated successfully. You can now login with your new password.
            </p>
            <Button 
              onClick={() => {
                setEmailSent(false);
                setEmail('');
              }}
              variant="outline"
              className="w-full h-12 mb-2"
            >
              Reset Another Password
            </Button>
            <Button 
              onClick={onBackToLogin}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto w-full flex items-center justify-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Ticketooz</h2>
        </div>
        <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
        <CardDescription>
          Enter your email address to verify your identity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12"
              required
            />
          </div>
          <Button 
            type="submit" 
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            disabled={isLoading}
          >
            {isLoading ? 'Sending Code...' : 'Send Verification Code'}
          </Button>
        </form>
        
        <div className="mt-6 text-center">
          <Button 
            onClick={onBackToLogin}
            variant="ghost" 
            className="text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ForgotPasswordForm;
