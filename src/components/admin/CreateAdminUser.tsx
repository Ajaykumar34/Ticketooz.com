
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const CreateAdminUser = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    temporaryPassword: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ 
      ...prev, 
      temporaryPassword: password, 
      confirmPassword: password 
    }));
    toast.success('Secure password generated. Please save it securely.');
  };

  const validateForm = () => {
    if (!formData.email || !formData.temporaryPassword || !formData.firstName || !formData.lastName) {
      toast.error('All fields are required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    if (formData.temporaryPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return false;
    }

    if (formData.temporaryPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }

    return true;
  };

  const createAdminUser = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      console.log('Creating secure admin user...');
      
      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: {
          email: formData.email,
          temporaryPassword: formData.temporaryPassword,
          firstName: formData.firstName,
          lastName: formData.lastName
        }
      });

      if (error) {
        console.error('Error creating admin user:', error);
        toast.error(`Failed to create admin user: ${error.message}`);
        return;
      }

      if (data?.success) {
        toast.success(`Admin user created successfully! The user must change their password on first login.`);
        console.log('Admin user created:', data);
        
        // Clear form
        setFormData({
          email: '',
          temporaryPassword: '',
          confirmPassword: '',
          firstName: '',
          lastName: ''
        });
      } else {
        toast.error(data?.error || 'Failed to create admin user');
      }
    } catch (error: any) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Create Secure Admin User
        </CardTitle>
        <CardDescription>
          Create a new admin user with a temporary password. The user will be required to change their password on first login.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This will create a new admin user with full system access. The temporary password will be required to be changed on first login for security.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              placeholder="Enter first name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              placeholder="Enter last name"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="Enter email address"
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="temporaryPassword">Temporary Password *</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generateSecurePassword}
            >
              Generate Secure Password
            </Button>
          </div>
          <div className="relative">
            <Input
              id="temporaryPassword"
              type={showPassword ? "text" : "password"}
              value={formData.temporaryPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, temporaryPassword: e.target.value }))}
              placeholder="Enter temporary password (min 8 characters)"
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password *</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Confirm temporary password"
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Security Notes:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Password must be at least 8 characters long</li>
            <li>• User will be forced to change password on first login</li>
            <li>• Admin will have full system access permissions</li>
            <li>• All admin actions are logged for security audit</li>
          </ul>
        </div>

        <Button 
          onClick={createAdminUser} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Creating Admin User...' : 'Create Secure Admin User'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CreateAdminUser;
