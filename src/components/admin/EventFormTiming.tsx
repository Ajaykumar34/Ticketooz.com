
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Clock, Calendar, Repeat } from 'lucide-react';

interface EventFormTimingProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
}

const EventFormTiming = ({ formData, onInputChange }: EventFormTimingProps) => {
  return (
    <div className="border-t pt-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Clock className="w-5 h-5 mr-2" />
        Event Timing
      </h3>
      
      {formData.isRecurring ? (
        // Recurring Event Fields
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Repeat className="w-4 h-4" />
            <span>Recurring Event Configuration</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate || formData.date || ''}
                onChange={(e) => {
                  onInputChange('startDate', e.target.value);
                  // Also update the main date field for backward compatibility
                  onInputChange('date', e.target.value);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventTime">Event Time *</Label>
              <Input
                id="eventTime"
                type="time"
                value={formData.eventTime || formData.time || ''}
                onChange={(e) => {
                  onInputChange('eventTime', e.target.value);
                  // Also update the main time field for backward compatibility
                  onInputChange('time', e.target.value);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration *</Label>
              <Input
                id="duration"
                type="text"
                value={formData.duration}
                onChange={(e) => onInputChange('duration', e.target.value)}
                placeholder="e.g., 2 hours, 90 minutes, 1.5 hours"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate || formData.recurrenceEndDate || ''}
                onChange={(e) => {
                  onInputChange('endDate', e.target.value);
                  // Also update recurrenceEndDate for backward compatibility
                  onInputChange('recurrenceEndDate', e.target.value);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Last date for recurring occurrences
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurrenceType">Recurrence Pattern *</Label>
              <select
                id="recurrenceType"
                value={formData.recurrenceType || 'weekly'}
                onChange={(e) => onInputChange('recurrenceType', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
        </div>
      ) : (
        // Single Event Fields
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="date">Event Date *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => onInputChange('date', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">Event Time *</Label>
            <Input
              id="time"
              type="time"
              value={formData.time}
              onChange={(e) => onInputChange('time', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration *</Label>
            <Input
              id="duration"
              type="text"
              value={formData.duration}
              onChange={(e) => onInputChange('duration', e.target.value)}
              placeholder="e.g., 2 hours, 90 minutes, 1.5 hours"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EventFormTiming;
