
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, MapPin, Clock, User, Phone, Mail } from 'lucide-react';
import { format } from 'date-fns';

interface BookingDetails {
  holderName: string;
  holderEmail: string;
  holderPhone: string;
  tickets: Array<{
    categoryId: string;
    categoryName: string;
    quantity: number;
    price: number;
    total: number;
  }>;
}

interface GeneralAdmissionBookingFormProps {
  event: {
    id: string;
    name: string;
    start_datetime: string;
    venues?: {
      name: string;
      address: string;
      city: string;
      state: string;
    };
  };
  selectedTickets: Array<{
    categoryId: string;
    categoryName: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  onBookingSubmit: (bookingDetails: BookingDetails) => void;
  onBack: () => void;
}

const GeneralAdmissionBookingForm = ({
  event,
  selectedTickets,
  onBookingSubmit,
  onBack
}: GeneralAdmissionBookingFormProps) => {
  const [bookingDetails, setBookingDetails] = useState({
    holderName: '',
    holderEmail: '',
    holderPhone: ''
  });

  const getTotalAmount = () => {
    return selectedTickets.reduce((sum, ticket) => sum + ticket.total, 0);
  };

  const getTotalTickets = () => {
    return selectedTickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onBookingSubmit({
      ...bookingDetails,
      tickets: selectedTickets
    });
  };

  const eventDate = new Date(event.start_datetime);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="outline" onClick={onBack} className="mb-4">
            ← Back to Ticket Selection
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

                  <Button 
                    type="submit" 
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-medium"
                    size="lg"
                  >
                    Confirm Booking & Proceed to Payment
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
                      <span>{format(eventDate, 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{format(eventDate, 'h:mm a')}</span>
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
                    {selectedTickets.map((ticket, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{ticket.categoryName} × {ticket.quantity}</span>
                        <span>₹{ticket.total}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Total Tickets:</span>
                      <span className="font-medium">{getTotalTickets()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">Total Amount:</span>
                      <span className="font-bold text-xl text-green-600">₹{getTotalAmount()}</span>
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

export default GeneralAdmissionBookingForm;
