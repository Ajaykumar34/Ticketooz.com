
import { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Calendar, MapPin, IndianRupee, Mail, Award, Download } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateTicketPDF } from '@/components/TicketPDF';

const BookingSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [ticketDetails, setTicketDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { booking, event, selectedSeats, selectedGeneralTickets, customerInfo, totalPrice, basePrice, convenienceFee, taxes, eventOccurrenceId, occurrenceDate, occurrenceTime } = location.state || {};

  console.log('[BookingSuccess] Received state:', {
    booking: booking ? 'present' : 'missing',
    event: event ? event.name : 'missing',
    selectedSeats: selectedSeats ? selectedSeats.length : 'missing',
    selectedGeneralTickets: selectedGeneralTickets ? selectedGeneralTickets.length : 'missing',
    eventOccurrenceId,
    occurrenceDate,
    occurrenceTime,
    hasLocationState: !!location.state
  });

  useEffect(() => {
    // Fetch detailed ticket information
    const fetchTicketDetails = async () => {
      if (!booking?.id) {
        console.log('[BookingSuccess] No booking ID found, setting loading to false');
        setLoading(false);
        return;
      }

      try {
        const { data: tickets, error } = await supabase
          .from('tickets')
          .select(`
            *,
            bookings!inner (
              id,
              quantity,
              total_price,
              seat_numbers
            )
          `)
          .eq('booking_id', booking.id);

        if (error) {
          console.error('Error fetching ticket details:', error);
        } else {
          setTicketDetails(tickets || []);
        }
      } catch (err) {
        console.error('Unexpected error fetching tickets:', err);
      }
      setLoading(false);
    };

    fetchTicketDetails();

    // Simulate sending email
    if (booking && customerInfo) {
      console.log('Sending confirmation email to:', customerInfo.email);
      // In a real app, this would trigger an email service
    }
  }, [booking, customerInfo]);

  // Check if we have the minimum required data to show booking details
  if (!booking || !event) {
    console.log('[BookingSuccess] Missing required data:', { 
      hasBooking: !!booking, 
      hasEvent: !!event,
      locationState: location.state 
    });
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Booking Confirmed!</h2>
          <p className="text-gray-600 mb-6">
            Your booking has been successfully processed. 
            You will receive a confirmation email shortly.
          </p>
          <div className="space-y-3">
            <Link to="/dashboard" className="block">
              <Button className="w-full">
                View My Bookings
              </Button>
            </Link>
            <Link to="/events" className="block">
              <Button variant="outline" className="w-full">
                Browse More Events
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Enhanced seat category extraction that uses selectedSeats as primary source
  const getExactSeatInfoWithCategories = () => {
    console.log('Getting exact seat info with categories');
    console.log('selectedSeats:', selectedSeats);
    console.log('booking.seat_numbers:', booking.seat_numbers);
    
    // Priority 1: Use selectedSeats data (has complete category information)
    if (selectedSeats && Array.isArray(selectedSeats) && selectedSeats.length > 0) {
      console.log('Using selectedSeats for display with full category data');
      return selectedSeats.map(seat => ({
        ...seat,
        display_name: `${seat.row_name || ''}${seat.seat_number}`,
        category_display: seat.seat_categories?.name || seat.category_name || seat.category || seat.seat_category || 'General',
        price: seat.price || seat.base_price || 0
      }));
    }
    
    // Priority 2: Use booking.seat_numbers but try to match with selectedSeats for categories
    if (booking.seat_numbers && Array.isArray(booking.seat_numbers)) {
      console.log('Using booking.seat_numbers but trying to match categories from selectedSeats');
      
      return booking.seat_numbers.map(bookingSeat => {
        // Try to find matching seat in selectedSeats to get category info
        let categoryInfo = 'General';
        let seatPrice = bookingSeat.price || 0;
        
        if (selectedSeats && Array.isArray(selectedSeats)) {
          const matchingSeat = selectedSeats.find(selectedSeat => {
            const selectedSeatId = `${selectedSeat.row_name || ''}${selectedSeat.seat_number}`;
            const bookingSeatId = bookingSeat.seat_number;
            return selectedSeatId === bookingSeatId || 
                   selectedSeat.seat_number === bookingSeat.seat_number ||
                   `${selectedSeat.row_name}${selectedSeat.seat_number}` === bookingSeatId;
          });
          
          if (matchingSeat) {
            categoryInfo = matchingSeat.seat_categories?.name || matchingSeat.category_name || matchingSeat.category || 'General';
            seatPrice = matchingSeat.price || matchingSeat.base_price || bookingSeat.price || 0;
            console.log(`Found matching seat for ${bookingSeat.seat_number}: category = ${categoryInfo}`);
          }
        }
        
        return {
          ...bookingSeat,
          display_name: bookingSeat.seat_number,
          category_display: categoryInfo,
          price: seatPrice,
          seat_number: bookingSeat.seat_number.replace(/^[A-Z]+/, '').replace(/[A-Z]+$/, ''), // Extract just the number
          row_name: bookingSeat.seat_number.replace(/[0-9]/g, '') // Extract just the letters
        };
      });
    }
    
    console.log('No exact seat info available for display');
    return [];
  };

  const exactSeatInfo = getExactSeatInfoWithCategories();

  // Get unique seat categories for prominent display - using enhanced logic
  const getSelectedSeatCategories = (): string[] => {
    const categories = new Set<string>();
    
    console.log('Getting seat categories from exactSeatInfo:', exactSeatInfo);
    
    if (exactSeatInfo && exactSeatInfo.length > 0) {
      exactSeatInfo.forEach((seat: any) => {
        const categoryName = seat.category_display || 'General';
        categories.add(categoryName);
        console.log('Found seat category for seat', seat.display_name || seat.seat_number, ':', categoryName);
      });
    } else if (selectedGeneralTickets && selectedGeneralTickets.length > 0) {
      selectedGeneralTickets.forEach((ticket: any) => {
        categories.add(ticket.categoryName || 'General');
      });
    }
    
    const result = Array.from(categories);
    console.log('Final selected categories for display:', result);
    return result;
  };

  const selectedCategories = getSelectedSeatCategories();

  const handleDownloadTicket = () => {
    if (!booking || !event || !customerInfo) return;
    
    const ticketData = {
      booking: {
        id: booking.id,
        quantity: booking.quantity,
        total_price: booking.total_price,
        booking_date: booking.booking_date || new Date().toISOString(),
        seat_numbers: booking.seat_numbers as any
      },
      event: {
        name: event.name,
        start_datetime: event.start_datetime,
        venue: event.venues ? {
          name: event.venues.name,
          city: event.venues.city,
          address: event.venues.address
        } : null
      },
      customerInfo: {
        firstName: customerInfo.firstName,
        lastName: customerInfo.lastName,
        email: customerInfo.email,
        phone: customerInfo.phone
      },
      selectedSeats: selectedSeats || [],
      totalPrice: totalPrice || booking.total_price,
      basePrice: basePrice || booking.total_price * 0.85,
      convenienceFee: convenienceFee || booking.total_price * 0.15
    };
    
    generateTicketPDF(ticketData);
  };

  // Get display date from eventDate or fall back to event start_datetime
  const getDisplayDate = () => {
    if (eventOccurrenceId && event.is_recurring && occurrenceDate) {
      // For recurring events, use the actual occurrence date
      console.log('[BookingSuccess] Using occurrence date for recurring event:', occurrenceDate);
      return new Date(occurrenceDate + (occurrenceTime ? `T${occurrenceTime}` : 'T' + event.start_datetime.split('T')[1]));
    }
    return new Date(event.start_datetime);
  };

  const displayDate = getDisplayDate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Booking Confirmed!</h1>
          <p className="text-gray-600 mt-2">Your tickets have been successfully booked</p>
          
          {/* Prominent Exact Seat Category Display */}
          {selectedCategories.length > 0 && (
            <div className="mt-4 flex justify-center">
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-6 py-3">
                <div className="flex items-center space-x-2">
                  <Award className="w-5 h-5 text-blue-600" />
                  <span className="text-blue-800 font-semibold">
                    Booked Categories: {selectedCategories.join(', ')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Booking Details */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Details</CardTitle>
              <CardDescription>Your exact ticket information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{event.name}</h3>
                  <Badge className="mt-1">{event.category}</Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>
                      {displayDate.toLocaleDateString()} at {displayDate.toLocaleTimeString()}
                      {event.is_recurring && eventOccurrenceId && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Recurring Event
                        </Badge>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span>{event.venues?.name || event.venue || 'Venue TBD'}, {event.venues?.city || event.city || ''}</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Booking ID</h4>
                  <p className="text-sm font-mono bg-gray-100 p-2 rounded">{booking.id}</p>
                </div>

                {/* Enhanced Exact Seat Category Display */}
                {selectedCategories.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3 flex items-center">
                      <Award className="w-4 h-4 mr-2 text-blue-600" />
                      Your Exact Booked Categories
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCategories.map((category: string, index: number) => (
                        <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exact Seat Information - Updated Format */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Ticket Details</h4>
                  <div className="space-y-3">
                    <p className="text-sm"><strong>Total Quantity:</strong> {booking.quantity} ticket(s)</p>
                    
                    {exactSeatInfo && exactSeatInfo.length > 0 ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium mb-3 text-green-700">✓ Your Confirmed Seats:</p>
                          <div className="grid grid-cols-1 gap-2">
                            {exactSeatInfo.map((seat: any, index: number) => {
                              const rowName = seat.row_name || '';
                              const seatNumber = seat.seat_number || seat.id || `${index + 1}`;
                              const categoryName = seat.category_display || 'General';
                              const seatDisplay = `${rowName}${seatNumber}`.toUpperCase();
                              
                              // Format: "VIP seat A4" or "General seat B6"
                              const formattedSeatDisplay = `${categoryName} seat ${seatDisplay}`;
                              
                              return (
                                <div key={index} className="flex justify-between items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                                  <div className="flex items-center space-x-3">
                                    <Badge variant="outline" className="border-green-300 text-green-700">
                                      {categoryName}
                                    </Badge>
                                    <span className="font-medium text-green-700">
                                      {formattedSeatDisplay}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-medium text-green-700">₹{seat.price || seat.base_price || seat.total_price}</p>
                                    {seat.convenience_fee && (
                                      <p className="text-xs text-gray-500">
                                        +₹{seat.convenience_fee} fee
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm font-medium text-blue-800 mb-2">Booking Summary:</p>
                          <div className="text-xs text-blue-700">
                            {selectedCategories.map((category: string, index: number) => {
                              const categoryCount = exactSeatInfo.filter((seat: any) => {
                                return seat.category_display === category;
                              }).length;
                              return (
                                <div key={index} className="flex justify-between items-center py-1">
                                  <span>{category}:</span>
                                  <span className="font-medium">{categoryCount} seat{categoryCount > 1 ? 's' : ''}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : selectedGeneralTickets && selectedGeneralTickets.length > 0 ? (
                      <div>
                        <p className="text-sm font-medium mb-2">General Tickets:</p>
                        <div className="space-y-2">
                          {selectedGeneralTickets.map((ticket: any, index: number) => (
                            <div key={index} className="p-2 bg-gray-50 rounded border">
                              <div className="flex justify-between items-center">
                                <div>
                                  <Badge variant="secondary" className="text-xs">
                                    {ticket.categoryName}
                                  </Badge>
                                  <span className="text-sm ml-2">Qty: {ticket.quantity}</span>
                                </div>
                                <span className="text-sm font-medium">₹{ticket.total}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm"><strong>Type:</strong> General Admission</p>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Price Breakdown</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Base Price:</span>
                      <span>₹{basePrice || booking.total_price}</span>
                    </div>
                    {convenienceFee > 0 && (
                      <div className="flex justify-between">
                        <span>Convenience Fee:</span>
                        <span>₹{convenienceFee}</span>
                      </div>
                    )}
                    {taxes > 0 && (
                      <div className="flex justify-between">
                        <span>Taxes (GST):</span>
                        <span>₹{taxes}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold border-t pt-1">
                      <span>Total Paid:</span>
                      <div className="flex items-center space-x-1">
                        <IndianRupee className="w-4 h-4 text-green-600" />
                        <span className="text-green-600">₹{totalPrice || booking.total_price}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Info & Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p><strong>Name:</strong> {customerInfo.firstName} {customerInfo.lastName}</p>
                  <p><strong>Email:</strong> {customerInfo.email}</p>
                  <p><strong>Phone:</strong> {customerInfo.phone}</p>
                  {customerInfo.state && (
                    <p><strong>State:</strong> {customerInfo.state}</p>
                  )}
                  {customerInfo.address && (
                    <p><strong>Address:</strong> {customerInfo.address}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What's Next?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Email Confirmation</p>
                      <p className="text-sm text-gray-600">A confirmation email with your tickets has been sent to {customerInfo.email}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button
                onClick={handleDownloadTicket}
                className="w-full bg-green-600 hover:bg-green-700 flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Ticket</span>
              </Button>
              {event && (
                <Link to={`/event/${event.id}?refreshAfterBooking=true`}>
                  <Button variant="outline" className="w-full">
                    Back to Event Details
                  </Button>
                </Link>
              )}
              <Link to="/dashboard">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  View My Bookings
                </Button>
              </Link>
              <Link to="/events">
                <Button variant="outline" className="w-full">
                  Browse More Events
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingSuccess;
