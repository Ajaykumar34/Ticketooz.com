
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RecurringEventStatus {
  isLoading: boolean;
  hasOccurrences: boolean;
  isGenerating: boolean;
  occurrenceCount: number;
  error: string | null;
  refetch: () => void;
}

export const useRecurringEventStatus = (eventId: string | undefined): RecurringEventStatus => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasOccurrences, setHasOccurrences] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [occurrenceCount, setOccurrenceCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const checkOccurrences = useCallback(async () => {
    if (!eventId) return;

    try {
      setError(null);
      console.log('[RecurringEventStatus] Checking occurrences for event:', eventId);
      
      // First check if the event is recurring
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('is_recurring, recurrence_type, start_datetime, recurrence_end_date')
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('[RecurringEventStatus] Event fetch error:', eventError);
        setError('Failed to load event details');
        setIsLoading(false);
        return;
      }

      console.log('[RecurringEventStatus] Event data:', eventData);

      // If not recurring, no need to check occurrences
      if (!eventData?.is_recurring) {
        console.log('[RecurringEventStatus] Not a recurring event');
        setHasOccurrences(true);
        setIsGenerating(false);
        setIsLoading(false);
        return;
      }

      // Check for existing future occurrences
      const { data: occurrences, error: occurrenceError } = await supabase
        .from('event_occurrences')
        .select('id, occurrence_date, occurrence_time, is_active')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .gte('occurrence_date', new Date().toISOString().split('T')[0])
        .order('occurrence_date', { ascending: true });

      if (occurrenceError) {
        console.error('[RecurringEventStatus] Occurrence fetch error:', occurrenceError);
        setError('Failed to load event occurrences');
        setIsLoading(false);
        return;
      }

      console.log('[RecurringEventStatus] Found occurrences:', occurrences);
      const count = occurrences?.length || 0;
      setOccurrenceCount(count);

      if (count > 0) {
        console.log('[RecurringEventStatus] Occurrences found, setting hasOccurrences to true');
        setHasOccurrences(true);
        setIsGenerating(false);
        setIsLoading(false);
      } else {
        console.log('[RecurringEventStatus] No occurrences found, attempting to generate');
        // No occurrences found - they might still be generating
        setHasOccurrences(false);
        setIsGenerating(true);
        
        // Attempt to trigger occurrence generation using the newer function
        try {
          console.log('[RecurringEventStatus] Calling generate_recurring_occurrences');
          const { error: generateError } = await supabase.rpc('generate_recurring_occurrences', {
            p_event_id: eventId,
            p_start_date: eventData.start_datetime.split('T')[0],
            p_end_date: eventData.recurrence_end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            p_recurrence_type: eventData.recurrence_type,
            p_start_time: eventData.start_datetime.split('T')[1]?.split('.')[0] || '19:00:00',
            p_total_tickets: 100
          });
          
          if (generateError) {
            console.error('[RecurringEventStatus] Generation error:', generateError);
            // Try fallback function
            const { error: fallbackError } = await supabase.rpc('generate_event_occurrences', {
              p_event_id: eventId
            });
            
            if (fallbackError) {
              console.error('[RecurringEventStatus] Fallback generation error:', fallbackError);
            }
          } else {
            console.log('[RecurringEventStatus] Successfully called generate_recurring_occurrences');
          }
        } catch (genError) {
          console.log('[RecurringEventStatus] Generation function error:', genError);
        }

        // Auto-retry logic with exponential backoff
        if (retryCount < 5) {
          const delay = 2000 + (retryCount * 1000); // 2s, 3s, 4s, 5s, 6s
          console.log(`[RecurringEventStatus] Retrying in ${delay}ms (attempt ${retryCount + 1}/5)`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            checkOccurrences();
          }, delay);
        } else {
          console.log('[RecurringEventStatus] Max retries reached');
          setIsGenerating(false);
          setError('Event occurrences are taking longer than expected to generate. Please try refreshing the page.');
        }
      }

    } catch (err) {
      console.error('[RecurringEventStatus] Unexpected error:', err);
      setError('An unexpected error occurred');
      setIsLoading(false);
      setIsGenerating(false);
    }
  }, [eventId, retryCount]);

  const refetch = useCallback(() => {
    console.log('[RecurringEventStatus] Manual refetch triggered');
    setRetryCount(0);
    setIsLoading(true);
    setError(null);
    setIsGenerating(false);
    setHasOccurrences(false);
    checkOccurrences();
  }, [checkOccurrences]);

  useEffect(() => {
    if (eventId) {
      console.log('[RecurringEventStatus] Starting check for event:', eventId);
      checkOccurrences();
    }
  }, [eventId]); // Remove checkOccurrences from deps to avoid infinite loop

  return {
    isLoading,
    hasOccurrences,
    isGenerating,
    occurrenceCount,
    error,
    refetch
  };
};
