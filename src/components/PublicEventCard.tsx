import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, IndianRupee, Image } from 'lucide-react';
import { useEventPricing } from '@/hooks/useEventPricing';
import { isEventSaleStarted, isEventSaleEnded } from '@/hooks/usePublicEvents';

interface PublicEventCardProps {
  event: any;
}

const PublicEventCard = ({ event }: PublicEventCardProps) => {
  const { pricing, loading: pricingLoading } = useEventPricing(event.id);
  
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.log('Public event image failed to load:', event.name, 'URL:', event.event_logo);
    e.currentTarget.style.display = 'none';
    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
    if (fallback) {
      fallback.style.display = 'flex';
    }
  };

  // Check event sale status
  const saleStarted = isEventSaleStarted(event);
  const saleEnded = isEventSaleEnded(event);
  const isSoldOut = event.is_sold_out;
  
  // Get lowest base price across all categories
  const getDisplayPrice = () => {
    if (pricingLoading) {
      return event.price || 500;
    }
    
    if (pricing && pricing.length > 0) {
      // Find the lowest base price among all categories
      const lowestPrice = Math.min(...pricing.map((p: any) => p.base_price || 0));
      return lowestPrice > 0 ? lowestPrice : 500;
    }
    
    return event.price || 500;
  };
  
  // Get the category name for the lowest priced category
  const getPriceCategoryName = () => {
    if (pricingLoading || !pricing || pricing.length === 0) return '';
    
    // Find the category with the lowest base price
    const lowestPriceCategory = pricing.reduce((lowest: any, current: any) => {
      return (current.base_price || 0) < (lowest.base_price || 0) ? current : lowest;
    }, pricing[0]);
    
    return lowestPriceCategory?.seat_categories?.name || lowestPriceCategory?.category_name || 'Starting from';
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer">
      <div className="relative h-48 bg-gradient-to-br from-gray-200 to-gray-300">
        {event.event_logo ? (
          <>
            <img 
              src={event.event_logo} 
              alt={event.name}
              className="w-full h-full object-cover rounded-t-lg"
              onError={handleImageError}
            />
            {/* Fallback content */}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 rounded-t-lg items-center justify-center text-gray-500" style={{ display: 'none' }}>
              <div className="text-center">
                <Image className="w-12 h-12 opacity-50 mx-auto mb-2" />
                <p className="text-sm">Event Image</p>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Image className="w-12 h-12 opacity-50 mx-auto mb-2" />
              <p className="text-sm">Event Image</p>
            </div>
          </div>
        )}
        <Badge 
          className="absolute top-2 right-2"
          style={event.categories?.color ? { backgroundColor: event.categories.color, borderColor: event.categories.color } : { backgroundColor: '#2563EB' }}
        >
          {event.categories?.name || event.category}
        </Badge>
        {isSoldOut ? (
          <Badge className="absolute top-2 left-2 bg-red-600 text-white">
            SOLD OUT
          </Badge>
        ) : !saleStarted ? (
          <Badge className="absolute top-2 left-2 bg-yellow-600 text-white">
            UPCOMING
          </Badge>
        ) : saleEnded ? (
          <Badge className="absolute top-2 left-2 bg-orange-600 text-white">
            SALE ENDED
          </Badge>
        ) : null}
      </div>
      <Link to={`/event/${event.id}`} className="block">
        <CardHeader>
          <CardTitle className="text-lg">{event.name}</CardTitle>
          <CardDescription className="line-clamp-2">{event.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{event.date} at {event.time}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{event.venues?.name}, {event.city}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <IndianRupee className="w-4 h-4 text-green-600" />
                <div className="flex flex-col">
                  <span className="font-semibold text-green-600">₹{getDisplayPrice()}</span>
                  {getPriceCategoryName() && (
                    <span className="text-xs text-gray-500">
                      {pricing && pricing.length > 1 ? `${getPriceCategoryName()} onwards` : getPriceCategoryName()}
                    </span>
                  )}
                </div>
              </div>
              {isSoldOut ? (
                <Badge variant="destructive" className="text-sm">
                  Sold Out
                </Badge>
              ) : !saleStarted ? (
                <Badge variant="outline" className="text-sm border-yellow-500 text-yellow-600">
                  Sale Not Started
                </Badge>
              ) : saleEnded ? (
                <Badge variant="destructive" className="text-sm">
                  Sale Ended
                </Badge>
              ) : (
                <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Book Now
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
};

export default PublicEventCard;
