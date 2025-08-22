import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SeatPricingData } from '@/types/pricing';

export const useSeatPricing = (eventId: string) => {
  const [pricingData, setPricingData] = useState<SeatPricingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchPricingData = async () => {
      if (!eventId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('[useSeatPricing] Fetching pricing data for event:', eventId);

        const { data, error: pricingError } = await supabase
          .from('event_seat_pricing')
          .select(`
            id,
            event_id,
            seat_category_id,
            base_price,
            convenience_fee,
            commission,
            convenience_fee_type,
            convenience_fee_value,
            commission_type,
            commission_value,
            total_tickets,
            available_tickets,
            is_active,
            seat_categories (
              id,
              name,
              color,
              base_price
            )
          `)
          .eq('event_id', eventId)
          .eq('is_active', true)
          .order('created_at', { ascending: true });

        if (pricingError) {
          console.error('[useSeatPricing] Error fetching pricing:', pricingError);
          throw pricingError;
        }

        console.log('[useSeatPricing] Raw pricing data:', data);
        
        // Process and calculate convenience fees like the old hook
        const processedData: SeatPricingData[] = (data || []).map(item => {
          const basePrice = item.base_price || 0;
          
          // Calculate convenience fee using new logic if available
          let calculatedConvenienceFee = 0;
          if (item.convenience_fee_type && item.convenience_fee_value !== undefined) {
            if (item.convenience_fee_type === 'percentage') {
              calculatedConvenienceFee = (basePrice * item.convenience_fee_value) / 100;
            } else {
              calculatedConvenienceFee = item.convenience_fee_value;
            }
          } else if (item.convenience_fee !== undefined) {
            // Fallback to old convenience_fee field
            calculatedConvenienceFee = item.convenience_fee;
          }

          return {
            ...item,
            convenience_fee_type: item.convenience_fee_type as 'fixed' | 'percentage',
            commission_type: item.commission_type as 'fixed' | 'percentage',
            calculated_convenience_fee: calculatedConvenienceFee,
            total_price: basePrice + calculatedConvenienceFee
          };
        });
        
        setPricingData(processedData);

      } catch (err: any) {
        console.error('[useSeatPricing] Error:', err);
        setError(err.message || 'Failed to load pricing data');
        setPricingData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPricingData();
  }, [eventId, refreshTrigger]);

  const refetch = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return { 
    pricingData, 
    loading, 
    error, 
    refetch 
  };
};