
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface EventFormDurationProps {
  value: string;
  onChange: (value: string) => void;
}

const EventFormDuration = ({ value, onChange }: EventFormDurationProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="duration">Duration</Label>
      <Input
        id="duration"
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g., 2 hours, 90 minutes, 1.5 hours"
        className="w-full"
      />
      <p className="text-sm text-gray-500">
        Enter duration in any format (e.g., "2 hours", "90 minutes", "1.5 hours")
      </p>
    </div>
  );
};

export default EventFormDuration;
