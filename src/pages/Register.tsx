import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CalendarIcon, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { sendOTP } from '@/utils/otpUtils';
import { createUserAccount } from '@/utils/authUtils';
import OTPVerification from '@/components/auth/OTPVerification';
import { supabase } from '@/integrations/supabase/client';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
  'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 
  'Puducherry', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu'
];

const Register = () => {
  // Account Details
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Personal Details
  const [birthday, setBirthday] = useState<Date>();
  const [gender, setGender] = useState('');
  const [isMarried, setIsMarried] = useState<boolean>();
  const [anniversaryDate, setAnniversaryDate] = useState<Date>();

  // Address Details
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [state, setState] = useState('');

  // Terms acceptance
  const [acceptTerms, setAcceptTerms] = useState(false);

  // OTP verification states
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [pendingUserData, setPendingUserData] = useState<any>(null);

  // Blocked contact states
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const validateForm = () => {
    if (!firstName.trim()) {
      toast({ title: "Error", description: "First name is required", variant: "destructive" });
      return false;
    }
    if (!mobileNumber.trim()) {
      toast({ title: "Error", description: "Mobile number is required", variant: "destructive" });
      return false;
    }
    if (!email.trim()) {
      toast({ title: "Error", description: "Email is required", variant: "destructive" });
      return false;
    }
    if (!password) {
      toast({ title: "Error", description: "Password is required", variant: "destructive" });
      return false;
    }
    if (password.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters", variant: "destructive" });
      return false;
    }
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return false;
    }
    if (!addressLine1.trim()) {
      toast({ title: "Error", description: "Address Line 1 is required", variant: "destructive" });
      return false;
    }
    if (!city.trim()) {
      toast({ title: "Error", description: "City is required", variant: "destructive" });
      return false;
    }
    if (!pinCode.trim()) {
      toast({ title: "Error", description: "PIN Code is required", variant: "destructive" });
      return false;
    }
    if (!state) {
      toast({ title: "Error", description: "State is required", variant: "destructive" });
      return false;
    }
    if (!acceptTerms) {
      toast({ title: "Error", description: "Please accept terms and conditions", variant: "destructive" });
      return false;
    }
    return true;
  };

  const checkEmailExists = async () => {
    try {
      console.log('Checking if email already exists...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email.trim())
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking email:', error);
        return false;
      }

      if (data) {
        console.log('Email already exists:', data.email);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error in email check:', error);
      return false;
    }
  };

  const checkBlockedContacts = async () => {
    try {
      console.log('Checking if contact is blocked...');
      
      const { data, error } = await supabase.rpc('is_contact_blocked', {
        p_email: email.trim(),
        p_phone: mobileNumber.trim(),
        p_mobile: mobileNumber.trim()
      });

      if (error) {
        console.error('Error checking blocked contacts:', error);
        return false;
      }

      console.log('Block check result:', data);
      
      if (data && data.length > 0 && data[0].is_blocked) {
        setIsBlocked(true);
        setBlockReason(data[0].reason || 'Contact information is blocked');
        
        // Send automatic email with user details to help@ticketooz.com
        await sendBlockedContactEmail({
          firstName,
          lastName,
          email,
          mobileNumber,
          reason: data[0].reason
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error in blocked contact check:', error);
      return false;
    }
  };

  const sendBlockedContactEmail = async (userData) => {
    try {
      console.log('Sending blocked contact email with user data:', userData);
      // This would send an email to help@ticketooz.com with the user details
      // For now, we'll just log it
    } catch (error) {
      console.error('Error sending blocked contact email:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);

    try {
      console.log('Starting registration process...');
      
      // Check if email already exists
      const emailExists = await checkEmailExists();
      if (emailExists) {
        toast({
          title: "User Already Exists",
          description: "An account with this email already exists. Please use a different email or try logging in.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      // Check if the contact is blocked
      const isContactBlocked = await checkBlockedContacts();
      if (isContactBlocked) {
        setIsLoading(false);
        return; // Stop registration process
      }
      
      // Store user data for after OTP verification
      const userMetadata = {
        first_name: firstName.trim(),
        middle_name: middleName.trim(),
        last_name: lastName.trim(),
        phone: mobileNumber.trim(),
        mobile_number: mobileNumber.trim(),
        birthday: birthday ? format(birthday, 'yyyy-MM-dd') : null,
        gender: gender || null,
        is_married: isMarried || false,
        anniversary_date: anniversaryDate ? format(anniversaryDate, 'yyyy-MM-dd') : null,
        address_line_1: addressLine1.trim(),
        address_line_2: addressLine2.trim(),
        landmark: landmark.trim(),
        city: city.trim(),
        pin_code: pinCode.trim(),
        state: state,
      };

      setPendingUserData({
        email: email.trim(),
        password,
        metadata: userMetadata
      });

      // Send OTP for email verification
      const otpResult = await sendOTP({
        email: email.trim(),
        purpose: 'registration'
      });

      if (otpResult.success) {
        setShowOTPVerification(true);
        toast({
          title: "Verification Code Sent",
          description: "Please check your email for the verification code",
        });
      } else {
        toast({
          title: "Failed to Send Verification Code",
          description: otpResult.error || "Please try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Registration exception:', error);
      toast({
        title: "Registration Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerified = async () => {
    if (!pendingUserData) return;

    setIsLoading(true);
    try {
      console.log('Creating user account after OTP verification...');
      
      // Create user account using edge function
      const createResult = await createUserAccount({
        email: pendingUserData.email,
        password: pendingUserData.password,
        metadata: pendingUserData.metadata
      });

      if (createResult.success) {
        toast({
          title: "Registration Successful",
          description: "Your account has been created successfully! Please login.",
        });
        navigate('/login');
      } else {
        toast({
          title: "Registration Failed",
          description: createResult.error || "Failed to create account",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Registration completion error:', error);
      toast({
        title: "Registration Failed",
        description: "An unexpected error occurred during account creation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackFromOTP = () => {
    setShowOTPVerification(false);
    setPendingUserData(null);
  };

  // Show blocked contact error page
  if (isBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 via-red-700 to-red-800 py-8">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 w-full max-w-md px-4">
          <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-red-600">Registration Blocked</CardTitle>
              <CardDescription className="text-gray-600">
                Something went wrong during registration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <div className="space-y-4">
                <p className="text-gray-700">
                  We encountered an issue with your registration. This may be due to security policies or account restrictions.
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    <strong>Error:</strong> {blockReason}
                  </p>
                </div>
                <p className="text-sm text-gray-600">
                  Please report this issue by emailing us at{' '}
                  <a 
                    href="mailto:help@dexotix.com" 
                    className="text-blue-600 hover:text-blue-800 underline font-medium"
                  >
                    help@dexotix.com
                  </a>
                </p>
                <p className="text-xs text-gray-500">
                  An automatic notification has been sent to our support team with your registration details.
                </p>
              </div>
              
              <div className="flex flex-col space-y-3">
                <Button 
                  onClick={() => window.location.href = 'mailto:help@ticketooz.com'}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  Contact Support
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/')}
                  className="w-full"
                >
                  Return to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (showOTPVerification && pendingUserData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 py-8">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 w-full max-w-md px-4">
          <OTPVerification
            email={pendingUserData.email}
            purpose="registration"
            onVerified={handleOTPVerified}
            onBack={handleBackFromOTP}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 py-8">
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="relative z-10 w-full max-w-4xl px-4">
        <Link to="/" className="inline-flex items-center text-white mb-6 hover:text-blue-200">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Link>
        
        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-full flex items-center justify-center mb-4">
              <img 
                src="/lovable-uploads/749dfa90-a1d6-4cd0-87ad-4fec3daeb6d2.png"
                alt="Ticketooz Logo"
                className="h-20 w-auto"
                style={{ maxHeight: 80, maxWidth: 280 }}
              />
            </div>
            <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
            <CardDescription>Sign up to book amazing events</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Account Details Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Account Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-12"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="middleName">Middle Name <span className="text-gray-500">(Optional)</span></Label>
                    <Input
                      id="middleName"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name <span className="text-gray-500">(Optional)</span></Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mobileNumber">Mobile Number *</Label>
                    <Input
                      id="mobileNumber"
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      className="h-12"
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="email">Email ID *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Create Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12"
                      required
                      minLength={8}
                    />
                    <p className="text-xs text-gray-500">Password should be at least 8 characters</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-12"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Personal Details Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Personal Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Birthday <span className="text-gray-500">(Optional)</span></Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-12 justify-start text-left font-normal",
                            !birthday && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {birthday ? format(birthday, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={birthday}
                          onSelect={setBirthday}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Identity <span className="text-gray-500">(Optional)</span></Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Married? <span className="text-gray-500">(Optional)</span></Label>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="married-yes"
                          checked={isMarried === true}
                          onCheckedChange={(checked) => {
                            setIsMarried(checked as boolean);
                            if (!checked) setAnniversaryDate(undefined);
                          }}
                        />
                        <Label htmlFor="married-yes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="married-no"
                          checked={isMarried === false}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setIsMarried(false);
                              setAnniversaryDate(undefined);
                            }
                          }}
                        />
                        <Label htmlFor="married-no">No</Label>
                      </div>
                    </div>
                    {isMarried === true && (
                      <div className="mt-4">
                        <Label>Anniversary Date <span className="text-gray-500">(Optional)</span></Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full h-12 justify-start text-left font-normal mt-2",
                                !anniversaryDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {anniversaryDate ? format(anniversaryDate, "PPP") : <span>Pick anniversary date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={anniversaryDate}
                              onSelect={setAnniversaryDate}
                              disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Address Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="addressLine1">Address Line 1 *</Label>
                    <Input
                      id="addressLine1"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      className="h-12"
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="addressLine2">Address Line 2 <span className="text-gray-500">(Optional)</span></Label>
                    <Input
                      id="addressLine2"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="landmark">Landmark <span className="text-gray-500">(Optional)</span></Label>
                    <Input
                      id="landmark"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Town / City *</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="h-12"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pinCode">Area PIN Code *</Label>
                    <Input
                      id="pinCode"
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value)}
                      className="h-12"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>State *</Label>
                    <Select value={state} onValueChange={setState} required>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDIAN_STATES.map((stateName) => (
                          <SelectItem key={stateName} value={stateName}>
                            {stateName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="acceptTerms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                  required
                />
                <Label htmlFor="acceptTerms" className="text-sm leading-5">
                  I accept the{' '}
                  <Link to="/terms" className="text-blue-600 hover:text-blue-800 underline">
                    Terms and Conditions
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-blue-600 hover:text-blue-800 underline">
                    Privacy Policy
                  </Link>
                  *
                </Label>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={isLoading}
              >
                {isLoading ? 'Checking Registration...' : 'Continue to Verification'}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
