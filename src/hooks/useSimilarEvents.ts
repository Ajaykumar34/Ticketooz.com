
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useSimilarEvents = (currentEventId: string, currentCity: string, currentCategory: string) => {
  return useQuery({
    queryKey: ['similar-events', currentEventId, currentCity, currentCategory],
    queryFn: async () => {
      try {
        console.log('Fetching similar events for:', { currentEventId, currentCity, currentCategory });
        
        // Get similar events with venue information
        const { data: events, error } = await supabase
          .from('events')
          .select(`
            *,
            venues (
              name,
              city,
              state,
              address
            )
          `)
          .neq('id', currentEventId)
          .eq('city', currentCity)
          .eq('category', currentCategory)
          .eq('is_active', true)
          .gte('end_datetime', new Date().toISOString())
          .order('start_datetime', { ascending: true })
          .limit(6);

        if (error) {
          console.error('Error fetching similar events:', error);
          throw error;
        }

        if (!events || events.length === 0) {
          console.log('No similar events found');
          return [];
        }

        // Transform the events to include venue information
        const transformedEvents = events.map(event => ({
          ...event,
          // Map venue data to expected properties
          venue_name: event.venues?.name || event.venue || 'Venue TBD',
          venue_city: event.venues?.city || event.city || 'City TBD',
          venue_address: event.venues?.address || '',
          venue_state: event.venues?.state || event.state || ''
        }));

        console.log('Similar events found:', transformedEvents.length);
        return transformedEvents;
      } catch (error) {
        console.error('Error in useSimilarEvents:', error);
        throw error;
      }
    },
    enabled: !!currentEventId && !!currentCity && !!currentCategory,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3
  });
};
