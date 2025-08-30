import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Phone, MapPin, Calendar as CalendarIcon, Save, Edit, Clock, Star, Shield, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { usePasswordChangeEnforcement } from '@/hooks/usePasswordChangeEnforcement';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
  'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 
  'Puducherry', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu'
];

interface CustomerData {
  id: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  mobile_number: string;
  birthday: string | null;
  gender: string | null;
  is_married: boolean | null;
  anniversary_date: string | null;
  address_line_1: string;
  address_line_2: string;
  landmark: string;
  city: string;
  pin_code: string;
  state: string;
  created_at: string;
  status: 'active' | 'inactive';
  preferred_categories: string[];
}

const CustomerProfile = () => {
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<CustomerData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const { requiresPasswordChange } = usePasswordChangeEnforcement();

  // Birthday and anniversary date states
  const [birthday, setBirthday] = useState<Date>();
  const [anniversaryDate, setAnniversaryDate] = useState<Date>();
  
  // Email change functionality
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  
  // Password change functionality
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    loadCustomerProfile();
  }, [user, navigate]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('force_password_change') === 'true' || requiresPasswordChange) {
      toast({
        title: 'Password Change Required',
        description: 'You must change your password to continue using the system',
        variant: 'destructive',
      });
    }
  }, [requiresPasswordChange]);

  const loadCustomerProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (data) {
        const customerProfile: CustomerData = {
          id: data.id,
          first_name: data.first_name || '',
          middle_name: data.middle_name || '',
          last_name: data.last_name || '',
          email: data.email || user?.email || '',
          mobile_number: data.mobile_number || '',
          birthday: data.birthday || null,
          gender: data.gender || null,
          is_married: data.is_married || null,
          anniversary_date: data.anniversary_date || null,
          address_line_1: data.address_line_1 || '',
          address_line_2: data.address_line_2 || '',
          landmark: data.landmark || '',
          city: data.city || '',
          pin_code: data.pin_code || '',
          state: data.state || '',
          created_at: data.created_at || new Date().toISOString(),
          status: 'active',
          preferred_categories: ['Music', 'Theater'],
        };
        
        setCustomerData(customerProfile);
        setEditData(customerProfile);
        
        // Set date states for calendar components
        if (customerProfile.birthday) {
          setBirthday(new Date(customerProfile.birthday));
        }
        if (customerProfile.anniversary_date) {
          setAnniversaryDate(new Date(customerProfile.anniversary_date));
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to load profile', 
        variant: 'destructive' 
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!newEmail || !user?.id) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { 
          email: newEmail, 
          purpose: 'email_change',
          user_id: user.id 
        }
      });

      if (error) throw error;

      if (data?.success) {
        setIsVerifyingOtp(true);
        toast({ 
          title: 'OTP Sent', 
          description: 'Check your new email for the OTP code.' 
        });
      } else {
        toast({ 
          title: 'Failed to send OTP', 
          description: data?.error || 'Please try again.', 
          variant: 'destructive' 
        });
      }
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast({ 
        title: 'Failed to send OTP', 
        description: error.message || 'Please try again.', 
        variant: 'destructive' 
      });
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !newEmail || !user?.id) return;
    
    try {
      // Use the change-email function with OTP verification
      const { data, error } = await supabase.functions.invoke('change-email', {
        body: { 
          newEmail: newEmail,
          currentEmail: customerData?.email || user.email,
          userId: user.id,
          otpCode: otp
        }
      });

      if (error) throw error;

      if (data?.success) {
        setEmailVerified(true);
        setEditData(prev => ({ ...prev, email: newEmail }));
        setCustomerData(prev => prev ? { ...prev, email: newEmail } : null);
        
        toast({ 
          title: 'Email Updated', 
          description: 'Your email has been successfully updated in both your profile and authentication. You can now login with your new email.' 
        });
      } else {
        toast({ 
          title: 'Invalid OTP', 
          description: data?.error || 'Please check your OTP and try again.', 
          variant: 'destructive' 
        });
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast({ 
        title: 'Verification Failed', 
        description: error.message || 'Please try again.', 
        variant: 'destructive' 
      });
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'New password and confirmation do not match.',
        variant: 'destructive'
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: 'Password Too Short',
        description: 'Password must be at least 8 characters long.',
        variant: 'destructive'
      });
      return;
    }

    setIsUpdatingPassword(true);

    try {
      console.log('Starting password update process...');

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.error('No valid session found:', sessionError);
        toast({
          title: 'Authentication Error',
          description: 'Please log in again to update your password.',
          variant: 'destructive'
        });
        return;
      }

      console.log('Session found, calling edge function...');

      const { data, error } = await supabase.functions.invoke('update-password', {
        body: {
          newPassword: passwordData.newPassword
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        toast({
          title: 'Password Update Failed',
          description: error.message || 'Failed to update password. Please try again.',
          variant: 'destructive'
        });
        return;
      }

      if (data?.success) {
        // Clear the force_password_change flag if it was set
        if (requiresPasswordChange) {
          await supabase.auth.updateUser({
            data: {
              force_password_change: false,
              password_changed_at: new Date().toISOString()
            }
          });
        }

        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });

        toast({
          title: 'Password Updated Successfully',
          description: requiresPasswordChange 
            ? 'Your password has been updated. You can now use the system normally.'
            : 'Your password has been updated. Please log in again with your new password.',
        });

        if (!requiresPasswordChange) {
          localStorage.setItem('user_signed_out', 'true');
          await supabase.auth.signOut({ scope: 'global' });
          setTimeout(() => {
            window.location.href = '/login';
          }, 1000);
        } else {
          // Refresh the page to clear the force password change state
          window.location.reload();
        }
        
      } else {
        toast({
          title: 'Password Update Failed',
          description: data?.error || 'Failed to update password. Please try again.',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Password update error:', error);
      toast({
        title: 'Password Update Failed',
        description: error.message || 'An unexpected error occurred. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSave = async () => {
    if (isEditingEmail && !emailVerified) {
      toast({
        title: 'Email Not Verified',
        description: 'Please verify your new email before saving.',
        variant: 'destructive'
      });
      return;
    }

    if (!customerData) return;
    
    setIsLoading(true);
    
    try {
      const updateData = {
        first_name: editData.first_name,
        middle_name: editData.middle_name,
        last_name: editData.last_name,
        email: editData.email,
        mobile_number: editData.mobile_number,
        birthday: birthday ? format(birthday, 'yyyy-MM-dd') : null,
        gender: editData.gender,
        is_married: editData.is_married,
        anniversary_date: anniversaryDate ? format(anniversaryDate, 'yyyy-MM-dd') : null,
        address_line_1: editData.address_line_1,
        address_line_2: editData.address_line_2,
        landmark: editData.landmark,
        city: editData.city,
        pin_code: editData.pin_code,
        state: editData.state,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', customerData.id);

      if (error) throw error;

      setCustomerData({ ...customerData, ...editData, ...updateData });
      setIsEditing(false);
      setIsEditingEmail(false);
      setEmailVerified(false);
      setOtp('');
      setNewEmail('');
      setIsVerifyingOtp(false);
      toast({ title: 'Success', description: 'Profile updated successfully' });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to update profile', 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading customer profile...</div>
        </div>
      </div>
    );
  }

  if (!customerData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Customer profile not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Show password change alert if required */}
        {requiresPasswordChange && (
          <div className="mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <Shield className="w-5 h-5 text-red-600 mr-2" />
                <div>
                  <h3 className="text-red-800 font-medium">Password Change Required</h3>
                  <p className="text-red-700 text-sm mt-1">
                    For security reasons, you must change your password before continuing to use the system.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Avatar className="w-20 h-20">
                <AvatarImage src="" />
                <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xl">
                  {customerData.first_name[0]}{customerData.last_name[0]}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {customerData.first_name} {customerData.middle_name} {customerData.last_name}
                </h1>
                <p className="text-gray-600 flex items-center mt-1">
                  <Mail className="w-4 h-4 mr-2" />
                  {customerData.email}
                </p>
                <div className="flex items-center space-x-4 mt-2">
                  <Badge className={getStatusColor(customerData.status)}>
                    {customerData.status}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    Member since {new Date(customerData.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            
            <Button
              onClick={() => setIsEditing(!isEditing)}
              variant={isEditing ? "outline" : "default"}
            >
              <Edit className="w-4 h-4 mr-2" />
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Button>
          </div>
        </div>

        <Tabs defaultValue={requiresPasswordChange ? "security" : "profile"} className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile" disabled={requiresPasswordChange}>Profile Information</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="preferences" disabled={requiresPasswordChange}>Preferences</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  {isEditing ? 'Edit your profile information' : 'View your profile information'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* First Name */}
                  <div>
                    <Label className="text-sm font-medium mb-2">First Name *</Label>
                    {isEditing ? (
                      <Input
                        value={editData.first_name || ''}
                        onChange={(e) => setEditData({...editData, first_name: e.target.value})}
                        required
                      />
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-md">{customerData.first_name}</p>
                    )}
                  </div>

                  {/* Middle Name */}
                  <div>
                    <Label className="text-sm font-medium mb-2">Middle Name</Label>
                    {isEditing ? (
                      <Input
                        value={editData.middle_name || ''}
                        onChange={(e) => setEditData({...editData, middle_name: e.target.value})}
                      />
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-md">{customerData.middle_name || '-'}</p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div>
                    <Label className="text-sm font-medium mb-2">Last Name</Label>
                    {isEditing ? (
                      <Input
                        value={editData.last_name || ''}
                        onChange={(e) => setEditData({...editData, last_name: e.target.value})}
                      />
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-md">{customerData.last_name || '-'}</p>
                    )}
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <Label className="text-sm font-medium mb-2">Mobile Number *</Label>
                    {isEditing ? (
                      <Input
                        value={editData.mobile_number || ''}
                        onChange={(e) => setEditData({...editData, mobile_number: e.target.value})}
                        required
                      />
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-md">{customerData.mobile_number}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium mb-2">Email</Label>
                    {isEditing && !isEditingEmail ? (
                      <div className="flex gap-2 items-center">
                        <Input value={customerData.email} disabled className="opacity-70" />
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => { 
                            setIsEditingEmail(true); 
                            setNewEmail(customerData.email); 
                          }}
                        >
                          Change Email
                        </Button>
                      </div>
                    ) : isEditing && isEditingEmail ? (
                      <div className="space-y-2">
                        <Input 
                          type="email" 
                          value={newEmail} 
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="Enter new email address"
                        />
                        {!emailVerified && (
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={handleSendOtp}
                          >
                            Send OTP
                          </Button>
                        )}
                        {isVerifyingOtp && (
                          <div className="space-y-2">
                            <Input 
                              type="text" 
                              value={otp} 
                              onChange={(e) => setOtp(e.target.value)} 
                              placeholder="Enter OTP code"
                            />
                            <Button 
                              type="button" 
                              variant="outline"
                              onClick={handleVerifyOtp}
                            >
                              Verify OTP
                            </Button>
                          </div>
                        )}
                        {emailVerified && (
                          <p className="text-green-600 text-sm font-medium">✓ Email verified!</p>
                        )}
                      </div>
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-md">{customerData.email}</p>
                    )}
                  </div>

                  {/* Birthday */}
                  <div>
                    <Label className="text-sm font-medium mb-2">Birthday</Label>
                    {isEditing ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
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
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-md">
                        {customerData.birthday ? format(new Date(customerData.birthday), "PPP") : '-'}
                      </p>
                    )}
                  </div>

                  {/* Identity (Gender) */}
                  <div>
                    <Label className="text-sm font-medium mb-2">Identity</Label>
                    {isEditing ? (
                      <Select value={editData.gender || ''} onValueChange={(value) => setEditData({...editData, gender: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-md">{customerData.gender || '-'}</p>
                    )}
                  </div>

                  {/* Married */}
                  <div>
                    <Label className="text-sm font-medium mb-2">Married?</Label>
                    {isEditing ? (
                      <div className="flex items-center space-x-4 pt-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="married-yes"
                            checked={editData.is_married === true}
                            onCheckedChange={(checked) => {
                              setEditData({...editData, is_married: checked as boolean});
                              if (!checked) setAnniversaryDate(undefined);
                            }}
                          />
                          <Label htmlFor="married-yes">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="married-no"
                            checked={editData.is_married === false}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setEditData({...editData, is_married: false});
                                setAnniversaryDate(undefined);
                              }
                            }}
                          />
                          <Label htmlFor="married-no">No</Label>
                        </div>
                      </div>
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-md">
                        {customerData.is_married === true ? 'Yes' : customerData.is_married === false ? 'No' : '-'}
                      </p>
                    )}
                  </div>

                  {/* Anniversary Date - only show if married */}
                  {(editData.is_married === true || customerData.is_married === true) && (
                    <div className="md:col-span-3">
                      <Label className="text-sm font-medium mb-2">Anniversary Date</Label>
                      {isEditing ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
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
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-md">
                          {customerData.anniversary_date ? format(new Date(customerData.anniversary_date), "PPP") : '-'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Address Line 1 */}
                  <div className="md:col-span-3">
                    <Label className="text-sm font-medium mb-2">Address Line 1 *</Label>
                    {isEditing ? (
                      <Input
                        value={editData.address_line_1 || ''}
                        onChange={(e) => setEditData({...editData, address_line_1: e.target.value})}
                        required
                      />
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-md">{customerData.address_line_1}</p>
                    )}
                  </div>

                  {/* Address Line 2 */}
                  <div className="md:col-span-3">
                    <Label className="text-sm font-medium mb-2">Address Line 2</Label>
                    {isEditing ? (
                      <Input
                        value={editData.address_line_2 || ''}
                        onChange={(e) => setEditData({...editData, address_line_2: e.target.value})}
                      />
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-md">{customerData.address_line_2 || '-'}</p>
                    )}
                  </div>

                  {/* Landmark */}
                  <div>
                    <Label className="text-sm font-medium mb-2">Landmark</Label>
                    {isEditing ? (
                      <Input
                        value={editData.landmark || ''}
                        onChange={(e) => setEditData({...editData, landmark: e.target.value})}
                      />
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-md">{customerData.landmark || '-'}</p>
                    )}
                  </div>

                  {/* Town / City */}
                  <div>
                    <Label className="text-sm font-medium mb-2">Town / City *</Label>
                    {isEditing ? (
                      <Input
                        value={editData.city || ''}
                        onChange={(e) => setEditData({...editData, city: e.target.value})}
                        required
                      />
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-md">{customerData.city}</p>
                    )}
                  </div>

                  {/* Area PIN Code */}
                  <div>
                    <Label className="text-sm font-medium mb-2">Area PIN Code</Label>
                    {isEditing ? (
                      <Input
                        value={editData.pin_code || ''}
                        onChange={(e) => setEditData({...editData, pin_code: e.target.value})}
                        pattern="[0-9]{6}"
                        maxLength={6}
                      />
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-md">{customerData.pin_code || '-'}</p>
                    )}
                  </div>

                  {/* State */}
                  <div className="md:col-span-3">
                    <Label className="text-sm font-medium mb-2">State *</Label>
                    {isEditing ? (
                      <Select value={editData.state || ''} onValueChange={(value) => setEditData({...editData, state: value})}>
                        <SelectTrigger>
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
                    ) : (
                      <p className="p-3 bg-gray-50 rounded-md">{customerData.state}</p>
                    )}
                  </div>
                </div>
                
                {isEditing && (
                  <div className="mt-6">
                    <Button onClick={handleSave} disabled={isLoading}>
                      <Save className="w-4 h-4 mr-2" />
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  {requiresPasswordChange 
                    ? 'You must change your password to continue using the system'
                    : 'Update your password and security preferences'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {!requiresPasswordChange && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Current Password</label>
                      <div className="relative">
                        <Input
                          type={showPasswords.current ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                          placeholder="Enter current password"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">New Password</label>
                    <div className="relative">
                      <Input
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                        placeholder="Enter new password"
                        className="pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Confirm New Password</label>
                    <div className="relative">
                      <Input
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                        placeholder="Confirm new password"
                        className="pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Password Requirements:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• At least 8 characters long</li>
                      <li>• Include uppercase and lowercase letters</li>
                      <li>• Include at least one number</li>
                      <li>• Include at least one special character</li>
                    </ul>
                  </div>
                  
                  <Button 
                    onClick={handlePasswordChange}
                    className={`w-full ${requiresPasswordChange ? 'bg-red-600 hover:bg-red-700' : 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700'}`}
                    disabled={isUpdatingPassword}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {isUpdatingPassword 
                      ? 'Updating Password...' 
                      : requiresPasswordChange 
                        ? 'Change Password (Required)' 
                        : 'Update Password'
                    }
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Event Preferences</CardTitle>
                <CardDescription>Your favorite event categories and preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <label className="block text-sm font-medium mb-3">Preferred Categories</label>
                  <div className="flex flex-wrap gap-2">
                    {customerData.preferred_categories.map((category, index) => (
                      <Badge key={index} variant="secondary">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CustomerProfile;
