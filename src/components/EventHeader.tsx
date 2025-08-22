
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, Clock, Globe, Music, Tag, User, Image, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import VenueMapLink from '@/components/VenueMapLink';

interface Artist {
  name: string;
  image?: string;
}

interface Venue {
  name: string;
  address: string;
  city: string;
  state?: string;
  latitude?: number;
  longitude?: number;
}

interface EventHeaderProps {
  event: {
    id: string;
    name: string;
    description?: string;
    start_datetime: string;
    end_datetime: string;
    poster?: string;
    artist_name?: string;
    artist_image?: string;
    artists?: Artist[];
    category?: string;
    sub_category?: string;
    genre?: string;
    genres?: string[];
    language?: string;
    duration?: number;
    tags?: string[];
    is_featured?: boolean;
    is_recurring?: boolean;
    event_time?: string; // For recurring events
    venues?: Venue | null;
    terms_and_conditions?: string;
    layout_type?: 'general' | 'seatmap' | null;
  };
  recurringInfo?: {
    nextAvailableDate?: Date;
    recurrenceDescription?: string;
  };
}

const EventHeader = ({ event, recurringInfo }: EventHeaderProps) => {
  // For recurring events, use the main event's event_time with the selected occurrence date
  // For regular events, use start_datetime
  const getDisplayDateTime = () => {
    if (event.is_recurring && recurringInfo?.nextAvailableDate && event.event_time) {
      // Combine occurrence date with main event time
      const dateStr = format(recurringInfo.nextAvailableDate, 'yyyy-MM-dd');
      return new Date(`${dateStr}T${event.event_time}`);
    }
    return new Date(event.start_datetime);
  };

  const displayDateTime = getDisplayDateTime();
  const eventDate = format(displayDateTime, 'EEE, MMM dd, yyyy');
  const eventTime = format(displayDateTime, 'h:mm a');

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
    if (fallback) {
      fallback.style.display = 'flex';
    }
  };

  // Get genres array - prioritize genres array over single genre field
  const displayGenres = event.genres && event.genres.length > 0 ? event.genres : (event.genre ? [event.genre] : []);

  return (
    <div className="bg-white">
      {/* Recurring Event Notice */}
      {event.is_recurring && recurringInfo?.recurrenceDescription && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Repeat className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Recurring Event</h4>
                <p className="text-sm text-blue-700 mt-1">{recurringInfo.recurrenceDescription}</p>
                {recurringInfo.nextAvailableDate && event.event_time && (
                  <p className="text-xs text-blue-600 mt-2">
                    Next available: {format(recurringInfo.nextAvailableDate, 'EEEE, MMMM dd, yyyy')} at {format(new Date(`2000-01-01T${event.event_time}`), 'h:mm a')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Event Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card className="overflow-hidden">
          {/* Event Poster */}
          <div className="relative">
            <div className="relative h-64 sm:h-80 lg:h-96 bg-gradient-to-br from-gray-200 to-gray-300">
              {event.poster ? (
                <>
                  <img 
                    src={event.poster} 
                    alt={event.name}
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                  />
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 items-center justify-center text-gray-500" style={{ display: 'none' }}>
                    <div className="text-center">
                      <Image className="w-16 h-16 opacity-50 mx-auto mb-4" />
                      <p className="text-lg font-medium">Event Poster</p>
                      <p className="text-sm">Image not available</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Image className="w-16 h-16 opacity-50 mx-auto mb-4" />
                    <p className="text-lg font-medium">Event Poster</p>
                    <p className="text-sm">No image available</p>
                  </div>
                </div>
              )}
              
              {/* Event Badges */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <Badge className="bg-blue-600 text-white">
                  {event.category}
                </Badge>
                {event.is_featured && (
                  <Badge className="bg-yellow-600 text-white">
                    FEATURED
                  </Badge>
                )}
                {event.is_recurring && (
                  <Badge className="bg-purple-600 text-white">
                    <Repeat className="w-3 h-3 mr-1" />
                    RECURRING
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Event Title & Description */}
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">{event.name}</h1>
                {event.description && (
                  <p className="text-base lg:text-lg text-gray-600">{event.description}</p>
                )}
              </div>

              {/* Event Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Date & Time */}
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium">
                      {event.is_recurring ? 'Next Available Date' : 'Date & Time'}
                    </p>
                    <p className="text-gray-600 text-sm">{eventDate}</p>
                    <p className="text-gray-600 text-sm">{eventTime}</p>
                    {event.duration && (
                      <p className="text-gray-500 text-xs">Duration: {event.duration} hours</p>
                    )}
                  </div>
                </div>

                {/* Venue */}
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">Venue</p>
                    <p className="text-gray-600 text-sm">{event.venues?.name || 'Venue TBD'}</p>
                    {event.venues && (
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">{event.venues.address}, {event.venues.city}</p>
                        <VenueMapLink 
                          venueName={event.venues.name}
                          latitude={event.venues.latitude}
                          longitude={event.venues.longitude}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Subcategory - Display individually if available */}
                {event.sub_category && (
                  <div className="flex items-center space-x-3">
                    <Tag className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Subcategory</p>
                      <p className="text-gray-600 text-sm">{event.sub_category}</p>
                    </div>
                  </div>
                )}

                {/* Language */}
                {event.language && (
                  <div className="flex items-center space-x-3">
                    <Globe className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Language</p>
                      <p className="text-gray-600 text-sm">{event.language}</p>
                    </div>
                  </div>
                )}

                {/* Genres - Updated to handle multiple genres */}
                {displayGenres.length > 0 && (
                  <div className="flex items-center space-x-3">
                    <Music className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium">{displayGenres.length === 1 ? 'Genre' : 'Genres'}</p>
                      <div className="flex flex-wrap gap-1">
                        {displayGenres.map((genre, index) => (
                          <span key={index} className="text-gray-600 text-sm">
                            {genre}{index < displayGenres.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Category */}
                <div className="flex items-center space-x-3">
                  <Tag className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Category</p>
                    <p className="text-gray-600 text-sm">{event.category}</p>
                  </div>
                </div>

                {/* Event Type */}
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Event Type</p>
                    <p className="text-gray-600 text-sm">
                      {event.layout_type === 'general' ? 'General Admission' : 'Reserved Seating'}
                    </p>
                  </div>
                </div>

                {/* Tags - Show first 3 tags beside other details */}
                {event.tags && Array.isArray(event.tags) && event.tags.length > 0 && (
                  <div className="flex items-center space-x-3">
                    <Tag className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Tags</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {event.tags.slice(0, 3).map((tag, index) => (
                          <span 
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full border border-blue-200"
                          >
                            {tag}
                          </span>
                        ))}
                        {event.tags.length > 3 && (
                          <span className="text-xs text-gray-500 px-2 py-1">
                            +{event.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Artists Section */}
              {event.artists && Array.isArray(event.artists) && event.artists.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    {event.artists.length === 1 ? 'Artist' : 'Artists'} ({event.artists.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {event.artists.map((artist, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm">
                        {artist.image && (
                          <img 
                            src={artist.image} 
                            alt={artist.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-sm">{artist.name}</p>
                          <p className="text-xs text-gray-500">Performer</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags Section - Keep the existing detailed tags section but move it after artists */}
              {event.tags && Array.isArray(event.tags) && event.tags.length > 3 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Tag className="w-4 h-4 mr-2" />
                    All Tags ({event.tags.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map((tag, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full border border-blue-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Terms & Conditions */}
              {event.terms_and_conditions && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Terms & Conditions</h3>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-700 whitespace-pre-wrap">
                      {event.terms_and_conditions}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EventHeader;
