
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SeatAvailability {
  seat_category_id: string;
  category_name: string;
  total_tickets: number;
  booked_tickets: number;
  available_tickets: number;
  base_price: number;
  convenience_fee: number;
  color: string;
  is_sold_out: boolean;
}

interface BookingData {
  quantity: number;
  seat_numbers: Array<{
    seat_category?: string;
    categoryName?: string;
    category?: string;
    quantity?: string | number;
    booked_quantity?: string;
  }> | null;
}

export const useGeneralAdmissionAvailability = (
  eventId: string,
  eventOccurrenceId?: string
) => {
  const [availability, setAvailability] = useState<SeatAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailability = useCallback(async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[useGeneralAdmissionAvailability] Fetching availability for event:', eventId, 'occurrence:', eventOccurrenceId);

      // Fetch only the categories that admin actually created from event_seat_pricing
      const { data: pricingData, error: pricingError } = await supabase
        .from('event_seat_pricing')
        .select(`
          *,
          seat_categories (
            id,
            name,
            color
          )
        `)
        .eq('event_id', eventId)
        .eq('is_active', true)
        .order('created_at');

      if (pricingError) {
        console.error('[useGeneralAdmissionAvailability] Pricing error:', pricingError);
        throw pricingError;
      }

      console.log('[useGeneralAdmissionAvailability] Pricing data:', pricingData);

      if (!pricingData || pricingData.length === 0) {
        console.log('[useGeneralAdmissionAvailability] No pricing data found for this event');
        setAvailability([]);
        return;
      }

      // Calculate actual booked tickets from bookings table
      const categoryAvailability = await Promise.all(
        pricingData.map(async (pricing) => {
          const categoryName = pricing.seat_categories?.name || 'General';
          const totalTickets = pricing.total_tickets || 0;
          const basePrice = pricing.base_price || 0;
          const convenienceFee = pricing.convenience_fee || 0;
          const categoryColor = pricing.seat_categories?.color || '#4ECDC4';
          
          // Get actual booked count from bookings with proper typing
          const { data: bookingData, error: bookingError } = await supabase
            .from('bookings')
            .select('quantity, seat_numbers')
            .eq('event_id', eventId)
            .eq('status', 'Confirmed') as { data: BookingData[] | null; error: any };

          if (bookingError) {
            console.error(`[useGeneralAdmissionAvailability] Booking error for ${categoryName}:`, bookingError);
          }

          // FIXED: Calculate actual booked tickets for THIS SPECIFIC category only
          const actualBookedTickets = bookingData?.reduce((sum, booking) => {
            // Check if this booking is for this category
            const seatNumbers = Array.isArray(booking.seat_numbers) ? booking.seat_numbers : [];
            
            // Count only seats that belong to this specific category
            const categoryTicketsCount = seatNumbers.reduce((categorySum, seat) => {
              const isForThisCategory = seat.seat_category === categoryName || 
                                       seat.categoryName === categoryName ||
                                       seat.category === categoryName;
              
              if (isForThisCategory) {
                // Use the quantity from the seat data if available, otherwise count as 1
                // Safely convert to number with proper type checking
                const seatQuantity = seat.quantity ? 
                  (typeof seat.quantity === 'number' ? seat.quantity : parseInt(String(seat.quantity))) : 1;
                return categorySum + (isNaN(seatQuantity) ? 1 : seatQuantity);
              }
              return categorySum;
            }, 0);
            
            return sum + categoryTicketsCount;
          }, 0) || 0;

          // Calculate available tickets
          const availableTickets = Math.max(0, totalTickets - actualBookedTickets);
          const isSoldOut = availableTickets === 0;
          
          console.log(`[useGeneralAdmissionAvailability] Category ${categoryName}: Total=${totalTickets}, Booked=${actualBookedTickets}, Available=${availableTickets}, SoldOut=${isSoldOut}`);
          
          return {
            seat_category_id: pricing.seat_category_id || pricing.id,
            category_name: categoryName,
            total_tickets: totalTickets,
            booked_tickets: actualBookedTickets,
            available_tickets: availableTickets,
            base_price: basePrice,
            convenience_fee: convenienceFee,
            color: categoryColor,
            is_sold_out: isSoldOut
          };
        })
      );

      console.log('[useGeneralAdmissionAvailability] Final availability:', categoryAvailability);
      setAvailability(categoryAvailability);

    } catch (err: any) {
      console.error('[useGeneralAdmissionAvailability] Error:', err);
      setError(err.message || 'Failed to load seat availability');
      setAvailability([]);
    } finally {
      setLoading(false);
    }
  }, [eventId, eventOccurrenceId]);

  useEffect(() => {
    fetchAvailability();

    // Set up real-time subscription for pricing updates
    const channel = supabase
      .channel(`pricing-realtime-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_seat_pricing',
          filter: `event_id=eq.${eventId}`
        },
        (payload) => {
          console.log('[useGeneralAdmissionAvailability] Pricing update received:', payload);
          fetchAvailability();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seat_categories',
          filter: `event_id=eq.${eventId}`
        },
        (payload) => {
          console.log('[useGeneralAdmissionAvailability] Seat categories update received:', payload);
          fetchAvailability();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `event_id=eq.${eventId}`
        },
        (payload) => {
          console.log('[useGeneralAdmissionAvailability] Booking update received:', payload);
          // Refresh availability after booking changes
          setTimeout(() => {
            fetchAvailability();
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAvailability, eventId, eventOccurrenceId]);

  return { availability, loading, error, refetch: fetchAvailability };
};
