
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import OTPInput from './OTPInput';
import { sendOTP, verifyOTP } from '@/utils/otpUtils';

interface OTPVerificationProps {
  email: string;
  purpose: 'registration' | 'password_reset' | 'email_change';
  onVerified: (user_id?: string) => void;
  onBack: () => void;
  user_id?: string;
}

const OTPVerification = ({ 
  email, 
  purpose, 
  onVerified, 
  onBack, 
  user_id 
}: OTPVerificationProps) => {
  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    // Start 60-second countdown for resend button
    setCountdown(60);
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the complete 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);

    try {
      const result = await verifyOTP({
        email,
        otp_code: otpCode,
        purpose,
      });

      if (result.success) {
        toast({
          title: "Verification Successful",
          description: "Your email has been verified successfully",
        });
        onVerified(result.user_id);
      } else {
        toast({
          title: "Verification Failed",
          description: result.error || "Invalid or expired OTP code",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Verification Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    setIsResending(true);

    try {
      const result = await sendOTP({
        email,
        purpose,
        user_id,
      });

      if (result.success) {
        toast({
          title: "OTP Sent",
          description: "A new verification code has been sent to your email",
        });
        setOtpCode('');
        setCountdown(60);
      } else {
        toast({
          title: "Failed to Send OTP",
          description: result.error || "Please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend OTP",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const getPurposeText = () => {
    switch (purpose) {
      case 'registration':
        return 'complete your registration';
      case 'password_reset':
        return 'reset your password';
      case 'email_change':
        return 'verify your email change';
      default:
        return 'verify your email';
    }
  };

  return (
    <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto w-full flex items-center justify-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Ticketooz</h2>
        </div>
        <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
        <CardDescription>
          We've sent a 6-digit verification code to <br />
          <span className="font-medium text-gray-700">{email}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Enter the code to {getPurposeText()}
            </p>
            <OTPInput
              value={otpCode}
              onChange={setOtpCode}
              disabled={isVerifying}
            />
          </div>

          <Button 
            onClick={handleVerifyOTP}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            disabled={isVerifying || otpCode.length !== 6}
          >
            {isVerifying ? 'Verifying...' : 'Verify Code'}
          </Button>
        </div>

        <div className="text-center space-y-4">
          <div className="text-sm text-gray-600">
            Didn't receive the code?
          </div>
          
          {countdown > 0 ? (
            <p className="text-sm text-gray-500">
              Resend code in {countdown} seconds
            </p>
          ) : (
            <Button
              variant="ghost"
              onClick={handleResendOTP}
              disabled={isResending}
              className="text-blue-600 hover:text-blue-800"
            >
              {isResending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {isResending ? 'Sending...' : 'Resend Code'}
            </Button>
          )}
        </div>

        <div className="flex justify-center">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default OTPVerification;
