import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, Users, ArrowRight, ArrowLeft } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, isAfter, isBefore } from 'date-fns';
import { useRecurringEventStatus } from '@/hooks/useRecurringEventStatus';
import RecurringEventStatusMessage from '@/components/RecurringEventStatusMessage';

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
  is_recurring?: boolean;
  recurrence_type?: string;
  event_time?: string;
}

interface RecurringEventBookingProps {
  eventId: string;
  onBookingComplete?: (bookingId: string) => void;
}

const RecurringEventBookingInterface = ({ eventId, onBookingComplete }: RecurringEventBookingProps) => {
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [occurrences, setOccurrences] = useState<EventOccurrence[]>([]);
  const [filteredOccurrences, setFilteredOccurrences] = useState<EventOccurrence[]>([]);
  const [selectedOccurrence, setSelectedOccurrence] = useState<EventOccurrence | null>(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [loading, setLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });
  
  const { toast } = useToast();
  const recurringStatus = useRecurringEventStatus(eventId);

  useEffect(() => {
    fetchEventData();
  }, [eventId]);

  useEffect(() => {
    if (viewMode === 'calendar') {
      filterOccurrencesByWeek();
    } else {
      setFilteredOccurrences(occurrences);
    }
  }, [occurrences, currentWeek, viewMode]);

  // Refetch occurrences when recurring status indicates they're available
  useEffect(() => {
    if (recurringStatus.hasOccurrences && !recurringStatus.isLoading) {
      fetchOccurrences();
    }
  }, [recurringStatus.hasOccurrences, recurringStatus.isLoading]);

  const fetchEventData = async () => {
    try {
      console.log('[RecurringBooking] Fetching event data for:', eventId);
      
      // Fetch event details INCLUDING event_time
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, name, description, is_recurring, recurrence_type, event_time, venues:venue_id(name)')
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('[RecurringBooking] Event fetch error:', eventError);
        throw eventError;
      }
      
      console.log('[RecurringBooking] Event data with event_time:', eventData);
      setEvent({
        ...eventData,
        venue: eventData.venues?.name,
        event_time: eventData.event_time // Ensure event_time is included
      });

      // Only fetch occurrences if the status check shows they're ready
      if (recurringStatus.hasOccurrences) {
        await fetchOccurrences();
      }

    } catch (error) {
      console.error('[RecurringBooking] Error fetching event data:', error);
      toast({
        title: "Error",
        description: "Failed to load event details",
        variant: "destructive",
      });
    }
  };

  const fetchOccurrences = async () => {
    try {
      // Fetch future occurrences
      const { data: occurrenceData, error: occurrenceError } = await supabase
        .from('event_occurrences')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .gte('occurrence_date', new Date().toISOString().split('T')[0])
        .order('occurrence_date', { ascending: true })
        .order('occurrence_time', { ascending: true });

      if (occurrenceError) {
        console.error('[RecurringBooking] Occurrence fetch error:', occurrenceError);
        throw occurrenceError;
      }
      
      console.log('[RecurringBooking] Occurrences data:', occurrenceData);
      setOccurrences(occurrenceData || []);

    } catch (error) {
      console.error('[RecurringBooking] Error fetching occurrences:', error);
      toast({
        title: "Error",
        description: "Failed to load event occurrences",
        variant: "destructive",
      });
    }
  };

  const filterOccurrencesByWeek = () => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
    
    const weekOccurrences = occurrences.filter(occurrence => {
      const occurrenceDate = new Date(occurrence.occurrence_date);
      return !isBefore(occurrenceDate, weekStart) && !isAfter(occurrenceDate, weekEnd);
    });
    
    setFilteredOccurrences(weekOccurrences);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = addDays(currentWeek, direction === 'next' ? 7 : -7);
    setCurrentWeek(newWeek);
  };

  const handleDateSelect = (occurrence: EventOccurrence) => {
    console.log('[RecurringBooking] Date selected:', occurrence);
    setSelectedOccurrence(occurrence);
  };

  const handleBooking = async () => {
    if (!selectedOccurrence || !customerInfo.name || !customerInfo.email) {
      toast({
        title: "Missing Information",
        description: "Please select a date and fill in your details",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log('[RecurringBooking] Creating booking for:', selectedOccurrence);
      
      // Calculate pricing
      const basePrice = 500; // Default price
      const convenienceFee = basePrice * 0.02;
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

      if (bookingError) {
        console.error('[RecurringBooking] Booking error:', bookingError);
        throw bookingError;
      }

      console.log('[RecurringBooking] Booking created:', booking);

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
        description: `Your booking for ${ticketQuantity} ticket(s) on ${format(new Date(selectedOccurrence.occurrence_date), 'PPP')} has been confirmed.`,
      });

      onBookingComplete?.(booking.id);

      // Reset form
      setSelectedOccurrence(null);
      setTicketQuantity(1);
      setCustomerInfo({ name: '', email: '', phone: '' });
      
      // Refresh occurrences
      fetchOccurrences();

    } catch (error) {
      console.error('[RecurringBooking] Error creating booking:', error);
      toast({
        title: "Booking Failed",
        description: "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get display time - ALWAYS use main event time, never occurrence time
  const getDisplayTime = () => {
    console.log('[RecurringBooking] Getting display time, event.event_time:', event?.event_time);
    if (event?.event_time) {
      // Format the time to display in HH:MM format (e.g., "21:00:00" -> "21:00")
      const [hours, minutes] = event.event_time.split(':');
      return `${hours}:${minutes}`;
    }
    return '21:00'; // Default fallback
  };

  if (!event) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading event details...</p>
        </CardContent>
      </Card>
    );
  }

  // Show status message if occurrences aren't ready yet
  if (!recurringStatus.hasOccurrences || recurringStatus.isGenerating || recurringStatus.error) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Event Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{event?.name}</CardTitle>
                {event?.description && (
                  <p className="text-muted-foreground mt-2">{event.description}</p>
                )}
                {event?.venue && (
                  <p className="text-sm text-muted-foreground mt-1">{event.venue}</p>
                )}
                {event?.is_recurring && (
                  <Badge variant="secondary" className="mt-2">
                    Recurring Event - {event.recurrence_type}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Status Message */}
        <RecurringEventStatusMessage
          isGenerating={recurringStatus.isGenerating}
          isLoading={recurringStatus.isLoading}
          error={recurringStatus.error}
          occurrenceCount={recurringStatus.occurrenceCount}
          onRefresh={recurringStatus.refetch}
          eventName={event.name}
        />
      </div>
    );
  }

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const displayTime = getDisplayTime(); // This will always show main event time (21:00)

  console.log('[RecurringBooking] Display time being used:', displayTime);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Event Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{event?.name}</CardTitle>
              {event?.description && (
                <p className="text-muted-foreground mt-2">{event.description}</p>
              )}
              {event?.venue && (
                <p className="text-sm text-muted-foreground mt-1">{event.venue}</p>
              )}
              {event?.is_recurring && (
                <Badge variant="secondary" className="mt-2">
                  Recurring Event - {event.recurrence_type}
                </Badge>
              )}
              {/* Display main event time */}
              {event?.event_time && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                  <Clock className="w-4 h-4" />
                  <span>Event Time: {displayTime}</span>
                  <Badge variant="outline" className="text-xs">Main Event Time</Badge>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('calendar')}
              >
                Calendar
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                List
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Select Date & Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          {occurrences.length === 0 ? (
            <RecurringEventStatusMessage
              isGenerating={false}
              isLoading={false}
              error={null}
              occurrenceCount={0}
              onRefresh={recurringStatus.refetch}
              eventName={event.name}
            />
          ) : viewMode === 'calendar' ? (
            <div className="space-y-4">
              {/* Week Navigation */}
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous Week
                </Button>
                <h3 className="text-lg font-semibold">
                  {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
                </h3>
                <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                  Next Week
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day, index) => {
                  const dayOccurrences = filteredOccurrences.filter(occ => 
                    isSameDay(new Date(occ.occurrence_date), day)
                  );
                  
                  return (
                    <div key={index} className="border rounded-lg p-2 min-h-[120px]">
                      <div className="text-sm font-medium mb-2">
                        {format(day, 'EEE d')}
                      </div>
                      <div className="space-y-1">
                        {dayOccurrences.map((occurrence) => (
                          <Button
                            key={occurrence.id}
                            variant={selectedOccurrence?.id === occurrence.id ? "default" : "outline"}
                            size="sm"
                            className="w-full text-xs h-auto p-1"
                            onClick={() => handleDateSelect(occurrence)}
                            disabled={occurrence.available_tickets === 0}
                          >
                            <div className="text-center">
                              <div className="text-xs opacity-75">
                                {occurrence.available_tickets} left
                              </div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOccurrences.slice(0, 20).map((occurrence) => (
                <Card 
                  key={occurrence.id}
                  className={`cursor-pointer transition-colors ${
                    selectedOccurrence?.id === occurrence.id 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => handleDateSelect(occurrence)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <div className="font-semibold">
                            {format(new Date(occurrence.occurrence_date), 'EEEE, MMMM d, yyyy')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          {occurrence.available_tickets} available
                        </div>
                        <Badge 
                          variant={occurrence.available_tickets > 20 ? "default" : "destructive"}
                          className="mt-1"
                        >
                          {occurrence.available_tickets > 20 ? "Available" : "Limited"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Form */}
      {selectedOccurrence && (
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Booking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-primary/10 p-4 rounded-lg">
              <h4 className="font-semibold">Selected Date & Time</h4>
              <p>{format(new Date(selectedOccurrence.occurrence_date), 'EEEE, MMMM d, yyyy')} at {displayTime}</p>
              <Badge variant="outline" className="text-xs mt-1">Main Event Time</Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Number of Tickets</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={selectedOccurrence.available_tickets}
                  value={ticketQuantity}
                  onChange={(e) => setTicketQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter your phone number"
                />
              </div>
            </div>

            <Button 
              onClick={handleBooking}
              disabled={loading || !customerInfo.name || !customerInfo.email}
              className="w-full"
              size="lg"
            >
              {loading ? 'Processing...' : `Book ${ticketQuantity} Ticket(s)`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RecurringEventBookingInterface;
