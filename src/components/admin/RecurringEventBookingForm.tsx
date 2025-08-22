
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { bookGeneralAdmission } from '@/lib/bookGeneralAdmission';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, Clock, MapPin, User } from 'lucide-react';
import { format } from 'date-fns';

interface BookingDetails {
  holderName: string;
  holderEmail: string;
  holderPhone: string;
  seatCategoryId: string;
  quantity: number;
}

interface RecurringEventBookingFormProps {
  event: {
    id: string;
    name: string;
    description?: string;
    venues?: {
      name: string;
      address: string;
      city: string;
      state: string;
    };
  };
  selectedOccurrence: {
    id: string;
    occurrence_date: string;
    occurrence_time: string;
    available_tickets: number;
  };
  selectedCategory: {
    id: string;
    name: string;
    base_price: number;
    convenience_fee?: number;
  };
  onBookingSubmit: (bookingId: string) => void;
  onBack: () => void;
}

const RecurringEventBookingForm = ({
  event,
  selectedOccurrence,
  selectedCategory,
  onBookingSubmit,
  onBack
}: RecurringEventBookingFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails>({
    holderName: '',
    holderEmail: '',
    holderPhone: '',
    seatCategoryId: selectedCategory.id,
    quantity: 1
  });

  const totalTicketPrice = selectedCategory.base_price * bookingDetails.quantity;
  const totalConvenienceFee = (selectedCategory.convenience_fee || 0) * bookingDetails.quantity;
  const totalAmount = totalTicketPrice + totalConvenienceFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to complete the booking",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Prepare the selected tickets array
      const selectedTickets = [{
        categoryName: selectedCategory.name,
        quantity: bookingDetails.quantity,
        basePrice: selectedCategory.base_price,
        convenienceFee: selectedCategory.convenience_fee || 0
      }];

      // Prepare customer info
      const customerData = {
        firstName: bookingDetails.holderName.split(' ')[0] || bookingDetails.holderName,
        lastName: bookingDetails.holderName.split(' ').slice(1).join(' ') || '',
        email: bookingDetails.holderEmail,
        phone: bookingDetails.holderPhone
      };

      const booking = await bookGeneralAdmission(
        event.id,
        selectedTickets,
        customerData,
        totalAmount,
        totalTicketPrice,
        totalConvenienceFee,
        selectedOccurrence.id,
        selectedCategory.id
      );

      toast({
        title: "Booking Confirmed!",
        description: `Your booking for ${bookingDetails.quantity} ticket(s) has been confirmed.`,
      });

      onBookingSubmit(booking.id);
    } catch (error: any) {
      console.error('Booking error:', error);
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to complete booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const occurrenceDate = new Date(selectedOccurrence.occurrence_date);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="outline" onClick={onBack} className="mb-4">
            ← Back to Selection
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Booking</h1>
          <p className="text-gray-600 mt-2">Please provide your details to complete the ticket booking</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Booking Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="holderName">Full Name *</Label>
                      <Input
                        id="holderName"
                        value={bookingDetails.holderName}
                        onChange={(e) => setBookingDetails(prev => ({
                          ...prev,
                          holderName: e.target.value
                        }))}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="holderPhone">Phone Number *</Label>
                      <Input
                        id="holderPhone"
                        type="tel"
                        value={bookingDetails.holderPhone}
                        onChange={(e) => setBookingDetails(prev => ({
                          ...prev,
                          holderPhone: e.target.value
                        }))}
                        placeholder="Enter your phone number"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="holderEmail">Email Address *</Label>
                    <Input
                      id="holderEmail"
                      type="email"
                      value={bookingDetails.holderEmail}
                      onChange={(e) => setBookingDetails(prev => ({
                        ...prev,
                        holderEmail: e.target.value
                      }))}
                      placeholder="Enter your email address"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Number of Tickets</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min={1}
                      max={selectedOccurrence.available_tickets}
                      value={bookingDetails.quantity}
                      onChange={(e) => setBookingDetails(prev => ({
                        ...prev,
                        quantity: parseInt(e.target.value) || 1
                      }))}
                      placeholder="Number of tickets"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-medium"
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Confirm Booking & Proceed to Payment'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-6">
              {/* Event Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Event Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <h3 className="font-semibold text-lg">{event.name}</h3>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{format(occurrenceDate, 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{selectedOccurrence.occurrence_time}</span>
                    </div>
                    {event.venues && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5" />
                        <div>
                          <div>{event.venues.name}</div>
                          <div className="text-xs">{event.venues.address}</div>
                          <div className="text-xs">{event.venues.city}, {event.venues.state}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Ticket Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Ticket Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{selectedCategory.name} × {bookingDetails.quantity}</span>
                      <span>₹{totalTicketPrice}</span>
                    </div>
                    {totalConvenienceFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Convenience Fee</span>
                        <span>₹{totalConvenienceFee}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Total Tickets:</span>
                      <span className="font-medium">{bookingDetails.quantity}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">Total Amount:</span>
                      <span className="font-bold text-xl text-green-600">₹{totalAmount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecurringEventBookingForm;
