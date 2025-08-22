import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, MapPinIcon, ClockIcon, ImageIcon } from 'lucide-react';
import { useSimpleEventsData } from '@/hooks/useSimpleEventsData';
import { useNavigate } from 'react-router-dom';

interface SimilarEventsSectionProps {
  currentEventId: string;
  category?: string;
  city?: string;
}

const SimilarEventsSection = ({ currentEventId, category, city }: SimilarEventsSectionProps) => {
  const { events, loading, error, getSimilarEvents } = useSimpleEventsData();
  const navigate = useNavigate();
  
  if (loading) {
    return (
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">More Events in {city}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  if (error) {
    console.error('SimilarEventsSection - Error:', error);
    return null;
  }

  // Only pass city for filtering, not category
  const similarEvents = getSimilarEvents(currentEventId, undefined, city);

  if (similarEvents.length === 0) {
    return (
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">
          More Events{city ? ` in ${city}` : ''}
        </h2>
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-lg mb-2">
            No other events found{city ? ` in ${city}` : ''}
          </p>
          <p>Check back later for more events!</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleEventClick = (eventId: string) => {
    navigate(`/event/${eventId}`);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    target.style.display = 'none';
    const fallback = target.nextElementSibling as HTMLElement;
    if (fallback) {
      fallback.style.display = 'flex';
    }
  };

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold mb-6">
        More Events{city ? ` in ${city}` : ''}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {similarEvents.map((event) => (
          <Card 
            key={event.id} 
            className="hover:shadow-lg transition-all cursor-pointer hover:scale-105 duration-200 overflow-hidden"
            onClick={() => handleEventClick(event.id)}
          >
            {/* Event Logo Section */}
            <div className="relative h-32 bg-gradient-to-br from-gray-200 to-gray-300">
              {event.event_logo ? (
                <>
                  <img 
                    src={event.event_logo} 
                    alt={event.name}
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                  />
                  {/* Fallback content */}
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 items-center justify-center text-gray-500" style={{ display: 'none' }}>
                    <div className="text-center">
                      <ImageIcon className="w-8 h-8 opacity-50 mx-auto mb-1" />
                      <p className="text-xs">Event Logo</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <ImageIcon className="w-8 h-8 opacity-50 mx-auto mb-1" />
                    <p className="text-xs">Event Logo</p>
                  </div>
                </div>
              )}
              {event.categories && (
                <Badge variant="secondary" className="absolute top-2 right-2 text-xs">
                  {event.categories.name}
                </Badge>
              )}
            </div>

            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem] hover:text-primary transition-colors">
                    {event.name}
                  </h3>
                </div>
                
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    <span>{formatDate(event.start_datetime)}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    <span>{formatTime(event.start_datetime)}</span>
                  </div>
                  
                  {event.venues && (
                    <div className="flex items-center gap-1">
                      <MapPinIcon className="w-3 h-3" />
                      <span className="line-clamp-1">
                        {event.venues.name}, {event.venues.city}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SimilarEventsSection;
