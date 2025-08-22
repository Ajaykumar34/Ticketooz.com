
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Users, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import RecurringEventOccurrenceBooking from './RecurringEventOccurrenceBooking';

interface EventOccurrence {
  id: string;
  occurrence_date: string;
  occurrence_time: string;
  total_tickets: number;
  available_tickets: number;
  is_active: boolean;
}

interface Event {
  id: string;
  name: string;
  description?: string;
  poster?: string;
  artist_name?: string;
  is_recurring?: boolean;
  recurrence_type?: string;
  event_time?: string;
  venues?: {
    name: string;
    address: string;
    city: string;
    state?: string;
  } | null;
}

interface BookMyShowStyleBookingProps {
  eventId: string;
  refreshTrigger?: number;
  onBookingComplete?: (bookingId: string) => void;
}

const BookMyShowStyleBooking = ({ eventId, refreshTrigger, onBookingComplete }: BookMyShowStyleBookingProps) => {
  const [event, setEvent] = useState<Event | null>(null);
  const [occurrences, setOccurrences] = useState<EventOccurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOccurrence, setSelectedOccurrence] = useState<EventOccurrence | null>(null);
  const [showBookingFlow, setShowBookingFlow] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchEventData();
  }, [eventId]);

  // Refresh data when refreshTrigger changes (e.g., when returning from booking)
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      console.log('[BookMyShow] Refresh triggered, refetching data...');
      fetchEventData();
    }
  }, [refreshTrigger]);

  const getDisplayTime = () => {
    if (!event?.event_time) return '';
    
    console.log('[BookMyShow] Getting display time, event.event_time:', event.event_time);
    
    // Format the event time to HH:mm format
    const [hours, minutes] = event.event_time.split(':');
    const displayTime = `${hours}:${minutes}`;
    
    console.log('[BookMyShow] Display time being used:', displayTime);
    return displayTime;
  };

  const fetchEventData = async () => {
    try {
      setLoading(true);
      console.log('[BookMyShow] Fetching event data for:', eventId);

      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(`
          id,
          name,
          description,
          poster,
          artist_name,
          is_recurring,
          recurrence_type,
          event_time,
          venues:venue_id (
            name,
            address,
            city,
            state
          )
        `)
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('[BookMyShow] Error fetching event:', eventError);
        throw eventError;
      }

      console.log('[BookMyShow] Event data:', eventData);
      setEvent(eventData);

      // Fetch occurrences for recurring events
      if (eventData.is_recurring) {
        await fetchOccurrences();
      } else {
        console.log('[BookMyShow] Event is not recurring, no occurrences to fetch');
        setOccurrences([]);
      }
    } catch (error) {
      console.error('[BookMyShow] Error fetching event data:', error);
      toast({
        title: "Error",
        description: "Failed to load event details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOccurrences = async () => {
    console.log('[BookMyShow] Fetching occurrences for recurring event...');
    
    const { data: occurrenceData, error: occurrenceError } = await supabase
      .from('event_occurrences')
      .select('*')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .gte('occurrence_date', new Date().toISOString().split('T')[0])
      .order('occurrence_date', { ascending: true })
      .order('occurrence_time', { ascending: true });

    if (occurrenceError) {
      console.error('[BookMyShow] Error fetching occurrences:', occurrenceError);
      throw occurrenceError;
    }

    console.log('[BookMyShow] Raw occurrence data:', occurrenceData);

    if (!occurrenceData || occurrenceData.length === 0) {
      console.warn('[BookMyShow] No occurrences found for recurring event');
      setOccurrences([]);
    } else {
      // Update occurrences with actual availability by checking bookings
      const updatedOccurrences = await Promise.all(
        occurrenceData.map(async (occurrence) => {
          // Get booked tickets count for this occurrence
          const { data: bookings } = await supabase
            .from('bookings')
            .select('quantity')
            .eq('event_occurrence_id', occurrence.id)
            .eq('status', 'Confirmed');

          const bookedTickets = bookings?.reduce((sum, booking) => sum + (booking.quantity || 0), 0) || 0;
          const actualAvailable = Math.max(0, occurrence.total_tickets - bookedTickets);

          return {
            ...occurrence,
            available_tickets: actualAvailable
          };
        })
      );

      console.log('[BookMyShow] Updated occurrences with actual availability:', updatedOccurrences);
      setOccurrences(updatedOccurrences);
    }
  };

  const handleOccurrenceSelect = (occurrence: EventOccurrence) => {
    console.log('[BookMyShow] Occurrence selected:', occurrence);
    setSelectedOccurrence(occurrence);
    setShowBookingFlow(true);
  };

  const handleBookingComplete = (bookingId: string) => {
    setShowBookingFlow(false);
    setSelectedOccurrence(null);
    // Refresh occurrences to update availability after booking
    fetchOccurrences();
    onBookingComplete?.(bookingId);
  };

  const handleBackToDateSelection = () => {
    setShowBookingFlow(false);
    setSelectedOccurrence(null);
    // Refresh occurrences when going back to update availability
    fetchOccurrences();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Event not found</p>
      </div>
    );
  }

  if (showBookingFlow && selectedOccurrence) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={handleBackToDateSelection}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Date Selection
        </Button>
        <RecurringEventOccurrenceBooking
          eventId={event.id}
          eventName={event.name}
          eventDescription={event.description}
          venueName={event.venues?.name}
          venueAddress={event.venues?.address}
          selectedOccurrence={selectedOccurrence}
          refreshTrigger={refreshTrigger}
          onBookingComplete={handleBookingComplete}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="space-y-6">
        {/* Date Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Select Date & Time
              <Button
                variant="outline"
                size="sm"
                onClick={fetchOccurrences}
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </CardTitle>
            <p className="text-muted-foreground">
              Choose your preferred date for {event.name}
            </p>
          </CardHeader>
          <CardContent>
            {occurrences.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No upcoming dates available for this event.</p>
                <p className="text-sm text-gray-500 mt-2">
                  If this is a recurring event, occurrences may still be generating. Please refresh the page in a moment.
                </p>
                <Button 
                  variant="outline" 
                  onClick={fetchEventData}
                  className="mt-4"
                >
                  Refresh
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {occurrences.map((occurrence) => (
                  <Card
                    key={occurrence.id}
                    className={`cursor-pointer transition-colors hover:border-primary/50 ${
                      occurrence.available_tickets === 0 ? 'opacity-50' : ''
                    }`}
                    onClick={() => occurrence.available_tickets > 0 && handleOccurrenceSelect(occurrence)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">
                              {format(new Date(occurrence.occurrence_date), 'dd')}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(occurrence.occurrence_date), 'MMM')}
                            </div>
                          </div>
                          <div>
                            <div className="font-semibold">
                              {format(new Date(occurrence.occurrence_date), 'EEEE')}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {getDisplayTime()}
                            </div>
                            {event.venues && (
                              <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="w-4 h-4" />
                                {event.venues.name}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {occurrence.available_tickets === 0 ? (
                              <span className="text-red-500 font-semibold">Sold Out</span>
                            ) : (
                              <span>{occurrence.available_tickets} / {occurrence.total_tickets} available</span>
                            )}
                          </div>
                          <Button 
                            variant={occurrence.available_tickets > 0 ? "default" : "secondary"}
                            disabled={occurrence.available_tickets === 0}
                            className="mt-2"
                          >
                            {occurrence.available_tickets === 0 ? 'Sold Out' : 'Book Now'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BookMyShowStyleBooking;
