
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EventPricing {
  id: string;
  event_id: string;
  seat_category_id: string | null;
  category_name: string;
  base_price: number;
  convenience_fee_type: 'fixed' | 'percentage';
  convenience_fee_value: number;
  commission_type: 'fixed' | 'percentage';
  commission_value: number;
  calculated_convenience_fee: number;
  calculated_commission: number;
  total_price: number;
  is_active: boolean;
}

// Define the expected database row structure
interface PricingDatabaseRow {
  id: string;
  event_id: string;
  seat_category_id: string | null;
  base_price: number;
  convenience_fee?: number;
  commission?: number;
  is_active?: boolean;
  seat_categories?: { name: string } | null;
  convenience_fee_type?: string;
  convenience_fee_value?: number;
  commission_type?: string;
  commission_value?: number;
}

// Type guard to check if an item is a valid database row
const isValidPricingRow = (item: any): item is PricingDatabaseRow => {
  return item && 
         typeof item === 'object' && 
         typeof item.id === 'string' && 
         typeof item.event_id === 'string';
};

export const useEventPricing = (eventId: string) => {
  const [pricing, setPricing] = useState<EventPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPricing = async () => {
      if (!eventId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // First check if the new columns exist by trying a simple select
        const { data: testData, error: testError } = await supabase
          .from('event_seat_pricing')
          .select('convenience_fee_type')
          .limit(1);

        let queryColumns = `
          id,
          event_id,
          seat_category_id,
          base_price,
          convenience_fee,
          commission,
          is_active,
          seat_categories (
            name
          )
        `;

        // If new columns exist, include them in the query
        if (!testError) {
          queryColumns = `
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
            is_active,
            seat_categories (
              name
            )
          `;
        }

        const { data, error: fetchError } = await supabase
          .from('event_seat_pricing')
          .select(queryColumns)
          .eq('event_id', eventId)
          .eq('is_active', true)
          .order('created_at', { ascending: true });

        if (fetchError) {
          throw fetchError;
        }

        // Check if data is valid array before processing
        if (!data || !Array.isArray(data)) {
          setPricing([]);
          return;
        }

        // Cast data to any[] first, then filter and map with proper typing
        const rawData = data as any[];
        const formattedPricing: EventPricing[] = rawData
          .filter(isValidPricingRow)
          .map((item: PricingDatabaseRow) => {
            const basePrice = item.base_price || 0;
            const convenienceFeeType = (item.convenience_fee_type as 'fixed' | 'percentage') || 'fixed';
            const convenienceFeeValue = item.convenience_fee_value || 0;
            const commissionType = (item.commission_type as 'fixed' | 'percentage') || 'fixed';
            const commissionValue = item.commission_value || 0;
            
            // Calculate fees using the proper logic
            const calculatedConvenienceFee = calculateFee(basePrice, convenienceFeeType, convenienceFeeValue);
            const calculatedCommission = calculateFee(basePrice, commissionType, commissionValue);
            const totalPrice = basePrice + calculatedConvenienceFee;

            return {
              id: item.id,
              event_id: item.event_id,
              seat_category_id: item.seat_category_id,
              category_name: item.seat_categories?.name || 'General',
              base_price: basePrice,
              convenience_fee_type: convenienceFeeType,
              convenience_fee_value: convenienceFeeValue,
              commission_type: commissionType,
              commission_value: commissionValue,
              calculated_convenience_fee: calculatedConvenienceFee,
              calculated_commission: calculatedCommission,
              total_price: totalPrice,
              is_active: item.is_active !== false
            };
          });

        setPricing(formattedPricing);
      } catch (err: any) {
        console.error('Error fetching event pricing:', err);
        setError(err.message || 'Failed to load pricing data');
        setPricing([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPricing();
  }, [eventId]);

  const calculateFee = (basePrice: number, feeType: 'fixed' | 'percentage', feeValue: number): number => {
    if (feeType === 'percentage') {
      return (basePrice * feeValue) / 100;
    }
    return feeValue;
  };

  const getPricingForCategory = (categoryId: string): EventPricing | null => {
    return pricing.find(p => p.seat_category_id === categoryId) || null;
  };

  const calculateTotalPrice = (basePrice: number, convenienceFeeType: 'fixed' | 'percentage', convenienceFeeValue: number): number => {
    const convenienceFee = calculateFee(basePrice, convenienceFeeType, convenienceFeeValue);
    return basePrice + convenienceFee;
  };

  return {
    pricing,
    loading,
    error,
    calculateFee,
    getPricingForCategory,
    calculateTotalPrice
  };
};
