
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

const SeatSelectionNew = () => {
  // Since seat management is deprecated, show a message
  return (
    <div className="px-2 md:px-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Seat Selection</h2>
        <p className="text-gray-600 text-sm">
          Seat selection functionality has been removed.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Seat Management Removed
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <div className="space-y-4">
            <p className="text-gray-600">
              The seat selection and management functionality has been removed from the admin panel.
            </p>
            <p className="text-sm text-gray-500">
              Events now use general admission tickets instead of assigned seating.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SeatSelectionNew;
