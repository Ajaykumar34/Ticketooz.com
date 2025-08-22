
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useRealtimeData = (tableName: string, filters: Record<string, any> = {}) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    fetchInitialData();
    setupRealtimeSubscription();

    return () => {
      // Cleanup subscription
      supabase.removeAllChannels();
    };
  }, [tableName, JSON.stringify(filters)]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      let query = supabase.from(tableName as any).select('*');
      
      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      const { data: initialData, error } = await query;
      
      if (error) throw error;
      
      setData(initialData || []);
      setError(null);
    } catch (err) {
      console.error(`Error fetching ${tableName}:`, err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`${tableName}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName as any
        },
        (payload) => {
          console.log(`Realtime update for ${tableName}:`, payload);
          
          switch (payload.eventType) {
            case 'INSERT':
              setData(prevData => [...prevData, payload.new]);
              break;
            case 'UPDATE':
              setData(prevData => 
                prevData.map(item => 
                  item.id === payload.new.id ? payload.new : item
                )
              );
              break;
            case 'DELETE':
              setData(prevData => 
                prevData.filter(item => item.id !== payload.old.id)
              );
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const refetch = () => {
    fetchInitialData();
  };

  return { data, loading, error, refetch };
};

export const useRealtimeBookings = () => {
  return useRealtimeData('bookings');
};

export const useRealtimeEvents = () => {
  return useRealtimeData('events');
};

export const useRealtimeVenues = () => {
  return useRealtimeData('venues');
};

export const useRealtimeUsers = () => {
  return useRealtimeData('profiles');
};
