
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PriceZoneManagerProps {
  eventId: string;
  onClose: () => void;
}

const PriceZoneManager = ({ eventId, onClose }: PriceZoneManagerProps) => {
  // Since event management is deprecated, show a message
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Price Zone Management</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            Price zone management has been removed as part of the event management system cleanup.
          </p>
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PriceZoneManager;
