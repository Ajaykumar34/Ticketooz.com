
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SimpleEvent {
  id: string;
  name: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
  venue_id?: string;
  category_id?: string;
  event_logo?: string;
  venues?: {
    name: string;
    city: string;
    state: string;
  };
  categories?: {
    name: string;
  };
  is_featured?: boolean;
}

export function useSimpleEventsData() {
  const [events, setEvents] = useState<SimpleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[useSimpleEventsData] Fetching events...');

      const { data, error: fetchError } = await supabase
        .from('events')
        .select(`
          id,
          name,
          description,
          start_datetime,
          end_datetime,
          venue_id,
          category_id,
          is_featured,
          event_logo,
          venues:venue_id (
            name,
            city,
            state
          ),
          categories:category_id (
            name
          )
        `)
        .gte('end_datetime', new Date().toISOString())
        .order('start_datetime', { ascending: true });

      if (fetchError) {
        console.error('[useSimpleEventsData] Fetch error:', fetchError);
        setError(`Failed to fetch events: ${fetchError.message}`);
        return;
      }

      console.log('[useSimpleEventsData] Successfully fetched', data?.length || 0, 'events');
      setEvents(data || []);

    } catch (err: any) {
      console.error('[useSimpleEventsData] Unexpected error:', err);
      setError(`Unexpected error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getSimilarEvents = (currentEventId: string, category?: string, city?: string, limit: number = 4) => {
    return events
      .filter(event => {
        // Exclude the current event
        if (event.id === currentEventId) return false;
        
        // Only filter by city (removed category filtering)
        if (city && event.venues?.city?.toLowerCase() !== city.toLowerCase()) {
          return false;
        }
        
        return true;
      })
      .slice(0, limit);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return {
    events,
    loading,
    error,
    refetch: fetchEvents,
    getSimilarEvents
  };
}
