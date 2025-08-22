
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TheaterSeatMapBuilder from './TheaterSeatMapBuilder';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEventLayoutType } from '@/hooks/useEventLayoutType';

interface EventFormSeatLayoutProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  seatCategories?: any[];
}

const EventFormSeatLayout = ({ formData, setFormData, seatCategories = [] }: EventFormSeatLayoutProps) => {
  const { toast } = useToast();
  const eventId = formData.eventId;
  const isNewEvent = !eventId || eventId === 'new' || eventId === 'new-event';
  
  // Fetch current layout type from database
  const { layoutType: dbLayoutType, loading } = useEventLayoutType(eventId);
  
  // Always use seatmap layout (remove general admission option)
  const currentLayoutType = 'seatmap';

  const handleSeatMapUpdate = (seatMapData: any) => {
    setFormData(prev => ({ 
      ...prev, 
      seatLayout: seatMapData,
      layoutType: 'seatmap' // Always set to seatmap
    }));
  };

  // Auto-save layout type as seatmap when event exists
  React.useEffect(() => {
    if (eventId && eventId !== 'new' && eventId !== 'new-event') {
      const updateLayoutType = async () => {
        try {
          const { error } = await supabase
            .from('events')
            .update({ layout_type: 'seatmap' })
            .eq('id', eventId);

          if (error) {
            console.error('Error updating layout type:', error);
          } else {
            console.log('Layout type automatically set to seatmap');
          }
        } catch (err) {
          console.error('Error saving layout type:', err);
        }
      };
      updateLayoutType();
    }
  }, [eventId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Seat Layout Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading layout configuration...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seat Map Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium mb-2">Seat Map Layout</h3>
          <p className="text-sm text-gray-600">
            {isNewEvent 
              ? "This event will use seat map layout for ticket booking. The seat map builder will be available after saving the event."
              : "Create a custom seat layout for this event. You can draw different seat categories and set pricing for each."
            }
          </p>
        </div>
        
        {!isNewEvent && seatCategories && seatCategories.length > 0 && (
          <div>
            <label className="text-sm font-medium">Available Seat Categories</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {seatCategories.map((category) => (
                <div key={category.id} className="flex items-center space-x-2 p-2 border rounded">
                  <div 
                    className="w-4 h-4 rounded" 
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm">{category.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isNewEvent && (
          <TheaterSeatMapBuilder
            eventId={eventId}
            onSeatMapUpdate={handleSeatMapUpdate}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default EventFormSeatLayout;
