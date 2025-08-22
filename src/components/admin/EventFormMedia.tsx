
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface EventFormMediaProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
}

const EventFormMedia = ({ formData, onInputChange }: EventFormMediaProps) => {
  return (
    <div className="border-t pt-6">
      <h3 className="text-lg font-semibold mb-4">Event Media</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="poster">Event Poster URL</Label>
          <Input
            id="poster"
            value={formData.poster}
            onChange={(e) => onInputChange('poster', e.target.value)}
            placeholder="https://example.com/poster.jpg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="eventLogo">Event Logo URL</Label>
          <Input
            id="eventLogo"
            value={formData.eventLogo}
            onChange={(e) => onInputChange('eventLogo', e.target.value)}
            placeholder="https://example.com/logo.jpg"
          />
        </div>
      </div>
    </div>
  );
};

export default EventFormMedia;
