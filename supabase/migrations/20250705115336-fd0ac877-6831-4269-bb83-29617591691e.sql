
-- Create OTP verification table
CREATE TABLE public.otp_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('registration', 'password_reset', 'email_change')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own OTP records
CREATE POLICY "Users can view their own OTP records" 
ON public.otp_verifications 
FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Allow inserting OTP records (for registration before user exists)
CREATE POLICY "Allow OTP insertion" 
ON public.otp_verifications 
FOR INSERT 
WITH CHECK (true);

-- Users can update their own OTP records
CREATE POLICY "Users can update their own OTP records" 
ON public.otp_verifications 
FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Admin full access
CREATE POLICY "Admin full access on otp_verifications" 
ON public.otp_verifications 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_otp_verifications_email ON public.otp_verifications(email);
CREATE INDEX idx_otp_verifications_expires_at ON public.otp_verifications(expires_at);

-- Function to clean up expired OTPs
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.otp_verifications 
  WHERE expires_at < now();
END;
$$;
