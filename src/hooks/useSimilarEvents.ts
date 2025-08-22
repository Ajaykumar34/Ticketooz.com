
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SimilarEvent {
  id: string;
  name: string;
  description?: string;
  start_datetime: string;
  poster?: string;
  category: string;
  sub_category?: string;
  venue_name?: string;
  venue_city?: string;
}

export const useSimilarEvents = (eventId: string, category: string, city: string) => {
  const [similarEvents, setSimilarEvents] = useState<SimilarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSimilarEvents = async () => {
      if (!eventId) {
        console.log('[useSimilarEvents] Missing eventId parameter');
        return;
      }
      
      setLoading(true);
      try {
        console.log('[useSimilarEvents] Fetching events for:', { eventId, category, city });
        
        // FIXED: Try category-based query first if category is provided
        if (category && category.trim() !== '') {
          console.log('[useSimilarEvents] Fetching category-based similar events');
          
          // Use RPC function for category-based filtering
          const { data: rpcData, error: rpcError } = await supabase.rpc('get_similar_events', {
            p_event_id: eventId,
            p_category: category,
            p_city: city || '',
            p_limit: 6
          });

          if (!rpcError && rpcData && rpcData.length > 0) {
            console.log('[useSimilarEvents] RPC function successful with category results:', rpcData);
            const formattedEvents = rpcData.map(event => ({
              id: event.id,
              name: event.name,
              description: event.description,
              start_datetime: event.start_datetime,
              poster: event.poster,
              category: event.category,
              sub_category: event.sub_category,
              venue_name: event.venue_name,
              venue_city: event.venue_city,
            }));
            
            setSimilarEvents(formattedEvents);
            setLoading(false);
            return;
          } else {
            console.warn('[useSimilarEvents] RPC function failed or returned no results:', rpcError);
          }
        }
        
        // Fallback: Fetch all events from the city (or broader search)
        console.log('[useSimilarEvents] Fetching city-based events as fallback');
        
        let query = supabase
          .from('events')
          .select(`
            id,
            name,
            description,
            start_datetime,
            poster,
            category,
            sub_category,
            venues:venue_id (
              name,
              city
            )
          `)
          .neq('id', eventId)
          .eq('status', 'Active')
          .gte('start_datetime', new Date().toISOString())
          .order('start_datetime', { ascending: true })
          .limit(6);

        // Add city filter if provided
        if (city && city.trim() !== '') {
          // Note: This requires a proper join or the venue data to be correctly linked
          // For now, we'll fetch all and filter in memory if needed
        }

        const { data: fallbackData, error: fallbackError } = await query;

        if (fallbackError) {
          console.error('[useSimilarEvents] Fallback query also failed:', fallbackError);
          setSimilarEvents([]);
        } else {
          console.log('[useSimilarEvents] Fallback query successful:', fallbackData);
          
          // Filter by city if provided and format the data
          let filteredEvents = fallbackData || [];
          
          if (city && city.trim() !== '') {
            filteredEvents = filteredEvents.filter(event => {
              const eventCity = (event.venues as any)?.city;
              return eventCity && eventCity.toLowerCase().includes(city.toLowerCase());
            });
          }
          
          const formattedEvents = filteredEvents.map(event => ({
            id: event.id,
            name: event.name,
            description: event.description,
            start_datetime: event.start_datetime,
            poster: event.poster,
            category: event.category,
            sub_category: event.sub_category,
            venue_name: (event.venues as any)?.name,
            venue_city: (event.venues as any)?.city,
          }));
          
          setSimilarEvents(formattedEvents);
        }

      } catch (error) {
        console.error('[useSimilarEvents] Exception:', error);
        setSimilarEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSimilarEvents();
  }, [eventId, category, city]);

  return { similarEvents, loading };
};
