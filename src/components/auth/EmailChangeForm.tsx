
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Mail } from 'lucide-react';
import { sendOTP } from '@/utils/otpUtils';
import { changeUserEmail } from '@/utils/emailChangeUtils';
import OTPVerification from './OTPVerification';
import { useAuth } from '@/hooks/useAuth';

interface EmailChangeFormProps {
  currentEmail: string;
  onBack: () => void;
  onSuccess: () => void;
}

const EmailChangeForm = ({ currentEmail, onBack, onSuccess }: EmailChangeFormProps) => {
  const [newEmail, setNewEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [emailChanged, setEmailChanged] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newEmail === currentEmail) {
      toast({
        title: "Same Email",
        description: "Please enter a different email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await sendOTP({
        email: newEmail,
        purpose: 'email_change',
        user_id: user?.id
      });

      if (result.success) {
        setShowOTPVerification(true);
        toast({
          title: "Verification Code Sent",
          description: "Please check your new email for the verification code",
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

  const handleOTPVerified = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not found. Please login again.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await changeUserEmail({
        newEmail,
        currentEmail,
        userId: user.id
      });

      if (result.success) {
        setShowOTPVerification(false);
        setEmailChanged(true);
        toast({
          title: "Email Updated Successfully",
          description: "Your email has been changed. Please login with your new email.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "An unexpected error occurred while updating your email",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred while updating your email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackFromOTP = () => {
    setShowOTPVerification(false);
  };

  if (showOTPVerification) {
    return (
      <OTPVerification
        email={newEmail}
        purpose="email_change"
        onVerified={handleOTPVerified}
        onBack={handleBackFromOTP}
        user_id={user?.id}
      />
    );
  }

  if (emailChanged) {
    return (
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-full flex items-center justify-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Ticketooz</h2>
          </div>
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Email Updated</CardTitle>
          <CardDescription>
            Your email has been successfully changed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              Your email has been updated from <strong>{currentEmail}</strong> to <strong>{newEmail}</strong>.
              You will need to login again with your new email address.
            </p>
            <Button 
              onClick={onSuccess}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Continue
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
        <CardTitle className="text-2xl font-bold">Change Email</CardTitle>
        <CardDescription>
          Current email: {currentEmail}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Enter your new email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
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
            onClick={onBack}
            variant="ghost" 
            className="text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailChangeForm;
