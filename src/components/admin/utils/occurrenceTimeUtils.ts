
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const updateOccurrenceTimesFromEvent = async (eventId: string) => {
  try {
    console.log('Updating occurrence times for event:', eventId);
    
    // Get the event's time
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('event_time, name')
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error('Error fetching event data:', eventError);
      throw eventError;
    }

    if (!eventData.event_time) {
      toast.error('Event does not have a valid event_time set');
      return false;
    }

    console.log('Event time to update to:', eventData.event_time);

    // Update all occurrences for this event to use the event_time
    const { error: updateError } = await supabase
      .from('event_occurrences')
      .update({ 
        occurrence_time: eventData.event_time,
        updated_at: new Date().toISOString()
      })
      .eq('event_id', eventId);

    if (updateError) {
      console.error('Error updating occurrence times:', updateError);
      throw updateError;
    }

    toast.success(`Updated all occurrence times for "${eventData.name}" to ${eventData.event_time}`);
    return true;

  } catch (error) {
    console.error('Failed to update occurrence times:', error);
    toast.error(`Failed to update occurrence times: ${error.message}`);
    return false;
  }
};
