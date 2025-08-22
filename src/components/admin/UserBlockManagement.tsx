import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserX, UserCheck, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_blocked: boolean;
  blocked_reason: string | null;
  blocked_at: string | null;
}

const UserBlockManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isBlocking, setIsBlocking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, is_blocked, blocked_reason, blocked_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleUserBlock = async (user: UserProfile, block: boolean, reason?: string) => {
    setIsBlocking(true);
    try {
      if (block) {
        // Use the block_user_with_contacts function
        const { data, error } = await supabase.rpc('block_user_with_contacts', {
          p_user_id: user.id,
          p_reason: reason || 'Administrative action'
        });

        if (error) throw error;
        
        toast({
          title: "User Blocked",
          description: `${user.first_name} ${user.last_name} has been blocked successfully.`,
        });
      } else {
        // Use the unblock_user_with_contacts function
        const { data, error } = await supabase.rpc('unblock_user_with_contacts', {
          p_user_id: user.id
        });

        if (error) throw error;
        
        toast({
          title: "User Unblocked",
          description: `${user.first_name} ${user.last_name} has been unblocked successfully.`,
        });
      }

      // Refresh the users list
      await fetchUsers();
      setSelectedUser(null);
      setBlockReason('');
    } catch (error: any) {
      console.error('Error updating user block status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user status",
        variant: "destructive",
      });
    } finally {
      setIsBlocking(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Block Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5" />
            User Block Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label htmlFor="search">Search Users</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Blocked Reason</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      {user.first_name} {user.last_name}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.is_blocked ? "destructive" : "secondary"}>
                        {user.is_blocked ? "Blocked" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.blocked_reason || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {user.is_blocked ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleUserBlock(user, false)}
                            disabled={isBlocking}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Unblock
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setSelectedUser(user)}
                            disabled={isBlocking}
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Block
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No users found matching your search.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Block User Dialog */}
      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">
              Block User: {selectedUser.first_name} {selectedUser.last_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                This action will immediately prevent the user from logging into the system. 
                They will see a message that their account has been blocked.
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="blockReason">Reason for blocking (required)</Label>
              <Textarea
                id="blockReason"
                placeholder="Enter the reason for blocking this user..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex space-x-2">
              <Button
                variant="destructive"
                onClick={() => toggleUserBlock(selectedUser, true, blockReason)}
                disabled={!blockReason.trim() || isBlocking}
              >
                {isBlocking ? "Blocking..." : "Block User"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedUser(null);
                  setBlockReason('');
                }}
                disabled={isBlocking}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserBlockManagement;