
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useEventLayoutType = (eventId: string) => {
  const [layoutType, setLayoutType] = useState<'general' | 'seatmap' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLayoutType = async () => {
      if (!eventId || eventId === 'new' || eventId === 'new-event') {
        console.log('useEventLayoutType - Invalid or new event ID, skipping fetch');
        setLayoutType(null);
        setLoading(false);
        return;
      }

      try {
        console.log('useEventLayoutType - Fetching layout type for event:', eventId);
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('events')
          .select('layout_type')
          .eq('id', eventId)
          .maybeSingle();

        if (error) {
          console.error('useEventLayoutType - Error fetching layout type:', error);
          setError(error.message);
          setLayoutType('seatmap'); // Default fallback
          return;
        }

        // If layout_type is null or undefined, default to 'seatmap'
        const eventLayoutType = (data?.layout_type as 'general' | 'seatmap' | null) || 'seatmap';
        setLayoutType(eventLayoutType);
        console.log('useEventLayoutType - Layout type found:', eventLayoutType);

      } catch (err: any) {
        console.error('useEventLayoutType - Error:', err);
        setError(err.message || 'Failed to fetch layout type');
        setLayoutType('seatmap'); // Default fallback
      } finally {
        setLoading(false);
      }
    };

    fetchLayoutType();
  }, [eventId]);

  return { layoutType, loading, error };
};
