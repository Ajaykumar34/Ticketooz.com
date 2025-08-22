import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OrderDetail {
  id: string;
  event_name: string;
  event_id: string;
  event_id_display: string;
  formatted_event_id?: string;
  order_status: string;
  ticket_codes: string[];
  ticket_categories: string[]; // Changed to array to support multiple categories
  quantity: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  payment_mode: string;
  discount_amount: number;
  total_amount: number;
  booking_date: string;
}

const OrderDetailsModule = () => {
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    eventId: '',
    ticketCategory: '',
    customer: '',
    paymentMode: ''
  });
  const [events, setEvents] = useState<any[]>([]);
  const [ticketCategories, setTicketCategories] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
    fetchEvents();
    fetchTicketCategories();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, orders]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      console.log('[OrderDetailsModule] Fetching orders...');

      // First, fetch bookings with related data
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *
        `)
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.error('[OrderDetailsModule] Error fetching bookings:', bookingsError);
        throw bookingsError;
      }

      // Fetch tickets separately (which includes ticket codes)
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('*');

      if (ticketsError) {
        console.error('[OrderDetailsModule] Error fetching tickets:', ticketsError);
        throw ticketsError;
      }

      // Fetch events separately
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
          id, 
          name, 
          event_id_display,
          category_id,
          venues!inner(state)
        `);

      if (eventsError) {
        console.error('[OrderDetailsModule] Error fetching events:', eventsError);
        throw eventsError;
      }

      // Fetch profiles for customer data
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) {
        console.error('[OrderDetailsModule] Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Transform data into OrderDetail format
      const transformedOrders: OrderDetail[] = (bookingsData || []).map(booking => {
        const event = eventsData?.find(e => e.id === booking.event_id);
        const profile = profilesData?.find(p => p.id === booking.user_id);
        const relatedTickets = ticketsData?.filter(t => t.booking_id === booking.id) || [];
        
        // Extract all unique categories from seat_numbers column
        let categoryNames: string[] = ['General']; // Default fallback
        
        if (booking.seat_numbers && Array.isArray(booking.seat_numbers) && booking.seat_numbers.length > 0) {
          const extractedCategories = new Set<string>();
          
          booking.seat_numbers.forEach((seatData: any) => {
            if (seatData && typeof seatData === 'object') {
              // Check different possible category field names
              let categoryName = '';
              
              if ('seat_categories' in seatData && seatData.seat_categories) {
                const seatCategory = seatData.seat_categories as any;
                if (seatCategory.name) {
                  categoryName = seatCategory.name;
                }
              } else if ('category_name' in seatData && seatData.category_name) {
                categoryName = seatData.category_name as string;
              } else if ('category' in seatData && seatData.category) {
                categoryName = seatData.category as string;
              } else if ('seat_category' in seatData && seatData.seat_category) {
                categoryName = seatData.seat_category as string;
              }
              
              if (categoryName) {
                extractedCategories.add(categoryName);
              }
            }
          });
          
          if (extractedCategories.size > 0) {
            categoryNames = Array.from(extractedCategories);
          }
        }
        
        return {
          id: booking.id,
          event_name: event?.name || 'Unknown Event',
          event_id: booking.event_id || '',
          event_id_display: event?.event_id_display || booking.event_id || '',
          formatted_event_id: event?.event_id_display,
          order_status: booking.status || 'Unknown',
          ticket_codes: relatedTickets.map(t => t.ticket_code || ''),
          ticket_categories: categoryNames, // Now supports multiple categories
          quantity: booking.quantity || 0,
          customer_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown' : 'Unknown',
          customer_phone: profile?.phone || profile?.mobile_number || '',
          customer_email: profile?.email || '',
          payment_mode: 'Online',
          discount_amount: 0,
          total_amount: Number(booking.total_price) || 0,
          booking_date: booking.booking_date || booking.created_at
        };
      });

      console.log('[OrderDetailsModule] Transformed orders:', transformedOrders.length);
      setOrders(transformedOrders);
    } catch (error: any) {
      console.error('[OrderDetailsModule] Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch order details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, name')
        .order('name');

      if (error) throw error;
      
      console.log('[OrderDetailsModule] Raw events data:', data);
      
      // Filter out events with empty or null id/name and add extra validation
      const validEvents = (data || []).filter(event => {
        const hasValidId = event.id && typeof event.id === 'string' && event.id.trim() !== '';
        const hasValidName = event.name && typeof event.name === 'string' && event.name.trim() !== '';
        return hasValidId && hasValidName;
      });
      
      console.log('[OrderDetailsModule] Valid events after filtering:', validEvents);
      setEvents(validEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchTicketCategories = async () => {
    try {
      // Fetch from seat_categories table to get actual category names used in events
      const { data, error } = await supabase
        .from('seat_categories')
        .select('name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      console.log('[OrderDetailsModule] Raw seat categories data:', data);
      
      // Filter out empty, null, or whitespace-only categories with extra validation
      const validCategories = [...new Set((data || [])
        .map(item => item.name)
        .filter(name => {
          const isValidString = name && typeof name === 'string';
          const isNotEmpty = isValidString && name.trim() !== '';
          return isNotEmpty;
        })
      )];
      
      console.log('[OrderDetailsModule] Valid seat categories after filtering:', validCategories);
      setTicketCategories(validCategories);
    } catch (error) {
      console.error('Error fetching seat categories:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];

    if (filters.dateFrom) {
      filtered = filtered.filter(order => 
        new Date(order.booking_date) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(order => 
        new Date(order.booking_date) <= new Date(filters.dateTo)
      );
    }

    if (filters.eventId && filters.eventId !== 'all') {
      filtered = filtered.filter(order => order.event_id === filters.eventId);
    }

    if (filters.ticketCategory && filters.ticketCategory !== 'all') {
      filtered = filtered.filter(order => 
        order.ticket_categories.some(category => 
          category.toLowerCase().includes(filters.ticketCategory.toLowerCase())
        )
      );
    }

    if (filters.customer) {
      filtered = filtered.filter(order => 
        order.customer_name.toLowerCase().includes(filters.customer.toLowerCase()) ||
        order.customer_email.toLowerCase().includes(filters.customer.toLowerCase()) ||
        order.customer_phone.includes(filters.customer)
      );
    }

    if (filters.paymentMode && filters.paymentMode !== 'all') {
      filtered = filtered.filter(order => 
        order.payment_mode.toLowerCase() === filters.paymentMode.toLowerCase()
      );
    }

    setFilteredOrders(filtered);
  };

  const exportToCSV = () => {
    const headers = [
      'Order ID', 'Event Name', 'Event ID', 'Order Status', 'Ticket Codes',
      'Ticket Categories', 'Quantity', 'Customer Name', 'Customer Phone',
      'Customer Email', 'Payment Mode', 'Discount Amount', 'Total Amount', 'Booking Date'
    ];

    const csvData = filteredOrders.map(order => [
      order.id,
      order.event_name,
      order.event_id_display,
      order.order_status,
      order.ticket_codes.join('; '),
      order.ticket_categories.join(', '), // Join multiple categories with comma
      order.quantity,
      order.customer_name,
      order.customer_phone,
      order.customer_email,
      order.payment_mode,
      order.discount_amount,
      order.total_amount,
      new Date(order.booking_date).toLocaleDateString()
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `order-details-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      eventId: '',
      ticketCategory: '',
      customer: '',
      paymentMode: ''
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-gray-900">Order Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Order Details</h2>
          <p className="text-gray-600 mt-2">Manage and track all customer orders</p>
        </div>
        <Button onClick={exportToCSV} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="dateFrom">Date From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="dateTo">Date To</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="eventId">Event</Label>
              <Select
                value={filters.eventId}
                onValueChange={(value) => setFilters(prev => ({ ...prev, eventId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {events.map(event => {
                    if (!event.id || !event.name || event.id.trim() === '' || event.name.trim() === '') {
                      console.warn('Skipping invalid event:', event);
                      return null;
                    }
                    return (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name}
                      </SelectItem>
                    );
                  }).filter(Boolean)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="ticketCategory">Ticket Category</Label>
              <Select
                value={filters.ticketCategory}
                onValueChange={(value) => setFilters(prev => ({ ...prev, ticketCategory: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {ticketCategories.map(category => {
                    if (!category || category.trim() === '') {
                      console.warn('Skipping invalid category:', category);
                      return null;
                    }
                    return (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    );
                  }).filter(Boolean)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="customer">Customer</Label>
              <Input
                id="customer"
                placeholder="Name, email, or phone"
                value={filters.customer}
                onChange={(e) => setFilters(prev => ({ ...prev, customer: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="paymentMode">Payment Mode</Label>
              <Select
                value={filters.paymentMode}
                onValueChange={(value) => setFilters(prev => ({ ...prev, paymentMode: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Modes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={resetFilters}>
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Order ID</th>
                  <th className="text-left p-2">Event</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Ticket Codes</th>
                  <th className="text-left p-2">Categories</th>
                  <th className="text-left p-2">Qty</th>
                  <th className="text-left p-2">Customer</th>
                  <th className="text-left p-2">Contact</th>
                  <th className="text-left p-2">Payment</th>
                  <th className="text-left p-2">Amount</th>
                  <th className="text-left p-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-mono text-sm">{order.id.slice(0, 8)}...</td>
                    <td className="p-2">
                      <div>
                        <div className="font-medium">{order.event_name}</div>
                        <div className="text-sm text-gray-500">{order.formatted_event_id || order.event_id_display}</div>
                      </div>
                    </td>
                    <td className="p-2">
                      <Badge variant={order.order_status === 'Confirmed' ? 'default' : 'secondary'}>
                        {order.order_status}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <div className="max-w-32 truncate" title={order.ticket_codes.join(', ')}>
                        {order.ticket_codes.slice(0, 2).join(', ')}
                        {order.ticket_codes.length > 2 && '...'}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {order.ticket_categories.map((category, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-2">{order.quantity}</td>
                    <td className="p-2">
                      <div>
                        <div className="font-medium">{order.customer_name}</div>
                        <div className="text-sm text-gray-500">{order.customer_email}</div>
                      </div>
                    </td>
                    <td className="p-2">{order.customer_phone}</td>
                    <td className="p-2">{order.payment_mode}</td>
                    <td className="p-2 font-medium">₹{order.total_amount.toLocaleString()}</td>
                    <td className="p-2 text-sm">
                      {new Date(order.booking_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredOrders.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No orders found matching the selected filters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderDetailsModule;
