
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface VenueMapLinkProps {
  venueName: string;
  latitude?: number;
  longitude?: number;
}

const VenueMapLink = ({ venueName, latitude, longitude }: VenueMapLinkProps) => {
  const handleMapClick = () => {
    if (latitude && longitude) {
      // Open Google Maps with the specific coordinates
      const googleMapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
      window.open(googleMapsUrl, '_blank');
    } else {
      // Fallback to search by venue name
      const searchQuery = encodeURIComponent(venueName);
      const googleMapsUrl = `https://maps.google.com/maps?q=${searchQuery}`;
      window.open(googleMapsUrl, '_blank');
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleMapClick}
      className="flex items-center gap-2"
    >
      <ExternalLink className="w-4 h-4" />
      View on Map
    </Button>
  );
};

export default VenueMapLink;
