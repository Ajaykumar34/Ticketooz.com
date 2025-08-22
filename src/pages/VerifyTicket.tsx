
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Calendar, MapPin, User, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TicketData {
  booking: {
    id: string;
    formatted_booking_id: string;
    quantity: number;
    total_price: number;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    status: string;
    booking_date: string;
    seat_numbers: any[];
  };
  event: {
    id: string;
    name: string;
    start_datetime: string;
    poster?: string;
    venues?: {
      name: string;
      address: string;
      city: string;
    };
  };
}

const VerifyTicket = () => {
  const { bookingId } = useParams();
  const { toast } = useToast();
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const verifyTicket = async () => {
      if (!bookingId) {
        console.error('No booking ID provided');
        setLoading(false);
        return;
      }

      console.log('Verifying ticket with booking ID:', bookingId);
      setLoading(true);
      
      try {
        // First try to fetch by formatted_booking_id
        let { data: booking, error } = await supabase
          .from('bookings')
          .select(`
            *,
            events!inner (
              id,
              name,
              start_datetime,
              poster,
              venues:venue_id (
                name,
                address,
                city
              )
            )
          `)
          .eq('formatted_booking_id', bookingId)
          .single();

        // If not found by formatted_booking_id, try by regular id
        if (error && error.code === 'PGRST116') {
          console.log('Booking not found by formatted_booking_id, trying by id...');
          const { data: bookingById, error: errorById } = await supabase
            .from('bookings')
            .select(`
              *,
              events!inner (
                id,
                name,
                start_datetime,
                poster,
                venues:venue_id (
                  name,
                  address,
                  city
                )
              )
            `)
            .eq('id', bookingId)
            .single();
          
          booking = bookingById;
          error = errorById;
        }

        if (error) {
          console.error('Error fetching booking:', error);
          throw error;
        }

        if (booking) {
          console.log('Booking found:', booking);
          
          setTicketData({
            booking: {
              ...booking,
              seat_numbers: Array.isArray(booking.seat_numbers) ? booking.seat_numbers : []
            },
            event: {
              ...booking.events,
              venues: booking.events.venues
            }
          });
          
          // Check if ticket is valid (confirmed status and event hasn't passed)
          const eventDate = new Date(booking.events.start_datetime);
          const now = new Date();
          const isEventPast = eventDate < now;
          const isConfirmed = booking.status === 'Confirmed';
          
          setIsValid(isConfirmed && !isEventPast);
          
          if (isConfirmed && !isEventPast) {
            toast({
              title: "Valid Ticket",
              description: "This ticket is verified and valid for entry",
              variant: "default",
            });
          } else if (isEventPast) {
            toast({
              title: "Event Expired",
              description: "This event has already occurred",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Invalid Ticket",
              description: "This ticket is not confirmed or has been cancelled",
              variant: "destructive",
            });
          }
        } else {
          console.error('No booking found for ID:', bookingId);
          setIsValid(false);
        }

      } catch (error) {
        console.error('Error verifying ticket:', error);
        toast({
          title: "Verification Failed",
          description: "Could not verify this ticket. Please check the booking ID.",
          variant: "destructive",
        });
        setIsValid(false);
      } finally {
        setLoading(false);
      }
    };

    verifyTicket();
  }, [bookingId, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Verifying ticket...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <img 
                src="/lovable-uploads/42be0531-8901-4c57-a434-d624766ed47b.png"
                alt="Ticketooz"
                className="h-8 w-auto"
                style={{ maxHeight: 40, maxWidth: 120 }}
              />
              <h1 className="text-xl font-bold text-gray-900">Ticket Verification</h1>
            </div>
            <Link to="/" className="inline-flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Verification Status */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-3">
                {isValid ? (
                  <>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                    <div className="text-center">
                      <h2 className="text-2xl font-bold text-green-600">Valid Ticket</h2>
                      <p className="text-gray-600">This ticket is verified and valid for entry</p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-8 h-8 text-red-600" />
                    <div className="text-center">
                      <h2 className="text-2xl font-bold text-red-600">Invalid Ticket</h2>
                      <p className="text-gray-600">
                        {ticketData ? 'This ticket is expired or cancelled' : 'This ticket could not be verified'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ticket Details */}
          {ticketData && (
            <>
              {/* Event Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Event Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold">{ticketData.event.name}</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium">Date & Time</p>
                          <p className="text-gray-600 text-sm">
                            {new Date(ticketData.event.start_datetime).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>

                      {ticketData.event.venues && (
                        <div className="flex items-center space-x-3">
                          <MapPin className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium">Venue</p>
                            <p className="text-gray-600 text-sm">{ticketData.event.venues.name}</p>
                            <p className="text-gray-500 text-xs">
                              {ticketData.event.venues.address}, {ticketData.event.venues.city}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Booking Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Booking Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="font-medium">Booking ID</p>
                        <p className="text-gray-600">{ticketData.booking.formatted_booking_id}</p>
                      </div>
                      <div>
                        <p className="font-medium">Status</p>
                        <Badge 
                          variant={ticketData.booking.status === 'Confirmed' ? 'default' : 'destructive'}
                        >
                          {ticketData.booking.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="font-medium">Quantity</p>
                        <p className="text-gray-600">{ticketData.booking.quantity} ticket(s)</p>
                      </div>
                      <div>
                        <p className="font-medium">Total Amount</p>
                        <p className="text-gray-600">₹{ticketData.booking.total_price.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <User className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Primary Guest</p>
                        <p className="text-gray-600">{ticketData.booking.customer_name}</p>
                        <p className="text-gray-500 text-sm">{ticketData.booking.customer_email}</p>
                      </div>
                    </div>

                    {ticketData.booking.seat_numbers && ticketData.booking.seat_numbers.length > 0 && (
                      <div>
                        <p className="font-medium mb-2">Seat Details</p>
                        <div className="flex flex-wrap gap-2">
                          {ticketData.booking.seat_numbers.map((seat: any, index: number) => (
                            <Badge key={index} variant="outline">
                              {seat.seat_category} - {seat.seat_number}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="font-medium">Booking Date</p>
                      <p className="text-gray-600 text-sm">
                        {new Date(ticketData.booking.booking_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4">
            <Button variant="outline" asChild>
              <Link to="/">Back to Home</Link>
            </Button>
            {!ticketData && (
              <Button variant="outline" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyTicket;
