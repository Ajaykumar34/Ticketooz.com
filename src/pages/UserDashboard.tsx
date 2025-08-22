
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, IndianRupee, User, Ticket, Download, RefreshCw } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateTicketPDF } from '@/components/TicketPDF';
import { processBookings, getCategoryBreakdown, hasMultipleCategories } from '@/utils/bookingUtils';

interface Booking {
  id: string;
  quantity: number;
  total_price: number;
  booking_date: string;
  convenience_fee?: number | null;
  seat_numbers?: Array<{
    price: number;
    seat_number: string;
    seat_category: string;
  }> | null;
  event: {
    name: string;
    start_datetime: string;
    venue?: {
      name: string;
      city: string;
      address: string;
    } | null;
  } | null;
}

const UserDashboard = () => {
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const fetchBookings = async (isRetry = false) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      console.log('[UserDashboard] Starting fetchBookings attempt', isRetry ? `(retry ${retryCount + 1})` : '(initial)');
      
      // Add a small delay for retries to help with network issues
      if (isRetry && retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }

      // Fetch bookings with event occurrences for recurring events
      const { data: bookingsRaw, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          quantity,
          total_price,
          booking_date,
          seat_numbers,
          event_id,
          event_occurrence_id,
          convenience_fee,
          event:events (
            name,
            start_datetime,
            is_recurring,
            venue:venues!events_venue_id_fkey (
              name,
              city,
              address
            )
          ),
          event_occurrence:event_occurrences (
            occurrence_date,
            occurrence_time
          )
        `)
        .eq('user_id', user.id)
        .order('booking_date', { ascending: false });

      if (bookingsError) {
        console.error('[UserDashboard] Error fetching bookings:', bookingsError);
        throw bookingsError;
      }

      console.log('[UserDashboard] Successfully fetched bookings:', bookingsRaw?.length || 0);

      // Massage to expected shape with correct event datetime
      const bookings: Booking[] = (bookingsRaw || []).map((b: any) => {
        let eventStartDatetime = b.event?.start_datetime;
        
        // CRITICAL FIX: For recurring events, use occurrence date/time if available
        if (b.event?.is_recurring && b.event_occurrence) {
          const occurrenceDate = b.event_occurrence.occurrence_date;
          const occurrenceTime = b.event_occurrence.occurrence_time;
          eventStartDatetime = new Date(`${occurrenceDate}T${occurrenceTime}`).toISOString();
        }

        return {
          id: b.id,
          quantity: b.quantity,
          total_price: b.total_price,
          booking_date: b.booking_date,
          seat_numbers: b.seat_numbers,
          convenience_fee: b.convenience_fee,
          event: b.event ? {
            name: b.event.name,
            start_datetime: eventStartDatetime, // Use occurrence datetime for recurring events
            venue: b.event.venue
              ? {
                  name: b.event.venue.name,
                  city: b.event.venue.city,
                  address: b.event.venue.address,
                }
              : null,
          } : null,
        };
      });

      // Process bookings - now without any combination logic
      const processedBookings = processBookings(bookings);
      setUserBookings(processedBookings);
      setRetryCount(0); // Reset retry count on success

    } catch (error: any) {
      console.error('[UserDashboard] Error in fetchBookings:', error);
      
      // Handle network errors with retry logic
      if (error.message?.includes('Failed to fetch') && retryCount < 3) {
        console.log(`[UserDashboard] Network error, attempting retry ${retryCount + 1}/3`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => fetchBookings(true), 2000);
        return;
      }
      
      toast({
        title: "Error",
        description: retryCount >= 3 
          ? "Failed to load your bookings after multiple attempts. Please check your internet connection and try again."
          : "Failed to load your bookings",
        variant: "destructive",
      });
      setUserBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user, navigate, toast]);

  // Manual refresh function
  const handleRefresh = () => {
    setRetryCount(0);
    fetchBookings();
  };

  // FIXED: Use current datetime instead of just current date for proper comparison
  const currentDateTime = new Date();
  
  // FIXED: Check both date and time to properly categorize events
  const upcomingBookings = userBookings.filter(booking => {
    if (!booking.event?.start_datetime) return true; // Show in upcoming if no date
    const eventDateTime = new Date(booking.event.start_datetime);
    // Event is upcoming if it starts after current date and time
    return eventDateTime > currentDateTime;
  });

  const pastBookings = userBookings.filter(booking => {
    if (!booking.event?.start_datetime) return false; // Don't show in past if no date
    const eventDateTime = new Date(booking.event.start_datetime);
    // Event is past if it has already started (event start time has passed)
    return eventDateTime <= currentDateTime;
  });

  const totalSpent = userBookings.reduce((sum, booking) => sum + Number(booking.total_price), 0);
  const totalTickets = userBookings.reduce((sum, booking) => sum + booking.quantity, 0);

  const getUserDisplayName = () => {
    if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
    }
    return user?.email?.split('@')[0] || 'User';
  };

  const handleDownloadTicket = async (booking: Booking) => {
    if (!booking || !booking.event) return;
    
    try {
      console.log('Booking seat_numbers:', booking.seat_numbers);

      // Use the seat information directly from the booking with enhanced handling
      let selectedSeats: any[] = [];
      
      if (booking.seat_numbers && Array.isArray(booking.seat_numbers)) {
        selectedSeats = booking.seat_numbers.map((seatData: any) => {
          // FIXED: Handle enhanced seat_numbers format with quantity tracking
          const quantity = parseInt(seatData.quantity) || parseInt(seatData.booked_quantity) || 1;
          const seatNumber = seatData.seat_number || `${seatData.seat_category} x${quantity}`;
          
          return {
            seat_number: seatNumber,
            row_name: '',
            category: seatData.seat_category,
            category_name: seatData.seat_category,
            price: seatData.price,
            base_price: seatData.price,
            quantity: quantity, // Include quantity in seat data
            seat_categories: {
              name: seatData.seat_category,
              base_price: seatData.price
            }
          };
        });
      }

      console.log('Selected seats for PDF:', selectedSeats);

      // Enhanced customer info extraction with proper fallbacks
      const customerInfo = {
        firstName: user?.user_metadata?.first_name || 
                  user?.user_metadata?.firstName || 
                  user?.email?.split('@')[0] || '',
        lastName: user?.user_metadata?.last_name || 
                 user?.user_metadata?.lastName || 
                 '',
        email: user?.email || '',
        phone: user?.user_metadata?.phone || 
               user?.phone || 
               ''
      };

      console.log('Customer info for PDF:', customerInfo);

      const ticketData = {
        booking: {
          id: booking.id,
          quantity: booking.quantity,
          total_price: booking.total_price,
          booking_date: booking.booking_date,
          convenience_fee: booking.convenience_fee,
          seat_numbers: selectedSeats.map(seat => ({
            price: seat.price,
            seat_number: seat.seat_number,
            seat_category: seat.category,
            quantity: seat.quantity || 1, // Include quantity information
            booked_quantity: seat.quantity || 1
          }))
        },
        event: {
          name: booking.event.name,
          start_datetime: booking.event.start_datetime, // This now contains the correct occurrence datetime
          venue: booking.event.venue ? {
            name: booking.event.venue.name,
            city: booking.event.venue.city,
            address: booking.event.venue.address
          } : null,
          // Add additional event details for the new format
          category: 'General',
          sub_category: '',
          genre: '',
          genres: [],
          language: '',
          duration: null,
          tags: [],
          artist_name: '',
          artists: []
        },
        customerInfo,
        selectedSeats: selectedSeats,
        totalPrice: booking.total_price,
        basePrice: booking.total_price - (booking.convenience_fee || 0),
        convenienceFee: booking.convenience_fee || 0,
        formattedBookingId: booking.id
      };
      
      console.log('Final ticket data for PDF:', ticketData);
      await generateTicketPDF(ticketData);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate ticket PDF",
        variant: "destructive",
      });
    }
  };

  const renderBookingCard = (booking: Booking) => {
    // Enhanced ticket display for multiple categories using the new utility
    const getTicketCategoryDisplay = () => {
      const categoryBreakdown = getCategoryBreakdown(booking);
      
      if (categoryBreakdown.length > 1) {
        // Multiple categories - show detailed breakdown
        const categories = categoryBreakdown
          .map(({ category, count, totalPrice }) => `${count} ${category} (₹${totalPrice})`)
          .join(', ');
        return categories;
      } else if (categoryBreakdown.length === 1) {
        // Single category
        const { category, count } = categoryBreakdown[0];
        return `${count} ${category} ticket(s)`;
      }
      
      return `${booking.quantity} ticket(s)`;
    };

    return (
      <Card key={booking.id} className="border-l-4 border-l-blue-600">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">
                  {booking.event?.name || <span className="italic text-gray-400">Event info unavailable</span>}
                </h3>
                <Badge variant="outline" className="text-xs">
                  {new Date(booking.booking_date).toLocaleString()}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>{booking.event?.start_datetime ? new Date(booking.event.start_datetime).toLocaleDateString() : "TBA"}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {booking.event?.venue?.name || "TBA"}, {booking.event?.venue?.city || "TBA"}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Ticket className="w-4 h-4" />
                  <span>{getTicketCategoryDisplay()}</span>
                </div>
              </div>
            </div>
            <div className="text-right flex flex-col items-end space-y-2">
              <div className="flex items-center space-x-1 text-lg font-semibold text-green-600">
                <IndianRupee className="w-5 h-5" />
                <span>₹{Number(booking.total_price).toFixed(2)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  Confirmed
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadTicket(booking)}
                  className="flex items-center space-x-1"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Ticket</span>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span>Loading your bookings...</span>
            </div>
            {retryCount > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Retrying... ({retryCount}/3)
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Welcome back, {getUserDisplayName()}!</h2>
                <p className="text-gray-600">{user?.email}</p>
              </div>
            </div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userBookings.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTickets}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalSpent.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Bookings Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>My Bookings</CardTitle>
            <CardDescription>
              {userBookings.length === 0 
                ? "You haven't booked any events yet." 
                : `You have ${userBookings.length} booking(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userBookings.length === 0 ? (
              <div className="text-center py-8">
                <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No bookings found</p>
                <div className="flex items-center justify-center space-x-2">
                  <Link to="/events">
                    <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      Browse Events
                    </Button>
                  </Link>
                  <Button
                    onClick={handleRefresh}
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Try Again</span>
                  </Button>
                </div>
              </div>
            ) : (
              <Tabs defaultValue="upcoming" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upcoming">Upcoming ({upcomingBookings.length})</TabsTrigger>
                  <TabsTrigger value="past" id="bookings-tab">Past ({pastBookings.length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="upcoming" className="space-y-4 mt-6">
                  {upcomingBookings.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 mb-4">No upcoming events</p>
                      <Link to="/events">
                        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                          Browse Events
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    upcomingBookings.map(renderBookingCard)
                  )}
                </TabsContent>
                
                <TabsContent value="past" className="space-y-4 mt-6">
                  {pastBookings.length === 0 ? (
                    <div className="text-center py-8">
                      <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No past events</p>
                    </div>
                  ) : (
                    pastBookings.map(renderBookingCard)
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserDashboard;
