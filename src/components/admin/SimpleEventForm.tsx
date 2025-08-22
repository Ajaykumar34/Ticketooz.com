
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Plus, Trash2 } from 'lucide-react';

interface SimpleEventFormProps {
  onEventCreated?: (eventId: string) => void;
}

const SimpleEventForm = ({ onEventCreated }: SimpleEventFormProps) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    venue: '',
    hasMultipleDates: false,
    dates: [{ date: '', time: '', tickets: 100 }],
    basePrice: 500
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const addDate = () => {
    setFormData(prev => ({
      ...prev,
      dates: [...prev.dates, { date: '', time: '', tickets: 100 }]
    }));
  };

  const removeDate = (index: number) => {
    setFormData(prev => ({
      ...prev,
      dates: prev.dates.filter((_, i) => i !== index)
    }));
  };

  const updateDate = (index: number, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      dates: prev.dates.map((date, i) => 
        i === index ? { ...date, [field]: value } : date
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create the main event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          name: formData.title,
          description: formData.description,
          category: 'Entertainment',
          start_datetime: `${formData.dates[0].date}T${formData.dates[0].time}:00`,
          end_datetime: `${formData.dates[formData.dates.length - 1].date}T${formData.dates[formData.dates.length - 1].time}:00`,
          sale_start: new Date().toISOString(),
          sale_end: `${formData.dates[formData.dates.length - 1].date}T23:59:59`,
          layout_type: 'general',
          status: 'Active',
          venue: formData.venue
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Create occurrences for each date
      const occurrences = formData.dates.map(dateInfo => ({
        event_id: event.id,
        occurrence_date: dateInfo.date,
        occurrence_time: dateInfo.time,
        total_tickets: dateInfo.tickets,
        available_tickets: dateInfo.tickets,
        is_active: true
      }));

      const { error: occurrenceError } = await supabase
        .from('event_occurrences')
        .insert(occurrences);

      if (occurrenceError) throw occurrenceError;

      // Create pricing
      await supabase.from('event_seat_pricing').insert({
        event_id: event.id,
        base_price: formData.basePrice,
        convenience_fee: formData.basePrice * 0.02,
        commission: formData.basePrice * 0.05,
        available_tickets: formData.dates.reduce((sum, d) => sum + d.tickets, 0),
        is_active: true
      });

      toast({
        title: "Success!",
        description: `Event "${formData.title}" created with ${formData.dates.length} date(s)`,
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        venue: '',
        hasMultipleDates: false,
        dates: [{ date: '', time: '', tickets: 100 }],
        basePrice: 500
      });

      onEventCreated?.(event.id);

    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Create Event
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Concert at Madison Square Garden"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Event description..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="venue">Venue</Label>
              <Input
                id="venue"
                value={formData.venue}
                onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                placeholder="Venue name or location"
              />
            </div>
          </div>

          {/* Multiple Dates Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="hasMultipleDates"
              checked={formData.hasMultipleDates}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasMultipleDates: checked }))}
            />
            <Label htmlFor="hasMultipleDates">Event has multiple dates</Label>
          </div>

          {/* Date & Time Settings */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Event Dates & Times
            </h3>
            
            {formData.dates.map((dateInfo, index) => (
              <div key={index} className="grid grid-cols-4 gap-4 p-4 border rounded-lg">
                <div>
                  <Label htmlFor={`date-${index}`}>Date *</Label>
                  <Input
                    id={`date-${index}`}
                    type="date"
                    value={dateInfo.date}
                    onChange={(e) => updateDate(index, 'date', e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor={`time-${index}`}>Time *</Label>
                  <Input
                    id={`time-${index}`}
                    type="time"
                    value={dateInfo.time}
                    onChange={(e) => updateDate(index, 'time', e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor={`tickets-${index}`}>Tickets</Label>
                  <Input
                    id={`tickets-${index}`}
                    type="number"
                    value={dateInfo.tickets}
                    onChange={(e) => updateDate(index, 'tickets', parseInt(e.target.value) || 100)}
                    min="1"
                  />
                </div>

                <div className="flex items-end">
                  {formData.hasMultipleDates && formData.dates.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeDate(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {formData.hasMultipleDates && (
              <Button
                type="button"
                variant="outline"
                onClick={addDate}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Date
              </Button>
            )}
          </div>

          {/* Pricing */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">Pricing</h3>
            
            <div>
              <Label htmlFor="basePrice">Base Price (₹)</Label>
              <Input
                id="basePrice"
                type="number"
                value={formData.basePrice}
                onChange={(e) => setFormData(prev => ({ ...prev, basePrice: parseInt(e.target.value) }))}
                min="1"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating Event...' : 'Create Event'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SimpleEventForm;
