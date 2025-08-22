import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, UserCheck, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import UserDataManagement from './UserDataManagement';

type AdminRole = Database['public']['Enums']['admin_role'];

interface AdminUser {
  id: string;
  user_id: string;
  role: AdminRole;
  permissions: {
    events: boolean;
    venues: boolean;
    categories: boolean;
    users: boolean;
    bookings: boolean;
    reports: boolean;
    workshops: boolean;
    carousel: boolean;
    tags: boolean;
  };
  created_at: string;
  updated_at: string;
  profile?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

const AdminUserManagement = () => {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    password: '',
    role: 'admin' as AdminRole,
    permissions: {
      events: false,
      venues: false,
      categories: false,
      users: false,
      bookings: false,
      reports: false,
      workshops: false,
      carousel: false,
      tags: false,
    }
  });

  useEffect(() => {
    fetchAdminUsers();
  }, []);

  const fetchAdminUsers = async () => {
    try {
      console.log('Fetching admin users...');
      
      // First get admin users
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('*');

      if (adminError) {
        console.error('Error fetching admin users:', adminError);
        throw adminError;
      }

      console.log('Admin users fetched:', adminData);

      if (!adminData?.length) {
        setAdminUsers([]);
        return;
      }

      // Get user IDs to fetch profiles
      const userIds = adminData.map(admin => admin.user_id);

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Continue without profiles data
      }

      console.log('Profiles fetched:', profilesData);

      // Combine admin data with profile data
      const enrichedAdminUsers: AdminUser[] = adminData.map(admin => {
        const profile = profilesData?.find(p => p.id === admin.user_id);
        
        return {
          ...admin,
          permissions: typeof admin.permissions === 'object' && admin.permissions !== null
            ? admin.permissions as any
            : {
                events: false,
                venues: false,
                categories: false,
                users: false,
                bookings: false,
                reports: false,
                workshops: false,
                carousel: false,
                tags: false,
              },
          profile: profile ? {
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            email: profile.email || ''
          } : null
        };
      });

      setAdminUsers(enrichedAdminUsers);
    } catch (error: any) {
      console.error('Error fetching admin users:', error);
      toast.error(`Failed to fetch admin users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingAdmin) {
        console.log('Updating admin user:', editingAdmin.id);
        
        // Update existing admin
        const { error } = await supabase
          .from('admin_users')
          .update({
            role: formData.role,
            permissions: formData.permissions,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAdmin.id);

        if (error) {
          console.error('Error updating admin:', error);
          throw error;
        }
        
        toast.success('Admin updated successfully');
      } else {
        console.log('Creating new admin user...');
        
        // Create new user and admin record
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              first_name: formData.first_name,
              last_name: formData.last_name,
              phone: formData.phone
            }
          }
        });

        if (authError) {
          console.error('Error creating user:', authError);
          throw authError;
        }

        if (authData.user) {
          console.log('User created, adding admin record...');
          
          const { error: adminError } = await supabase
            .from('admin_users')
            .insert({
              user_id: authData.user.id,
              role: formData.role,
              permissions: formData.permissions
            });

          if (adminError) {
            console.error('Error creating admin record:', adminError);
            throw adminError;
          }
          
          toast.success('Admin created successfully');
        }
      }

      setIsAddDialogOpen(false);
      setEditingAdmin(null);
      resetForm();
      fetchAdminUsers();
    } catch (error: any) {
      console.error('Error saving admin:', error);
      toast.error(error.message || 'Failed to save admin');
    }
  };

  const handleDelete = async (adminId: string) => {
    if (!confirm('Are you sure you want to delete this admin?')) return;

    try {
      console.log('Deleting admin user:', adminId);
      
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', adminId);

      if (error) {
        console.error('Error deleting admin:', error);
        throw error;
      }
      
      toast.success('Admin deleted successfully');
      fetchAdminUsers();
    } catch (error: any) {
      console.error('Error deleting admin:', error);
      toast.error(`Failed to delete admin: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      phone: '',
      password: '',
      role: 'admin',
      permissions: {
        events: false,
        venues: false,
        categories: false,
        users: false,
        bookings: false,
        reports: false,
        workshops: false,
        carousel: false,
        tags: false,
      }
    });
  };

  const handleEdit = (admin: AdminUser) => {
    console.log('Editing admin:', admin);
    setEditingAdmin(admin);
    setFormData({
      email: admin.profile?.email || '',
      first_name: admin.profile?.first_name || '',
      last_name: admin.profile?.last_name || '',
      phone: '',
      password: '',
      role: admin.role,
      permissions: admin.permissions
    });
    setIsAddDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading admin users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Admin User Management</h2>
          <p className="text-gray-600">Manage admin users and their permissions, or view and manage all users</p>
        </div>
      </div>

      <Tabs defaultValue="admin-users" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="admin-users" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Admin Users
          </TabsTrigger>
          <TabsTrigger value="all-users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            All Users (Block/Unblock)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admin-users" className="space-y-6">
          <div className="flex items-center justify-end">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setEditingAdmin(null); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Admin
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingAdmin ? 'Edit Admin' : 'Add New Admin'}</DialogTitle>
                  <DialogDescription>
                    {editingAdmin ? 'Update admin details and permissions' : 'Create a new admin user with specific permissions'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {!editingAdmin && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">First Name *</label>
                          <Input
                            value={formData.first_name}
                            onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Last Name *</label>
                          <Input
                            value={formData.last_name}
                            onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Email *</label>
                          <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Phone</label>
                          <Input
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Password *</label>
                        <Input
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          required
                        />
                      </div>
                    </>
                  )}
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Role</label>
                    <Select 
                      value={formData.role} 
                      onValueChange={(value: AdminRole) => setFormData({...formData, role: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium">Permissions</label>
                    <div className="grid grid-cols-3 gap-4">
                      {Object.entries(formData.permissions).map(([key, value]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={key}
                            checked={value}
                            onCheckedChange={(checked) => 
                              setFormData({
                                ...formData,
                                permissions: {
                                  ...formData.permissions,
                                  [key]: checked
                                }
                              })
                            }
                          />
                          <label htmlFor={key} className="text-sm capitalize">
                            {key}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1">
                      {editingAdmin ? 'Update Admin' : 'Create Admin'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setIsAddDialogOpen(false);
                        setEditingAdmin(null);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {adminUsers.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Admin Users Found</h3>
                <p className="text-gray-600 mb-4">Get started by creating your first admin user.</p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Admin
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {adminUsers.map((admin) => (
                <Card key={admin.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <UserCheck className="w-5 h-5" />
                          {admin.profile?.first_name} {admin.profile?.last_name}
                          <Badge variant={admin.role === 'super_admin' ? 'default' : 'secondary'}>
                            {admin.role.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </CardTitle>
                        <CardDescription>{admin.profile?.email}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(admin)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(admin.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Permissions:</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(admin.permissions).map(([key, value]) => (
                          value && (
                            <Badge key={key} variant="outline" className="text-xs">
                              {key.charAt(0).toUpperCase() + key.slice(1)}
                            </Badge>
                          )
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all-users">
          <UserDataManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminUserManagement;
