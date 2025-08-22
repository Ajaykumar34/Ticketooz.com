
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, MapPin, Building } from 'lucide-react';

interface VenueCardProps {
  venue: any;
  onEdit: (venue: any) => void;
  onDelete: (venueId: string) => void;
  showSeatManagement?: boolean;
}

const VenueCard = ({ venue, onEdit, onDelete, showSeatManagement = false }: VenueCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{venue.name}</CardTitle>
            <div className="space-y-1">
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-1" />
                {venue.address}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Building className="w-4 h-4 mr-1" />
                {venue.city}, {venue.state}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Badge variant="outline">
              {venue.city}
            </Badge>
            <Badge variant="secondary">
              {venue.state}
            </Badge>
          </div>
          
          <div className="flex space-x-2">
            <Button
              onClick={() => onEdit(venue)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button
              onClick={() => onDelete(venue.id)}
              variant="destructive"
              size="sm"
              className="flex-1"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VenueCard;
