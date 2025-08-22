import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Users, Plus, Edit, Trash2, Mail, Phone, Calendar as CalendarIcon, Search, Shield, Ban, CheckCircle, MapPin, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type AdminRole = Database['public']['Enums']['admin_role'];

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all_roles');
  const [filterStatus, setFilterStatus] = useState('all_statuses');
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    mobileNumber: '',
    birthday: null,
    identity: '',
    married: false,
    addressLine1: '',
    addressLine2: '',
    landmark: '',
    townCity: '',
    areaPinCode: '',
    state: '',
    role: 'user',
    status: 'Active',
    permissions: {
      events: false,
      venues: false,
      categories: false,
      users: false,
      bookings: false,
      reports: false,
      workshops: false,
      carousel: false,
      tags: false
    }
  });
  const { toast } = useToast();

  const roles = ['user', 'organizer', 'admin', 'super_admin'].filter(role => role.trim() !== '');
  const statuses = ['Active', 'Inactive', 'Suspended'].filter(status => status.trim() !== '');
  const identityOptions = ['Male', 'Female', 'Other', 'Prefer not to say'];
  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
    'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 
    'Puducherry', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu'
  ];

  useEffect(() => {
    loadUsers();
    loadAdminUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAdminUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdminUsers(data || []);
    } catch (error) {
      console.error('Error loading admin users:', error);
    }
  };

  const getUserRole = (userId) => {
    const adminUser = adminUsers.find(admin => admin.user_id === userId);
    return adminUser ? adminUser.role : 'user';
  };

  const getUserPermissions = (userId) => {
    const adminUser = adminUsers.find(admin => admin.user_id === userId);
    return adminUser ? (typeof adminUser.permissions === 'string' ? JSON.parse(adminUser.permissions) : adminUser.permissions) : {};
  };

  const filteredUsers = users.filter(user => {
    const userRole = getUserRole(user.id);
    const matchesSearch = user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.mobile_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all_roles' || userRole === filterRole;
    const matchesStatus = filterStatus === 'all_statuses';
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.firstName || !formData.mobileNumber || !formData.addressLine1 || !formData.townCity || !formData.state) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (marked with *)",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingUser) {
        // Update user profile with all new fields
        const updateData = {
          first_name: formData.firstName,
          middle_name: formData.middleName,
          last_name: formData.lastName,
          email: formData.email,
          mobile_number: formData.mobileNumber,
          birthday: formData.birthday ? formData.birthday.toISOString().split('T')[0] : null,
          identity: formData.identity,
          married: formData.married,
          address_line_1: formData.addressLine1,
          address_line_2: formData.addressLine2,
          landmark: formData.landmark,
          town_city: formData.townCity,
          area_pin_code: formData.areaPinCode,
          state: formData.state
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', editingUser.id);

        if (profileError) throw profileError;

        // Handle admin role assignment - only for admin and super_admin roles
        if (formData.role === 'admin' || formData.role === 'super_admin') {
          const existingAdmin = adminUsers.find(admin => admin.user_id === editingUser.id);
          
          const adminData = {
            user_id: editingUser.id,
            role: formData.role as AdminRole,
            permissions: formData.permissions
          };

          if (existingAdmin) {
            const { error: adminError } = await supabase
              .from('admin_users')
              .update(adminData)
              .eq('id', existingAdmin.id);

            if (adminError) throw adminError;
          } else {
            const { error: adminError } = await supabase
              .from('admin_users')
              .insert([adminData]);

            if (adminError) throw adminError;
          }
          
          toast({ 
            title: "User Updated", 
            description: `User has been granted ${formData.role} privileges and can now access the admin panel.` 
          });
        } else {
          // Remove admin role if exists and user is being set to 'user' or 'organizer'
          const existingAdmin = adminUsers.find(admin => admin.user_id === editingUser.id);
          if (existingAdmin) {
            const { error: deleteError } = await supabase
              .from('admin_users')
              .delete()
              .eq('id', existingAdmin.id);

            if (deleteError) throw deleteError;
          }
          
          toast({ 
            title: "User Updated", 
            description: "User profile updated successfully." 
          });
        }
      } else {
        toast({
          title: "Info",
          description: "User creation through admin panel is not available. Users must register through the app.",
          variant: "default"
        });
      }
      
      await loadUsers();
      await loadAdminUsers();
      resetForm();
    } catch (error) {
      console.error('Error saving user:', error);
      toast({
        title: "Error",
        description: "Failed to save user. Please try again.",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      mobileNumber: '',
      birthday: null,
      identity: '',
      married: false,
      addressLine1: '',
      addressLine2: '',
      landmark: '',
      townCity: '',
      areaPinCode: '',
      state: '',
      role: 'user',
      status: 'Active',
      permissions: {
        events: false,
        venues: false,
        categories: false,
        users: false,
        bookings: false,
        reports: false,
        workshops: false,
        carousel: false,
        tags: false
      }
    });
    setEditingUser(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (user) => {
    const userRole = getUserRole(user.id);
    const userPermissions = getUserPermissions(user.id);
    
    setEditingUser(user);
    setFormData({
      firstName: user.first_name || '',
      middleName: user.middle_name || '',
      lastName: user.last_name || '',
      email: user.email || '',
      mobileNumber: user.mobile_number || '',
      birthday: user.birthday ? new Date(user.birthday) : null,
      identity: user.identity || '',
      married: user.married || false,
      addressLine1: user.address_line_1 || '',
      addressLine2: user.address_line_2 || '',
      landmark: user.landmark || '',
      townCity: user.town_city || '',
      areaPinCode: user.area_pin_code || '',
      state: user.state || '',
      role: userRole,
      status: 'Active',
      permissions: {
        events: userPermissions.events || false,
        venues: userPermissions.venues || false,
        categories: userPermissions.categories || false,
        users: userPermissions.users || false,
        bookings: userPermissions.bookings || false,
        reports: userPermissions.reports || false,
        workshops: userPermissions.workshops || false,
        carousel: userPermissions.carousel || false,
        tags: userPermissions.tags || false
      }
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (user) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${user.first_name} ${user.last_name}? This action cannot be undone and will permanently remove the user from the system.`
    );
    
    if (!confirmDelete) return;

    try {
      console.log('Deleting user:', user.email);
      
      // Remove admin role if exists
      const existingAdmin = adminUsers.find(admin => admin.user_id === user.id);
      if (existingAdmin) {
        const { error: deleteAdminError } = await supabase
          .from('admin_users')
          .delete()
          .eq('user_id', user.id);

        if (deleteAdminError) {
          console.error('Error removing admin role:', deleteAdminError);
          throw deleteAdminError;
        }
      }

      // Delete user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) {
        console.error('Error deleting profile:', profileError);
        throw profileError;
      }

      // Delete user from auth.users using admin function
      const { error: authError } = await supabase.rpc('admin_delete_user', {
        user_email: user.email
      });

      if (authError) {
        console.error('Error deleting auth user:', authError);
        throw authError;
      }

      toast({ 
        title: "User Deleted", 
        description: `${user.first_name} ${user.last_name} has been permanently deleted.` 
      });
      
      await loadUsers();
      await loadAdminUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: `Failed to delete user: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const handleBlock = async (user) => {
    const reason = window.prompt(
      `Enter reason for blocking ${user.first_name} ${user.last_name}:`,
      'Violating terms of service'
    );
    
    if (!reason) return;

    try {
      const { error } = await supabase.rpc('block_user_with_contacts', {
        p_user_id: user.id,
        p_reason: reason
      });

      if (error) throw error;

      // Send block notification email
      try {
        const { error: emailError } = await supabase.functions.invoke('send-block-notification', {
          body: {
            userEmail: user.email,
            userName: `${user.first_name} ${user.last_name}`.trim(),
            reason: reason
          }
        });

        if (emailError) {
          console.error('Error sending block notification email:', emailError);
        }
      } catch (emailError) {
        console.error('Failed to send block notification email:', emailError);
      }

      toast({
        title: "User Blocked",
        description: `${user.first_name} ${user.last_name} has been blocked.`,
      });
      
      await loadUsers();
    } catch (error) {
      console.error('Error blocking user:', error);
      toast({
        title: "Error",
        description: `Failed to block user: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleUnblock = async (user) => {
    const confirmUnblock = window.confirm(
      `Are you sure you want to unblock ${user.first_name} ${user.last_name}?`
    );
    
    if (!confirmUnblock) return;

    try {
      const { error } = await supabase.rpc('unblock_user_with_contacts', {
        p_user_id: user.id
      });

      if (error) throw error;

      // Send unblock notification email
      try {
        const { error: emailError } = await supabase.functions.invoke('send-unblock-notification', {
          body: {
            userEmail: user.email,
            userName: `${user.first_name} ${user.last_name}`.trim()
          }
        });

        if (emailError) {
          console.error('Error sending unblock notification email:', emailError);
        }
      } catch (emailError) {
        console.error('Failed to send unblock notification email:', emailError);
      }

      toast({
        title: "User Unblocked",
        description: `${user.first_name} ${user.last_name} has been unblocked.`,
      });
      
      await loadUsers();
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast({
        title: "Error",
        description: `Failed to unblock user: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handlePermissionChange = (permission, checked) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: checked
      }
    }));
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800';
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'organizer': return 'bg-blue-100 text-blue-800';
      case 'user': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">User Management</h2>
            <p className="text-gray-600 mt-2">Manage platform users and their roles</p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600 mt-2">Manage platform users and their comprehensive profiles</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Edit className="w-4 h-4 mr-2" />
              Edit User Profile
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User Profile & Permissions</DialogTitle>
              <DialogDescription>
                Update comprehensive user profile including personal details, address, role and permissions.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">First Name *</label>
                    <Input
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      placeholder="Enter first name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Middle Name</label>
                    <Input
                      value={formData.middleName}
                      onChange={(e) => setFormData({...formData, middleName: e.target.value})}
                      placeholder="Enter middle name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Last Name</label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email *</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="Enter email address"
                      disabled={!!editingUser}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mobile Number *</label>
                    <Input
                      type="tel"
                      value={formData.mobileNumber}
                      onChange={(e) => setFormData({...formData, mobileNumber: e.target.value})}
                      placeholder="Enter mobile number"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Birthday</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.birthday && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.birthday ? format(formData.birthday, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.birthday}
                          onSelect={(date) => setFormData({...formData, birthday: date})}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Identity (Gender)</label>
                    <Select value={formData.identity} onValueChange={(value) => setFormData({...formData, identity: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select identity" />
                      </SelectTrigger>
                      <SelectContent>
                        {identityOptions.map(option => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Married?</label>
                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox
                        id="married"
                        checked={formData.married}
                        onCheckedChange={(checked) => setFormData({...formData, married: Boolean(checked)})}
                      />
                      <label htmlFor="married" className="text-sm">
                        Yes, I am married
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Address Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Address Line 1 *</label>
                    <Input
                      value={formData.addressLine1}
                      onChange={(e) => setFormData({...formData, addressLine1: e.target.value})}
                      placeholder="Enter address line 1"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Address Line 2</label>
                    <Input
                      value={formData.addressLine2}
                      onChange={(e) => setFormData({...formData, addressLine2: e.target.value})}
                      placeholder="Enter address line 2"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Landmark</label>
                    <Input
                      value={formData.landmark}
                      onChange={(e) => setFormData({...formData, landmark: e.target.value})}
                      placeholder="Enter landmark"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Town / City *</label>
                    <Input
                      value={formData.townCity}
                      onChange={(e) => setFormData({...formData, townCity: e.target.value})}
                      placeholder="Enter town/city"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Area PIN Code</label>
                    <Input
                      value={formData.areaPinCode}
                      onChange={(e) => setFormData({...formData, areaPinCode: e.target.value})}
                      placeholder="Enter PIN code"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">State *</label>
                  <Select value={formData.state} onValueChange={(value) => setFormData({...formData, state: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {indianStates.map(state => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Role and Permissions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Role & Permissions</h3>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(role => role && role.trim() && (
                        <SelectItem key={role} value={role}>
                          {role === 'super_admin' ? 'Super Admin' : role.charAt(0).toUpperCase() + role.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(formData.role === 'admin' || formData.role === 'super_admin') && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Admin Permissions</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.keys(formData.permissions).map((permission) => (
                        <div key={permission} className="flex items-center space-x-2">
                          <Checkbox
                            id={permission}
                            checked={formData.permissions[permission]}
                            onCheckedChange={(checked) => handlePermissionChange(permission, Boolean(checked))}
                          />
                          <label htmlFor={permission} className="text-sm capitalize">
                            {permission}
                          </label>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <Shield className="w-4 h-4 inline mr-1" />
                        Users with admin or super_admin roles can access the admin panel.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Update User Profile
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_roles">All Roles</SelectItem>
                {roles.map(role => role && role.trim() && (
                  <SelectItem key={role} value={role}>
                    {role === 'super_admin' ? 'Super Admin' : role.charAt(0).toUpperCase() + role.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_statuses">All Statuses</SelectItem>
                {statuses.map(status => status && status.trim() && (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center text-sm text-gray-600">
              <Users className="w-4 h-4 mr-2" />
              {filteredUsers.length} users found
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Grid */}
      <div className="grid gap-6">
        {filteredUsers.map((user) => {
          const userRole = getUserRole(user.id);
          const userPermissions = getUserPermissions(user.id);
          
          return (
            <Card key={user.id} className="hover:shadow-lg transition-shadow duration-300">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <Avatar>
                      <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                        {(user.first_name?.[0] || '') + (user.last_name?.[0] || '')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {user.first_name} {user.middle_name} {user.last_name}
                        </h3>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Mail className="w-4 h-4" />
                            <span>{user.email}</span>
                          </span>
                          {user.mobile_number && (
                            <span className="flex items-center space-x-1">
                              <Phone className="w-4 h-4" />
                              <span>{user.mobile_number}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Personal Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                          {user.birthday && (
                            <div className="flex items-center space-x-2">
                              <CalendarIcon className="w-4 h-4 text-gray-400" />
                              <span>Birthday: {format(new Date(user.birthday), "dd/MM/yyyy")}</span>
                            </div>
                          )}
                          {user.identity && (
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-600">Gender: {user.identity}</span>
                            </div>
                          )}
                          {user.married && (
                            <div className="flex items-center space-x-2">
                              <Heart className="w-4 h-4 text-red-500" />
                              <span>Married</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Address */}
                        {(user.address_line_1 || user.town_city || user.state) && (
                          <div className="space-y-1">
                            <div className="flex items-start space-x-2">
                              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                              <div className="text-xs text-gray-600">
                                {user.address_line_1 && <div>{user.address_line_1}</div>}
                                {user.address_line_2 && <div>{user.address_line_2}</div>}
                                {user.landmark && <div>Near {user.landmark}</div>}
                                <div>
                                  {user.town_city && `${user.town_city}`}
                                  {user.area_pin_code && ` - ${user.area_pin_code}`}
                                </div>
                                {user.state && <div>{user.state}</div>}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="text-right space-y-1">
                      <div className="flex space-x-2">
                        <Badge className={getRoleColor(userRole)}>
                          {userRole === 'super_admin' ? 'Super Admin' : userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                        </Badge>
                        {(userRole === 'admin' || userRole === 'super_admin') && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin Access
                          </Badge>
                         )}
                         {user.is_blocked && (
                           <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                             <Ban className="w-3 h-3 mr-1" />
                             Blocked
                           </Badge>
                         )}
                       </div>
                       {(userRole === 'admin' || userRole === 'super_admin') && (
                         <div className="text-sm text-gray-500">
                           {Object.entries(userPermissions).filter(([_, hasPermission]) => hasPermission).length} permissions
                         </div>
                       )}
                       {user.is_blocked && (
                         <div className="text-sm text-red-600">
                           Blocked: {user.blocked_reason || 'No reason provided'}
                         </div>
                       )}
                     </div>
                     
                     <div className="flex items-center space-x-2">
                       <Button variant="outline" size="sm" onClick={() => handleEdit(user)}>
                         <Edit className="w-4 h-4" />
                       </Button>
                       {user.is_blocked ? (
                         <Button 
                           variant="outline" 
                           size="sm" 
                           onClick={() => handleUnblock(user)}
                           className="text-green-600 hover:text-green-700 hover:bg-green-50"
                         >
                           <CheckCircle className="w-4 h-4" />
                         </Button>
                       ) : (
                         <Button 
                           variant="outline" 
                           size="sm" 
                           onClick={() => handleBlock(user)}
                           className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                         >
                           <Ban className="w-4 h-4" />
                         </Button>
                       )}
                       <Button 
                         variant="outline" 
                         size="sm" 
                         onClick={() => handleDelete(user)} 
                         className="text-red-600 hover:text-red-700 hover:bg-red-50"
                       >
                         <Trash2 className="w-4 h-4" />
                       </Button>
                     </div>
                  </div>
                </div>
                
                {(userRole === 'admin' || userRole === 'super_admin') && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">Admin Permissions</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(userPermissions).map(([permission, hasAccess]) => (
                        hasAccess && (
                          <Badge key={permission} variant="outline" className="capitalize">
                            {permission}
                          </Badge>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default UserManagement;
