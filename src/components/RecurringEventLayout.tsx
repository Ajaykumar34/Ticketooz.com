import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Share2, Copy, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useEventPricing } from '@/hooks/useEventPricing';
import SimilarEventsSection from './SimilarEventsSection';

interface RecurringEventLayoutProps {
  event: {
    id: string;
    name: string;
    description?: string;
    poster?: string;
    category?: string;
    sub_category?: string;
    language?: string;
    duration?: number;
    ticket_price_min?: number;
    ticket_price_max?: number;
    venues?: {
      name: string;
      address: string;
      city: string;
      state?: string;
    } | null;
  };
  dateRange?: {
    start: Date;
    end: Date;
  };
  pricing?: {
    min: number;
    max?: number;
  };
  onBookNow: () => void;
  availableCount?: number;
}

const RecurringEventLayout = ({
  event,
  dateRange,
  pricing,
  onBookNow,
  availableCount = 0
}: RecurringEventLayoutProps) => {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  // Use the same pricing hook as other components
  const { pricing: eventPricing, loading: pricingLoading } = useEventPricing(event.id);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDateRange = () => {
    if (!dateRange) return '';
    
    const startDate = format(dateRange.start, 'EEE dd MMM yyyy');
    const endDate = format(dateRange.end, 'EEE dd MMM yyyy');
    
    if (startDate === endDate) {
      return startDate;
    }
    
    return `${startDate} - ${endDate}`;
  };

  // Get actual pricing from database, without convenience fees
  const getDisplayPrice = () => {
    if (pricingLoading) return 'Loading...';
    
    if (eventPricing && eventPricing.length > 0) {
      // Get base price without convenience fee
      const basePrice = eventPricing.find(p => 
        p.category_name?.toLowerCase() === 'general'
      )?.base_price || eventPricing[0]?.base_price;
      
      return `₹${basePrice}`;
    }
    
    // Fallback to props or event data
    const fallbackPrice = pricing?.min || event.ticket_price_min || 150;
    return `₹${fallbackPrice}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Media */}
        <div className="lg:col-span-2">
          <div className="relative">
            {/* Main Image/Video Container - Removed arrows and dots */}
            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-900">
              {event.poster ? (
                <img
                  src={event.poster}
                  alt={event.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                  <div className="text-white text-center">
                    <h3 className="text-2xl font-bold mb-2">{event.name}</h3>
                    <p className="text-blue-100">Event Preview</p>
                  </div>
                </div>
              )}
              
              {/* Overlay with event title */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <div className="flex items-center gap-3 text-white">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm opacity-90">Explore {event.name}:</p>
                    <p className="font-medium">{event.description || 'A wonderful experience!'}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyLink}
                    className="ml-auto text-white hover:bg-white/20"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    {copied ? 'Copied!' : 'Copy link'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="flex gap-2 mt-4">
              {event.category && (
                <Badge variant="secondary" className="bg-gray-800 text-white hover:bg-gray-700">
                  {event.category}
                </Badge>
              )}
              {event.sub_category && (
                <Badge variant="secondary" className="bg-gray-700 text-white hover:bg-gray-600">
                  {event.sub_category}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Event Details */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardContent className="p-6 space-y-6">
              {/* Event Title */}
              <div className="flex items-start justify-between">
                <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
                <Button variant="ghost" size="sm" onClick={handleCopyLink}>
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Event Details */}
              <div className="space-y-4">
                {/* Date Range */}
                {dateRange && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <span className="text-gray-900 font-medium">{formatDateRange()}</span>
                  </div>
                )}

                {/* Duration */}
                {event.duration && (
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <span className="text-gray-600">{event.duration} {event.duration === 1 ? 'Hour' : 'Hours'}</span>
                  </div>
                )}

                {/* Language */}
                {event.language && (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">EN</span>
                    </div>
                    <span className="text-gray-600">{event.language}</span>
                  </div>
                )}

                {/* Location */}
                {event.venues && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-gray-900 font-medium">{event.venues.name}</p>
                      <p className="text-gray-600 text-sm">
                        {event.venues.city}{event.venues.state && `, ${event.venues.state}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Pricing - Show real values without convenience fees */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl font-bold text-green-700">
                    {getDisplayPrice()} onwards
                  </span>
                </div>
                <p className="text-green-600 text-sm font-medium">Available</p>
              </div>

              {/* Book Now Button */}
              <Button
                onClick={onBookNow}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 text-lg rounded-lg"
                size="lg"
              >
                Book Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Similar Events Section */}
      {event.venues?.city && (
        <SimilarEventsSection 
          currentEventId={event.id}
          category={event.category || ''}
          city={event.venues.city}
        />
      )}
    </div>
  );
};

export default RecurringEventLayout;
