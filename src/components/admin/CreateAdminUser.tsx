
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CreateAdminUser = () => {
  const [loading, setLoading] = useState(false);

  const createAdminUser = async () => {
    setLoading(true);
    try {
      console.log('Creating admin user...');
      
      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: {}
      });

      if (error) {
        console.error('Error creating admin user:', error);
        toast.error(`Failed to create admin user: ${error.message}`);
        return;
      }

      if (data?.success) {
        toast.success('Admin user created successfully! You can now login with admin1@ticketooz.com');
        console.log('Admin user created:', data);
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
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create Admin User</CardTitle>
        <CardDescription>
          Create the admin user account for admin1@ticketooz.com
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={createAdminUser} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Creating...' : 'Create Admin User'}
        </Button>
        <p className="text-sm text-gray-600 mt-4">
          This will create a user with email: admin1@ticketooz.com and password: admin123
        </p>
      </CardContent>
    </Card>
  );
};

export default CreateAdminUser;
