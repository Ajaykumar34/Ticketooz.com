
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useEventRequestManagement } from '@/hooks/useEventRequestManagement';
import { useState } from 'react';
import { toast } from 'sonner';
import { 
  Calendar, 
  Users, 
  MapPin, 
  DollarSign, 
  Mail, 
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  Eye
} from 'lucide-react';

interface EventRequest {
  id: string;
  event_name: string;
  event_category: string;
  event_description: string | null;
  expected_attendees: number | null;
  preferred_venue: string | null;
  preferred_date: string | null;
  estimated_budget: number | null;
  contact_email: string;
  contact_phone: string | null;
  additional_info: string | null;
  admin_notes: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  user_id: string | null;
}

const EventRequestManagement = () => {
  const { requests, loading, error, isAdmin, refetch, updateRequestStatus } = useEventRequestManagement();
  const [selectedRequest, setSelectedRequest] = useState<EventRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateStatus = async (requestId: string, newStatus: string, notes?: string) => {
    try {
      setIsUpdating(true);
      await updateRequestStatus(requestId, newStatus, notes);
      toast.success(`Request ${newStatus} successfully`);
      setIsDialogOpen(false);
      setSelectedRequest(null);
      setAdminNotes('');
    } catch (error: any) {
      toast.error(`Failed to update request: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesSearch = !searchTerm || 
      request.event_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.event_category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.contact_email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string | null) => {
    const statusValue = status || 'pending';
    const colors = {
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    return (
      <Badge className={colors[statusValue as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {statusValue.charAt(0).toUpperCase() + statusValue.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString();
  };

  const openRequestDialog = (request: EventRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.admin_notes || '');
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
        <span>Loading event requests...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Event Request Management</h1>
          <p className="text-muted-foreground mt-1">Manage incoming event requests</p>
        </div>

        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error Loading Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 mb-4">{error}</p>
            <Button onClick={refetch} variant="outline" className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Event Request Management</h1>
          <p className="text-muted-foreground mt-1">Manage incoming event requests</p>
        </div>

        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">You need admin privileges to access this feature.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Event Request Management</h1>
          <p className="text-muted-foreground mt-1">Manage incoming event requests</p>
        </div>
        <Button onClick={refetch} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Input
          placeholder="Search by event name, category, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredRequests.length} of {requests.length} requests
      </div>

      {/* Requests Grid */}
      <div className="grid gap-4">
        {filteredRequests.map((request) => (
          <Card key={request.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{request.event_name}</CardTitle>
                  <div className="flex gap-2 mt-2">
                    {getStatusBadge(request.status)}
                    <Badge variant="outline">{request.event_category}</Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openRequestDialog(request)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                {request.preferred_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(request.preferred_date)}</span>
                  </div>
                )}
                {request.expected_attendees && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{request.expected_attendees} attendees</span>
                  </div>
                )}
                {request.preferred_venue && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{request.preferred_venue}</span>
                  </div>
                )}
                {request.estimated_budget && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span>₹{request.estimated_budget.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{request.contact_email}</span>
                </div>
                {request.contact_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{request.contact_phone}</span>
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground mt-3">
                Created: {formatDate(request.created_at)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRequests.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-lg mb-2">No event requests found</div>
          <div className="text-sm">
            {statusFilter !== 'all' || searchTerm 
              ? 'Try adjusting your filters.'
              : 'No event requests have been submitted yet.'
            }
          </div>
        </div>
      )}

      {/* Request Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRequest?.event_name}</DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Category:</strong> {selectedRequest.event_category}
                </div>
                <div>
                  <strong>Status:</strong> {getStatusBadge(selectedRequest.status)}
                </div>
              </div>

              {selectedRequest.event_description && (
                <div>
                  <strong>Description:</strong>
                  <p className="mt-1 text-sm">{selectedRequest.event_description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Expected Attendees:</strong> {selectedRequest.expected_attendees || 'Not specified'}
                </div>
                <div>
                  <strong>Preferred Date:</strong> {formatDate(selectedRequest.preferred_date)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Preferred Venue:</strong> {selectedRequest.preferred_venue || 'Not specified'}
                </div>
                <div>
                  <strong>Budget:</strong> 
                  {selectedRequest.estimated_budget ? ` ₹${selectedRequest.estimated_budget.toLocaleString()}` : ' Not specified'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Contact Email:</strong> {selectedRequest.contact_email}
                </div>
                <div>
                  <strong>Contact Phone:</strong> {selectedRequest.contact_phone || 'Not provided'}
                </div>
              </div>

              {selectedRequest.additional_info && (
                <div>
                  <strong>Additional Information:</strong>
                  <p className="mt-1 text-sm">{selectedRequest.additional_info}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Admin Notes:</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this request..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleUpdateStatus(selectedRequest.id, 'approved', adminNotes)}
                  className="bg-green-600 hover:bg-green-700"
                  size="sm"
                  disabled={isUpdating}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleUpdateStatus(selectedRequest.id, 'rejected', adminNotes)}
                  variant="destructive"
                  size="sm"
                  disabled={isUpdating}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleUpdateStatus(selectedRequest.id, 'pending', adminNotes)}
                  variant="outline"
                  size="sm"
                  disabled={isUpdating}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Pending
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventRequestManagement;
