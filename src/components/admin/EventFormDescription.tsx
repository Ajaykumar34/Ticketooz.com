
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface EventFormDescriptionProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
}

const EventFormDescription = ({ formData, onInputChange }: EventFormDescriptionProps) => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => onInputChange('description', e.target.value)}
          placeholder="Enter event description"
          rows={3}
        />
      </div>
    </div>
  );
};

export default EventFormDescription;
