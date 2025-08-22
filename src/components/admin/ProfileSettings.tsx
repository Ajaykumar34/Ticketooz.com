
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, MapPin, Calendar, Save, Upload, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ProfileSettingsProps {
  user: any;
}

const ProfileSettings = ({ user }: ProfileSettingsProps) => {
  const [formData, setFormData] = useState({
    name: user?.name || 'Admin User',
    email: user?.email || 'admin@ticketooz.com',
    phone: '+1 (555) 123-4567',
    address: '123 Admin Street, City, State 12345',
    bio: 'Experienced platform administrator with expertise in event management and user engagement.',
    company: 'Ticketooz Inc.',
    position: 'Platform Administrator'
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const { toast } = useToast();

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ 
      title: "Profile Updated", 
      description: "Your profile has been successfully updated." 
    });
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ 
        title: "Password Mismatch", 
        description: "New password and confirmation do not match.",
        variant: "destructive"
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({ 
        title: "Password Too Short", 
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }

    setIsUpdatingPassword(true);

    try {
      console.log('Starting password update process...');

      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.error('No valid session found:', sessionError);
        toast({ 
          title: "Authentication Error", 
          description: "Please log in again to update your password.",
          variant: "destructive"
        });
        return;
      }

      console.log('Session found, calling edge function...');

      // Call the update-password edge function
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
          title: "Password Update Failed", 
          description: error.message || "Failed to update password. Please try again.",
          variant: "destructive"
        });
        return;
      }

      if (data?.success) {
        // Clear the password form
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });

        // Show success message and inform user they need to login again
        toast({ 
          title: "Password Updated Successfully", 
          description: "Your password has been updated. Please log in again with your new password.",
        });

        // Clear local auth state to prevent automatic login
        localStorage.setItem('user_signed_out', 'true');
        
        // Sign out to force re-authentication with new password
        await supabase.auth.signOut({ scope: 'global' });
        
        // Force page reload to clear any cached auth state
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
        
      } else {
        toast({ 
          title: "Password Update Failed", 
          description: data?.error || "Failed to update password. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Password update error:', error);
      toast({ 
        title: "Password Update Failed", 
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const stats = [
    { label: 'Events Managed', value: '156', icon: Calendar },
    { label: 'Total Users', value: '2,847', icon: User },
    { label: 'Active Venues', value: '24', icon: MapPin },
    { label: 'Platform Uptime', value: '99.9%', icon: Shield }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Profile Settings</h2>
        <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Overview</CardTitle>
          <CardDescription>Your administrator profile and activity summary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-6 mb-6">
            <div className="relative">
              <Avatar className="w-20 h-20">
                <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xl">
                  {formData.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <Button size="sm" className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0">
                <Upload className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1">
              <h3 className="text-xl font-semibold">{formData.name}</h3>
              <p className="text-gray-600">{formData.position} at {formData.company}</p>
              <div className="flex items-center space-x-4 mt-2">
                <Badge className="bg-green-100 text-green-800">
                  <Shield className="w-3 h-3 mr-1" />
                  Administrator
                </Badge>
                <span className="text-sm text-gray-500">Member since Jan 2024</span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                  <Icon className="w-6 h-6 mx-auto text-blue-600 mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details and contact information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Position</label>
                  <Input
                    value={formData.position}
                    onChange={(e) => setFormData({...formData, position: e.target.value})}
                    placeholder="Your position"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="Enter your email"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="Enter your phone number"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Company</label>
                <Input
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  placeholder="Your company"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Address</label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Enter your address"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Bio</label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  placeholder="Tell us about yourself"
                  rows={3}
                />
              </div>
              
              <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Security Settings</CardTitle>
            <CardDescription>Update your password and security preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Password</label>
                <Input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  placeholder="Enter current password"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <Input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  placeholder="Enter new password"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm New Password</label>
                <Input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  placeholder="Confirm new password"
                  required
                />
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Password Requirements:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• At least 6 characters long</li>
                  <li>• Include uppercase and lowercase letters</li>
                  <li>• Include at least one number</li>
                  <li>• Include at least one special character</li>
                </ul>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
                disabled={isUpdatingPassword}
              >
                <Shield className="w-4 h-4 mr-2" />
                {isUpdatingPassword ? 'Updating Password...' : 'Update Password'}
              </Button>
            </form>

            {/* Two-Factor Authentication */}
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-sm font-medium mb-3">Two-Factor Authentication</h4>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Enable 2FA</p>
                  <p className="text-xs text-gray-600">Add an extra layer of security</p>
                </div>
                <Button variant="outline" size="sm">
                  Enable
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSettings;
