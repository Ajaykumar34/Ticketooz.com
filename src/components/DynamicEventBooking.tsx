
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, Users, ShoppingCart, ArrowLeft, ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface EventOccurrence {
  id: string;
  occurrence_date: string;
  occurrence_time: string;
  total_tickets: number;
  available_tickets: number;
  is_active: boolean;
}

interface EventDetails {
  id: string;
  name: string;
  description?: string;
  venue?: string;
}

interface DynamicEventBookingProps {
  eventId: string;
  onBookingComplete?: (bookingId: string) => void;
}

const DynamicEventBooking = ({ eventId, onBookingComplete }: DynamicEventBookingProps) => {
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [occurrences, setOccurrences] = useState<EventOccurrence[]>([]);
  const [selectedOccurrence, setSelectedOccurrence] = useState<EventOccurrence | null>(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [currentStep, setCurrentStep] = useState<'select-date' | 'select-tickets' | 'checkout'>('select-date');
  const [loading, setLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });
  
  const { toast } = useToast();

  useEffect(() => {
    const fetchEventData = async () => {
      setLoading(true);
      try {
        // Fetch event details
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('id, name, description, venue')
          .eq('id', eventId)
          .single();

        if (eventError) throw eventError;
        setEvent(eventData);

        // Fetch available occurrences
        const { data: occurrenceData, error: occurrenceError } = await supabase
          .from('event_occurrences')
          .select('*')
          .eq('event_id', eventId)
          .eq('is_active', true)
          .gte('occurrence_date', new Date().toISOString().split('T')[0])
          .order('occurrence_date', { ascending: true });

        if (occurrenceError) throw occurrenceError;
        setOccurrences(occurrenceData || []);

      } catch (error) {
        console.error('Error fetching event data:', error);
        toast({
          title: "Error",
          description: "Failed to load event details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchEventData();
    }
  }, [eventId, toast]);

  const handleDateSelect = (occurrence: EventOccurrence) => {
    setSelectedOccurrence(occurrence);
    setCurrentStep('select-tickets');
  };

  const handleTicketSelection = () => {
    if (!selectedOccurrence || ticketQuantity > selectedOccurrence.available_tickets) {
      toast({
        title: "Invalid Selection",
        description: "Please select a valid number of tickets",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep('checkout');
  };

  const handleBooking = async () => {
    if (!selectedOccurrence) {
      toast({
        title: "No Date Selected",
        description: "Please select a date first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Get pricing information
      const { data: pricingData } = await supabase
        .from('event_seat_pricing')
        .select('base_price, convenience_fee, commission')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .single();

      const basePrice = pricingData?.base_price || 500;
      const convenienceFee = pricingData?.convenience_fee || basePrice * 0.02;
      const totalPrice = (basePrice + convenienceFee) * ticketQuantity;

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          event_id: eventId,
          event_occurrence_id: selectedOccurrence.id,
          quantity: ticketQuantity,
          total_price: totalPrice,
          customer_name: customerInfo.name,
          customer_email: customerInfo.email,
          customer_phone: customerInfo.phone,
          status: 'Confirmed'
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Update available tickets
      await supabase
        .from('event_occurrences')
        .update({ 
          available_tickets: selectedOccurrence.available_tickets - ticketQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOccurrence.id);

      toast({
        title: "Booking Confirmed!",
        description: `Your booking for ${ticketQuantity} ticket(s) has been confirmed.`,
      });

      onBookingComplete?.(booking.id);

    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Booking Failed",
        description: "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !event) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event details...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{event?.name}</CardTitle>
                {event?.description && (
                  <p className="text-gray-600 mt-2">{event.description}</p>
                )}
                {event?.venue && (
                  <p className="text-sm text-gray-600 mt-1">{event.venue}</p>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Progress Steps */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-2 ${currentStep === 'select-date' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === 'select-date' ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}>
                  1
                </div>
                <span>Select Date</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className={`flex items-center gap-2 ${currentStep === 'select-tickets' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === 'select-tickets' ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}>
                  2
                </div>
                <span>Select Tickets</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className={`flex items-center gap-2 ${currentStep === 'checkout' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === 'checkout' ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}>
                  3
                </div>
                <span>Checkout</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {currentStep === 'select-date' && 'Select Date & Time'}
              {currentStep === 'select-tickets' && 'Select Tickets'}
              {currentStep === 'checkout' && 'Checkout'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentStep === 'select-date' && (
              <div className="space-y-4">
                {occurrences.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {occurrences.map((occurrence) => (
                      <Card 
                        key={occurrence.id}
                        className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-300"
                        onClick={() => handleDateSelect(occurrence)}
                      >
                        <CardContent className="p-4 text-center">
                          <div className="font-semibold text-lg">
                            {format(parseISO(occurrence.occurrence_date), 'EEE, MMM dd')}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center justify-center gap-1 mt-1">
                            <Clock className="w-4 h-4" />
                            {occurrence.occurrence_time}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center justify-center gap-1 mt-2">
                            <Users className="w-4 h-4" />
                            {occurrence.available_tickets} tickets available
                          </div>
                          <Badge 
                            variant={occurrence.available_tickets > 20 ? "default" : "destructive"}
                            className="mt-2"
                          >
                            {occurrence.available_tickets > 20 ? "Available" : "Fast Filling"}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No upcoming dates available for this event.</p>
                  </div>
                )}
              </div>
            )}

            {currentStep === 'select-tickets' && selectedOccurrence && (
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold">Selected Date & Time</h3>
                  <p>{format(parseISO(selectedOccurrence.occurrence_date), 'EEEE, MMMM dd, yyyy')} at {selectedOccurrence.occurrence_time}</p>
                </div>
                
                <div className="space-y-4">
                  <Label htmlFor="quantity">Number of Tickets</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      max={selectedOccurrence.available_tickets}
                      value={ticketQuantity}
                      onChange={(e) => setTicketQuantity(parseInt(e.target.value) || 1)}
                      className="w-20"
                    />
                    <span className="text-sm text-gray-600">
                      (Max {selectedOccurrence.available_tickets} available)
                    </span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentStep('select-date')}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <Button 
                    onClick={handleTicketSelection}
                    disabled={ticketQuantity < 1 || ticketQuantity > selectedOccurrence.available_tickets}
                    className="flex items-center gap-2"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 'checkout' && selectedOccurrence && (
              <div className="space-y-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold">Booking Summary</h3>
                  <p><strong>Event:</strong> {event?.name}</p>
                  <p><strong>Date:</strong> {format(parseISO(selectedOccurrence.occurrence_date), 'EEEE, MMMM dd, yyyy')}</p>
                  <p><strong>Time:</strong> {selectedOccurrence.occurrence_time}</p>
                  <p><strong>Tickets:</strong> {ticketQuantity}</p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customer_name">Full Name</Label>
                      <Input
                        id="customer_name"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customer_email">Email</Label>
                      <Input
                        id="customer_email"
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="customer_phone">Phone Number</Label>
                    <Input
                      id="customer_phone"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentStep('select-tickets')}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <Button 
                    onClick={handleBooking}
                    disabled={loading}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    {loading ? 'Processing...' : 'Confirm Booking'}
                    <ShoppingCart className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DynamicEventBooking;
