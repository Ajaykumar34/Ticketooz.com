
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';

interface EventFormHeaderProps {
  event?: any;
  copyFromEvent?: any;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}

const EventFormHeader = ({ event, copyFromEvent, saving, onClose, onSave }: EventFormHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onClose}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Button>
        <h1 className="text-3xl font-bold">
          {event ? 'Edit Event' : copyFromEvent ? 'Copy Event' : 'Create Event'}
        </h1>
      </div>
      <Button onClick={onSave} disabled={saving}>
        <Save className="w-4 h-4 mr-2" />
        {saving ? 'Saving...' : 'Save Event'}
      </Button>
    </div>
  );
};

export default EventFormHeader;
