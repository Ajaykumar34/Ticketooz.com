import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Ticket, Clock, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import SeatMap from "@/components/SeatMap";
import EventHeader from "@/components/EventHeader";
import SimilarEventsSection from "@/components/SimilarEventsSection";
import BookMyShowStyleBooking from "@/components/BookMyShowStyleBooking";
import GeneralAdmissionBookingInterface from "@/components/GeneralAdmissionBookingInterface";
import SEOHead from "@/components/SEOHead";
import { checkAndUpdateSeatMapSoldOutStatus } from "@/utils/seatMapSoldOutUtils";

interface Artist {
  name: string;
  image?: string;
}

interface EventData {
  id: string;
  name: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
  venue_id?: string;
  sale_start: string;
  sale_end: string;
  is_featured: boolean;
  poster?: string;
  artist_name?: string;
  artist_image?: string;
  artists?: Artist[];
  tags?: string[];
  genres?: string[];
  terms_and_conditions?: string;
  status?: string;
  category?: string;
  sub_category?: string;
  genre?: string;
  language?: string;
  duration?: number;
  layout_type?: 'general' | 'seatmap' | null;
  is_recurring?: boolean;
  recurrence_type?: string;
  recurrence_end_date?: string;
  event_expiry_minutes?: number;
  ticket_price_min?: number;
  ticket_price_max?: number;
  age_restriction?: string;
  dress_code?: string;
  parking_info?: string;
  accessibility_info?: string;
  venues?: {
    id: string;
    name: string;
    address: string;
    city: string;
    state?: string;
    latitude?: number;
    longitude?: number;
  } | null;
}

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeats, setSelectedSeats] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Listen for successful bookings from local storage or URL params to refresh data
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Refresh data when page becomes visible (user returns from booking)
        setRefreshTrigger(prev => prev + 1);
      }
    };

    // Check if we returned from a successful booking
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('refreshAfterBooking') === 'true') {
      // Remove the parameter and refresh
      window.history.replaceState({}, '', window.location.pathname);
      setRefreshTrigger(prev => prev + 1);
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        console.log('[EventDetails] Fetching event with ID:', id);
        
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select(`
            *,
            venues:venue_id (
              id,
              name,
              address,
              city,
              state,
              latitude,
              longitude
            )
          `)
          .eq('id', id)
          .single();

        if (eventError) {
          console.error('[EventDetails] Error fetching event:', eventError);
          throw eventError;
        }

        // Fetch category separately if category_id exists
        let categoryName = eventData.category; // fallback to legacy category field
        if (eventData.category_id) {
          const { data: categoryData, error: categoryError } = await supabase
            .from('categories')
            .select('name')
            .eq('id', eventData.category_id)
            .single();

          if (!categoryError && categoryData) {
            categoryName = categoryData.name;
          }
        }

        console.log('[EventDetails] Event loaded:', eventData);
        
        const layoutType = eventData.layout_type as 'general' | 'seatmap' | null;
        
        // Enhanced artists array processing - handle multiple formats
        let artists: Artist[] = [];
        
        // First check if there's an artists field with JSON data
        if ((eventData as any).artists) {
          try {
            const parsed = JSON.parse((eventData as any).artists);
            if (Array.isArray(parsed)) {
              artists = parsed.map(item => ({
                name: item.name || item,
                image: item.image || undefined
              }));
            }
          } catch (error) {
            console.log('[EventDetails] Artists field is not valid JSON');
          }
        }
        
        // If no artists from JSON field, fall back to legacy artist_name field
        if (artists.length === 0 && eventData.artist_name) {
          // Handle comma-separated artist names
          if (eventData.artist_name.includes(',')) {
            const artistNames = eventData.artist_name.split(',').map(name => name.trim());
            artists = artistNames.map(name => ({ 
              name, 
              image: eventData.artist_image 
            }));
          } else {
            artists = [{
              name: eventData.artist_name,
              image: eventData.artist_image
            }];
          }
        }
        
        // Process tags from event_tags field
        let tags: string[] = [];
        if ((eventData as any).event_tags) {
          try {
            const parsed = JSON.parse((eventData as any).event_tags);
            if (Array.isArray(parsed)) {
              tags = parsed.filter(tag => typeof tag === 'string');
            }
          } catch (error) {
            console.log('[EventDetails] Event tags field is not valid JSON');
          }
        }

        // Enhanced genre processing to handle multiple formats
        let genres: string[] = [];
        
        console.log('[EventDetails] Processing genres:', {
          genresField: (eventData as any).genres,
          genreField: eventData.genre,
          genresType: typeof (eventData as any).genres
        });
        
        // First, try to process the genres field
        if ((eventData as any).genres) {
          try {
            // Handle if genres is already an array
            if (Array.isArray((eventData as any).genres)) {
              genres = (eventData as any).genres.filter((genre: any) => typeof genre === 'string' && genre.trim() !== '');
              console.log('[EventDetails] Genres from array:', genres);
            } else if (typeof (eventData as any).genres === 'string') {
              // Try to parse as JSON first
              try {
                const parsed = JSON.parse((eventData as any).genres);
                if (Array.isArray(parsed)) {
                  genres = parsed.filter(genre => typeof genre === 'string' && genre.trim() !== '');
                  console.log('[EventDetails] Genres from JSON array:', genres);
                }
              } catch (jsonError) {
                // If JSON parsing fails, treat as comma-separated string or single string
                const genreString = (eventData as any).genres.trim();
                if (genreString) {
                  if (genreString.includes(',')) {
                    genres = genreString.split(',').map((g: string) => g.trim()).filter((g: string) => g !== '');
                    console.log('[EventDetails] Genres from comma-separated string:', genres);
                  } else {
                    genres = [genreString];
                    console.log('[EventDetails] Genres from single string:', genres);
                  }
                }
              }
            }
          } catch (error) {
            console.log('[EventDetails] Error processing genres field:', error);
          }
        }

        // Fallback to legacy genre field if no genres found
        if (genres.length === 0 && eventData.genre && typeof eventData.genre === 'string' && eventData.genre.trim() !== '') {
          genres = [eventData.genre.trim()];
          console.log('[EventDetails] Genres from legacy genre field:', genres);
        }
        
        console.log('[EventDetails] Final processed data:', { artists, tags, genres });
        
        const processedEvent: EventData = {
          ...eventData,
          layout_type: layoutType,
          artists: artists,
          tags: tags,
          genres: genres,
          category: categoryName, // Use the fetched category name
          venues: eventData.venues && typeof eventData.venues === 'object' && !Array.isArray(eventData.venues) 
            ? {
                ...eventData.venues,
                latitude: eventData.venues.latitude ? parseFloat(eventData.venues.latitude) : undefined,
                longitude: eventData.venues.longitude ? parseFloat(eventData.venues.longitude) : undefined,
              }
            : null,
        };
        
        setEvent(processedEvent);

      } catch (error) {
        console.error('[EventDetails] Error fetching event:', error);
        toast({
          title: "Error",
          description: "Failed to load event details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    // Fetch when component mounts, id changes, or refresh is triggered
    if (id) {
      fetchEvent();
    }
  }, [id, refreshTrigger]);

  // Helper function to check if sale has started
  const isSaleStarted = () => {
    if (!event) return false;
    const now = new Date();
    const saleStart = new Date(event.sale_start);
    return now >= saleStart;
  };

  // Helper function to check if sale has ended
  const isSaleEnded = () => {
    if (!event) return false;
    const now = new Date();
    const saleEnd = new Date(event.sale_end);
    return now > saleEnd;
  };

  const handleSeatSelection = (seats: any[]) => {
    console.log('[EventDetails] Seats selected:', seats);
    
    // Check if sale has started
    if (!isSaleStarted()) {
      toast({
        title: "Sale Not Started",
        description: "Ticket sales for this event haven't started yet. Please wait until the sale begins.",
        variant: "destructive",
      });
      return;
    }

    // Check if sale has ended
    if (isSaleEnded()) {
      toast({
        title: "Sale Ended",
        description: "Ticket sales for this event have ended.",
        variant: "destructive",
      });
      return;
    }

    setSelectedSeats(seats);
  };

  const handleBooking = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to book tickets",
        variant: "destructive",
      });
      navigate('/login');
      return;
    }

    // Check if sale has started
    if (!isSaleStarted()) {
      toast({
        title: "Sale Not Started",
        description: "Ticket sales for this event haven't started yet. Please wait until the sale begins.",
        variant: "destructive",
      });
      return;
    }

    // Check if sale has ended
    if (isSaleEnded()) {
      toast({
        title: "Sale Ended",
        description: "Ticket sales for this event have ended.",
        variant: "destructive",
      });
      return;
    }

    if (selectedSeats.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select seats to proceed",
        variant: "destructive",
      });
      return;
    }

    const totalAmount = selectedSeats.reduce((total, seat) => total + (seat.total_price || seat.price), 0);
    
    const bookingData = {
      event,
      quantity: selectedSeats.length,
      selectedSeats,
      eventDate: new Date(event?.start_datetime || ''),
      pricing: {
        totalSeats: selectedSeats.length,
        totalBase: selectedSeats.reduce((total, seat) => total + seat.price, 0),
        totalFee: selectedSeats.reduce((total, seat) => total + (seat.convenience_fee || 0), 0),
        totalTax: 0,
        total: totalAmount,
      },
    };

    navigate('/checkout', { state: bookingData });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h2>
          <Link to="/events" className="text-blue-600 hover:text-blue-800">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  // Generate structured data for event
  const generateEventStructuredData = () => {
    if (!event) return null;
    
    return {
      "@context": "https://schema.org",
      "@type": "Event",
      "name": event.name,
      "description": event.description || `Join us for ${event.name}`,
      "startDate": event.start_datetime,
      "endDate": event.end_datetime,
      "eventStatus": "https://schema.org/EventScheduled",
      "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
      "location": {
        "@type": "Place",
        "name": event.venues?.name || "Venue TBD",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": event.venues?.city || "TBD",
          "addressRegion": event.venues?.state || "TBD",
          "addressCountry": "IN"
        }
      },
      "offers": {
        "@type": "Offer",
        "price": event.ticket_price_min || 0,
        "priceCurrency": "INR",
        "availability": isSaleEnded() ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
        "validFrom": event.sale_start,
        "validThrough": event.sale_end
      },
      "performer": event.artists?.map(artist => ({
        "@type": "Person",
        "name": artist.name
      })) || [],
      "organizer": {
        "@type": "Organization",
        "name": "Ticketooz",
        "url": "https://ticketooz.com"
      }
    };
  };

  // If this is a recurring event, show the BookMyShow-style booking interface with event header
  if (event?.is_recurring) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SEOHead
          title={`${event.name} - Book Tickets`}
          description={`Book tickets for ${event.name}. ${event.description || 'Amazing event experience awaits you.'} Best prices and instant confirmation.`}
          keywords={`${event.name}, ${event.category}, ${event.venues?.city}, event tickets, book online`}
          ogType="event"
          structuredData={generateEventStructuredData()}
        />
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <img 
                  src="/lovable-uploads/749dfa90-a1d6-4cd0-87ad-4fec3daeb6d2.png"
                  alt="Ticketooz"
                  className="h-8 w-auto"
                  style={{ maxHeight: 40, maxWidth: 150 }}
                />
              </div>
              <Link to="/events" className="inline-flex items-center text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Events
              </Link>
            </div>
          </div>
        </header>

        {/* Event Header Component for recurring events */}
        <EventHeader 
          event={event}
          recurringInfo={{
            nextAvailableDate: new Date(event.start_datetime),
            recurrenceDescription: `This is a ${event.recurrence_type} recurring event. Select your preferred date and time below.`
          }}
        />

        <BookMyShowStyleBooking 
          eventId={event.id}
          refreshTrigger={refreshTrigger}
          onBookingComplete={async (bookingId) => {
            // Check and update sold-out status for seat map events
            if (event.layout_type === 'seatmap') {
              try {
                await checkAndUpdateSeatMapSoldOutStatus(event.id);
              } catch (error) {
                console.error('[EventDetails] Error checking sold-out status:', error);
              }
            }
            
            toast({
              title: "Success!",
              description: "Your booking has been confirmed.",
            });
            navigate('/booking-success', { state: { bookingId } });
          }}
        />
      </div>
    );
  }

  // For non-recurring events, always use seat map layout (no general admission option)
  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead
        title={`${event.name} - Book Tickets`}
        description={`Book tickets for ${event.name}. ${event.description || 'Amazing event experience awaits you.'} Best prices and instant confirmation.`}
        keywords={`${event.name}, ${event.category}, ${event.venues?.city}, event tickets, book online`}
        ogType="event"
        structuredData={generateEventStructuredData()}
      />
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <img 
                src="/lovable-uploads/749dfa90-a1d6-4cd0-87ad-4fec3daeb6d2.png"
                alt="Ticketooz"
                className="h-8 w-auto"
                style={{ maxHeight: 40, maxWidth: 150 }}
              />
            </div>
            <Link to="/events" className="inline-flex items-center text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Events
            </Link>
          </div>
        </div>
      </header>

      {/* Event Header Component */}
      <EventHeader 
        event={event}
      />

      {/* Sale Status Banner */}
      {event && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {!isSaleStarted() && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-yellow-600 mr-2" />
                <div>
                  <p className="text-yellow-800 font-medium">Sale Not Started</p>
                  <p className="text-yellow-700 text-sm">
                    Ticket sales will begin on {new Date(event.sale_start).toLocaleDateString()} at {new Date(event.sale_start).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {isSaleEnded() && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <X className="w-5 h-5 text-red-600 mr-2" />
                <div>
                  <p className="text-red-800 font-medium">Sale Ended</p>
                  <p className="text-red-700 text-sm">
                    Ticket sales ended on {new Date(event.sale_end).toLocaleDateString()} at {new Date(event.sale_end).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Conditional Layout Based on Event Type */}
          {event.layout_type === 'general' ? (
            <GeneralAdmissionBookingInterface 
              eventId={event.id}
              refreshTrigger={refreshTrigger}
              onBookingComplete={async (bookingId) => {
                // Check and update sold-out status for seat map events
                if (event.layout_type === 'seatmap') {
                  try {
                    await checkAndUpdateSeatMapSoldOutStatus(event.id);
                  } catch (error) {
                    console.error('[EventDetails] Error checking sold-out status:', error);
                  }
                }
                
                toast({
                  title: "Success!",
                  description: "Your booking has been confirmed.",
                });
                navigate('/booking-success', { state: { bookingId } });
              }}
            />
          ) : (
            <SeatMap eventId={event.id} onSeatSelect={handleSeatSelection} />
          )}
          
          {/* Booking Button for Seat Map Events Only */}
          {event.layout_type !== 'general' && selectedSeats.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <Button 
                  onClick={handleBooking}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 text-lg"
                  size="lg"
                  disabled={!isSaleStarted() || isSaleEnded()}
                >
                  <Ticket className="w-5 h-5 mr-2" />
                  {!isSaleStarted() ? 'Sale Not Started' : isSaleEnded() ? 'Sale Ended' : 'Book Now'}
                </Button>
                <p className="text-center text-sm text-gray-500 mt-2">
                  {selectedSeats.length} ticket(s) selected
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Similar Events Section */}
        <div className="mt-8">
          <SimilarEventsSection 
            currentEventId={event.id}
            category={event.category || ''}
            city={event.venues?.city || ''}
          />
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
