
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Event } from "./useEvents";

export function useFetchEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        console.log('[useFetchEvents] Starting to fetch events...');
        
        const { data, error } = await supabase
          .from("events")
          .select(`
            *, 
            categories!fk_events_category_id (id, name),
            venues!events_venue_id_fkey (id, name, address, city)
          `)
          .order("created_at", { ascending: false });

        console.log('[useFetchEvents] Raw Supabase response:', { data, error });

        if (error) {
          console.error('[useFetchEvents] Supabase error:', error);
          setEvents([]);
          return;
        }

        if (!data) {
          console.log('[useFetchEvents] No data returned from Supabase');
          setEvents([]);
          return;
        }

        console.log('[useFetchEvents] Raw events data:', data);

        // Defensive: Always treat joined fields as either null or array or object
        const asObjOrNull = (x: any) => {
          if (!x) return null;
          if (Array.isArray(x)) {
            if (x.length > 0 && typeof x[0] === "object" && x[0] !== null) return x[0];
            return null;
          }
          if (typeof x === "object" && x !== null) return x;
          return null;
        };

        // Map the data with proper null handling
        const mappedData: Event[] = data.map(event => {
          const mappedEvent = {
            ...event,
            is_featured: event.is_featured ?? false,
            is_regular: event.is_regular ?? false,
            category_id: event.category_id ?? null,
            categories: asObjOrNull(event.categories),
            venues: asObjOrNull(event.venues),
          };
          
          console.log('[useFetchEvents] Mapped event:', mappedEvent);
          return mappedEvent;
        });

        console.log('[useFetchEvents] Final mapped events array:', mappedData);
        console.log('[useFetchEvents] Total events fetched:', mappedData.length);

        setEvents(mappedData);
      } catch (err) {
        console.error('[useFetchEvents] Unexpected error during fetch:', err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const refetch = async () => {
    console.log('[useFetchEvents] Manual refetch triggered');
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("events")
        .select(`
          *, 
          categories!fk_events_category_id (id, name),
          venues!events_venue_id_fkey (id, name, address, city)
        `)
        .order("created_at", { ascending: false });

      console.log('[useFetchEvents] Refetch response:', { data, error });

      if (error) {
        console.error('[useFetchEvents] Refetch error:', error);
        setEvents([]);
        return;
      }

      const asObjOrNull = (x: any) => {
        if (!x) return null;
        if (Array.isArray(x)) {
          if (x.length > 0 && typeof x[0] === "object" && x[0] !== null) return x[0];
          return null;
        }
        if (typeof x === "object" && x !== null) return x;
        return null;
      };

      const mappedData: Event[] = (data || []).map(event => ({
        ...event,
        is_featured: event.is_featured ?? false,
        is_regular: event.is_regular ?? false,
        category_id: event.category_id ?? null,
        categories: asObjOrNull(event.categories),
        venues: asObjOrNull(event.venues),
      }));

      console.log('[useFetchEvents] Refetch final mapped events:', mappedData);
      setEvents(mappedData);
    } catch (err) {
      console.error('[useFetchEvents] Refetch unexpected error:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  return { events, loading, refetch };
}
