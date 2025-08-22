import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Filter, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SoldTicketDetail {
  event_name: string;
  event_id: string;
  event_id_display: string;
  order_id: string;
  order_status: string;
  ticket_code: string;
  ticket_categories: string[]; // Changed to array to support multiple categories
  tickets_purchased: number;
  customer_name: string;
  customer_id: string;
  is_sold_out?: boolean;
  total_seats?: number;
  available_seats?: number;
  seat_details?: Array<{
    seat_number: string;
    category: string;
    price: number;
  }>;
}

const SoldTicketsManagement = () => {
  const [tickets, setTickets] = useState<SoldTicketDetail[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<SoldTicketDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [soldOutEvents, setSoldOutEvents] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    eventId: '',
    ticketCategory: '',
    searchTerm: '',
    showSoldOutOnly: false
  });
  
  // Filter options
  const [events, setEvents] = useState<{id: string, name: string}[]>([]);
  const [ticketCategories, setTicketCategories] = useState<string[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchSoldTickets();
    fetchFilterOptions();
    fetchSoldOutEvents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, tickets]);

  const fetchSoldOutEvents = async () => {
    try {
      console.log('[SoldTicketsManagement] Fetching sold out events...');
      
      const { data: soldOutEventsData, error: soldOutError } = await supabase
        .from('events')
        .select(`
          id,
          name,
          is_sold_out,
          sold_out_at,
          event_id_display,
          venues!inner(name, city)
        `)
        .eq('is_sold_out', true)
        .eq('status', 'active');

      if (soldOutError) {
        console.error('Error fetching sold out events:', soldOutError);
        return;
      }

      console.log('[SoldTicketsManagement] Sold out events found:', soldOutEventsData?.length || 0);
      setSoldOutEvents(soldOutEventsData || []);
    } catch (error) {
      console.error('[SoldTicketsManagement] Error in fetchSoldOutEvents:', error);
    }
  };

  const fetchSoldTickets = async () => {
    try {
      setLoading(true);
      console.log('[SoldTicketsManagement] Starting optimized fetch with real categories...');

      // First, fetch bookings with events and seat_numbers
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          user_id,
          event_id,
          quantity,
          total_price,
          status,
          booking_date,
          created_at,
          seat_numbers,
          events!inner(
            name,
            is_sold_out,
            event_id_display,
            category_id
          )
        `)
        .eq('status', 'Confirmed')
        .order('booking_date', { ascending: false })
        .limit(200);

      if (bookingsError) {
        console.error('[SoldTicketsManagement] Error fetching bookings:', bookingsError);
        throw bookingsError;
      }

      console.log('[SoldTicketsManagement] Bookings fetched:', bookingsData?.length || 0);

      // Fetch categories separately
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name');

      if (categoriesError) {
        console.error('[SoldTicketsManagement] Error fetching categories:', categoriesError);
      }

      // Create a map of category id to name for quick lookup
      const categoriesMap = new Map();
      (categoriesData || []).forEach(category => {
        categoriesMap.set(category.id, category.name);
      });

      // Fetch seat categories to map category names
      const { data: seatCategoriesData, error: seatCategoriesError } = await supabase
        .from('seat_categories')
        .select('id, name, event_id');

      if (seatCategoriesError) {
        console.error('[SoldTicketsManagement] Error fetching seat categories:', seatCategoriesError);
      }

      // Create a map of category id to name for quick lookup
      const seatCategoriesMap = new Map();
      (seatCategoriesData || []).forEach(category => {
        seatCategoriesMap.set(category.id, category.name);
      });

      // Then fetch profiles for the user_ids we have
      const userIds = [...new Set(bookingsData?.map(booking => booking.user_id).filter(Boolean) || [])];
      
      let profilesData: any[] = [];
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        if (profilesError) {
          console.error('[SoldTicketsManagement] Error fetching profiles:', profilesError);
        } else {
          profilesData = profiles || [];
        }
      }

      console.log('[SoldTicketsManagement] Profiles fetched:', profilesData.length);

      // Create a map of user_id to profile for quick lookup
      const profilesMap = new Map();
      profilesData.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      // Helper function to extract actual ticket categories from seat_numbers
      const extractTicketCategories = (seatNumbers: any, eventCategoryId?: string) => {
        if (!seatNumbers || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
          // Use event category from categories map if available
          const eventCategoryName = eventCategoryId && categoriesMap.has(eventCategoryId) 
            ? categoriesMap.get(eventCategoryId) 
            : 'General';
          return {
            categories: [eventCategoryName],
            seatDetails: []
          };
        }

        const categories = new Set<string>();
        const seatDetails: Array<{seat_number: string, category: string, price: number}> = [];

        seatNumbers.forEach((seat: any) => {
          let categoryName = 'General'; // Default fallback
          
          // Try to get category name from different possible structures
          if (seat.category_name) {
            categoryName = seat.category_name;
          } else if (seat.category_id && seatCategoriesMap.has(seat.category_id)) {
            categoryName = seatCategoriesMap.get(seat.category_id);
          } else if (seat.category) {
            categoryName = seat.category;
          } else if (seat.seat_category) {
            categoryName = seat.seat_category;
          } else if (eventCategoryId && categoriesMap.has(eventCategoryId)) {
            // Use event category as fallback
            categoryName = categoriesMap.get(eventCategoryId);
          }

          categories.add(categoryName);
          
          seatDetails.push({
            seat_number: seat.seat_number || seat.number || 'Unknown',
            category: categoryName,
            price: parseFloat(seat.price || 0)
          });
        });

        return {
          categories: Array.from(categories),
          seatDetails
        };
      };

      // Transform data into SoldTicketDetail format
      const soldTicketDetails: SoldTicketDetail[] = (bookingsData || []).map(booking => {
        const profile = profilesMap.get(booking.user_id);
        const customerName = profile ? 
          `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown Customer' : 
          'Unknown Customer';

        // Get event category ID
        const eventCategoryId = booking.events?.category_id;

        // Extract actual ticket categories and seat details
        const { categories, seatDetails } = extractTicketCategories(booking.seat_numbers, eventCategoryId);

        return {
          event_name: booking.events?.name || 'Unknown Event',
          event_id: booking.event_id || '',
          event_id_display: booking.events?.event_id_display || booking.event_id || '',
          order_id: booking.id || '',
          order_status: booking.status || 'Unknown',
          ticket_code: `TKT-${booking.id.slice(0, 8)}`,
          ticket_categories: categories,
          tickets_purchased: booking.quantity || 1,
          customer_name: customerName,
          customer_id: booking.user_id || '',
          is_sold_out: booking.events?.is_sold_out || false,
          total_seats: 0,
          available_seats: 0,
          seat_details: seatDetails
        };
      });

      console.log('[SoldTicketsManagement] Processed sold tickets with real categories:', soldTicketDetails.length);
      setTickets(soldTicketDetails);

    } catch (error: any) {
      console.error('[SoldTicketsManagement] Error fetching sold tickets:', error);
      toast({
        title: "Error",
        description: "Failed to fetch sold tickets data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      // Fetch events for filter dropdown with limit for better performance
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, name')
        .eq('status', 'active')
        .order('name')
        .limit(100);

      if (eventsError) throw eventsError;
      
      const validEvents = (eventsData || []).filter(event => 
        event.id && event.name && event.id.trim() !== '' && event.name.trim() !== ''
      );
      setEvents(validEvents);

      // Fetch actual seat categories from the database
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('seat_categories')
        .select('name')
        .order('name');

      if (categoriesError) throw categoriesError;
      
      const validCategories = [...new Set((categoriesData || [])
        .map(item => item.name)
        .filter(name => {
          const isValidString = name && typeof name === 'string';
          const isNotEmpty = isValidString && name.trim() !== '';
          return isNotEmpty;
        })
      )];
      
      setTicketCategories(validCategories);
      
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...tickets];

    if (filters.eventId && filters.eventId !== 'all') {
      filtered = filtered.filter(ticket => ticket.event_id === filters.eventId);
    }

    if (filters.ticketCategory && filters.ticketCategory !== 'all') {
      filtered = filtered.filter(ticket => 
        ticket.ticket_categories.some(category => 
          category.toLowerCase().includes(filters.ticketCategory.toLowerCase())
        )
      );
    }

    if (filters.showSoldOutOnly) {
      filtered = filtered.filter(ticket => ticket.is_sold_out);
    }

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(ticket =>
        ticket.event_name.toLowerCase().includes(searchLower) ||
        ticket.order_id.toLowerCase().includes(searchLower) ||
        ticket.ticket_code.toLowerCase().includes(searchLower) ||
        ticket.customer_name.toLowerCase().includes(searchLower) ||
        ticket.event_id_display.toLowerCase().includes(searchLower) ||
        ticket.ticket_categories.some(category => 
          category.toLowerCase().includes(searchLower)
        )
      );
    }

    setFilteredTickets(filtered);
  };

  const exportToCSV = () => {
    const headers = [
      'Event Name', 'Event ID', 'Order ID', 'Order Status', 'Ticket Code',
      'Ticket Categories', 'Seat Details', 'Tickets Purchased', 'Customer Name', 'Customer ID', 
      'Sold Out Status'
    ];

    const csvData = filteredTickets.map(ticket => [
      ticket.event_name,
      ticket.event_id_display,
      ticket.order_id,
      ticket.order_status,
      ticket.ticket_code,
      ticket.ticket_categories.join('; '),
      ticket.seat_details?.map(seat => `${seat.seat_number} (${seat.category})`).join('; ') || '',
      ticket.tickets_purchased,
      ticket.customer_name,
      ticket.customer_id,
      ticket.is_sold_out ? 'Yes' : 'No'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sold-tickets-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Sold tickets data has been exported to CSV",
    });
  };

  const resetFilters = () => {
    setFilters({
      eventId: '',
      ticketCategory: '',
      searchTerm: '',
      showSoldOutOnly: false
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-gray-900">Sold Ticket Details</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <div className="text-lg font-medium">Loading sold tickets...</div>
          </div>
        </div>
      </div>
    );
  }

  const soldOutTickets = filteredTickets.filter(ticket => ticket.is_sold_out);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Sold Ticket Details</h2>
          <p className="text-gray-600 mt-2">Manage and track all sold tickets with detailed category information</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchSoldTickets} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button onClick={exportToCSV} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Sold Out Events Alert */}
      {soldOutEvents.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-5 h-5" />
              Sold Out Events ({soldOutEvents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {soldOutEvents.slice(0, 6).map(event => (
                <div key={event.id} className="p-3 bg-white rounded border border-red-200">
                  <h4 className="font-medium text-red-800">{event.name}</h4>
                  <p className="text-sm text-red-600">
                    Event ID: {event.event_id_display || event.id}
                  </p>
                  <p className="text-sm text-red-600">
                    {event.venues?.name}, {event.venues?.city}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="eventId">Filter by Event</Label>
              <Select
                value={filters.eventId}
                onValueChange={(value) => setFilters(prev => ({ ...prev, eventId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {events.map(event => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="ticketCategory">Filter by Category</Label>
              <Select
                value={filters.ticketCategory}
                onValueChange={(value) => setFilters(prev => ({ ...prev, ticketCategory: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {ticketCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="searchTerm">Search</Label>
              <Input
                id="searchTerm"
                placeholder="Event, Order ID, Customer..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showSoldOutOnly"
                checked={filters.showSoldOutOnly}
                onChange={(e) => setFilters(prev => ({ ...prev, showSoldOutOnly: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="showSoldOutOnly">Sold Out Events Only</Label>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={resetFilters} className="w-full">
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Total Tickets:</span> {filteredTickets.length} of {tickets.length}
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Sold Out Events:</span> {soldOutTickets.length}
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Total Revenue:</span> ₹{filteredTickets.reduce((sum, ticket) => {
                // Calculate revenue based on actual seat prices if available
                if (ticket.seat_details && ticket.seat_details.length > 0) {
                  return sum + ticket.seat_details.reduce((seatSum, seat) => seatSum + seat.price, 0);
                }
                return sum + (ticket.tickets_purchased * 500); // fallback calculation
              }, 0).toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sold Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sold Tickets ({filteredTickets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Name & ID</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Ticket Code</TableHead>
                  <TableHead>Categories & Seats</TableHead>
                  <TableHead>Tickets</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket, index) => (
                  <TableRow key={`${ticket.ticket_code}-${index}`} className={ticket.is_sold_out ? 'bg-red-50' : ''}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          {ticket.event_name}
                          {ticket.is_sold_out && (
                            <Badge variant="destructive" className="text-xs">
                              SOLD OUT
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">{ticket.event_id_display}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs">{ticket.order_id.slice(0, 12)}...</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        {ticket.ticket_code}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {ticket.ticket_categories.map((category, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {category}
                            </Badge>
                          ))}
                        </div>
                        {ticket.seat_details && ticket.seat_details.length > 0 && (
                          <div className="text-xs text-gray-500 max-w-32">
                            {ticket.seat_details.slice(0, 3).map((seat, idx) => (
                              <div key={idx} className="truncate">
                                {seat.seat_number} ({seat.category})
                              </div>
                            ))}
                            {ticket.seat_details.length > 3 && (
                              <div className="text-xs text-gray-400">
                                +{ticket.seat_details.length - 3} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{ticket.tickets_purchased}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{ticket.customer_name}</div>
                        <div className="text-xs text-gray-500 font-mono">{ticket.customer_id.slice(0, 8)}...</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={ticket.order_status === 'Confirmed' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {ticket.order_status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredTickets.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <div className="text-lg font-medium">No sold tickets found</div>
                <div className="text-sm mt-1">
                  {tickets.length === 0 
                    ? "No tickets have been sold yet." 
                    : "Try adjusting your filters to see more results."
                  }
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SoldTicketsManagement;
