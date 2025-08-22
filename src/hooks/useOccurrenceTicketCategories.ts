
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OccurrenceTicketCategory {
  id: string;
  occurrence_id: string;
  category_name: string;
  base_price: number;
  convenience_fee: number;
  total_quantity: number;
  available_quantity: number;
  is_active: boolean;
}

export function useOccurrenceTicketCategories(occurrenceId: string) {
  const [categories, setCategories] = useState<OccurrenceTicketCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEventSoldOut, setIsEventSoldOut] = useState(false);

  const fetchCategories = async () => {
    if (!occurrenceId) {
      setCategories([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[useOccurrenceTicketCategories] Fetching categories for occurrence:', occurrenceId);

      const { data, error: fetchError } = await supabase
        .from('occurrence_ticket_categories')
        .select('*')
        .eq('occurrence_id', occurrenceId)
        .eq('is_active', true)
        .order('base_price', { ascending: true });

      if (fetchError) {
        console.error('[useOccurrenceTicketCategories] Error fetching categories:', fetchError);
        setError(fetchError.message);
        setCategories([]);
        setIsEventSoldOut(true); // If we can't fetch categories, assume sold out
        return;
      }

      console.log('[useOccurrenceTicketCategories] Categories fetched:', data);
      console.log('[useOccurrenceTicketCategories] Raw category data:', JSON.stringify(data, null, 2));

      if (!data || data.length === 0) {
        console.log('[useOccurrenceTicketCategories] No categories found for occurrence, checking if event has seat categories...');
        
        // Try to get event ID from the occurrence
        const { data: occurrenceInfo, error: occurrenceError } = await supabase
          .from('event_occurrences')
          .select('event_id')
          .eq('id', occurrenceId)
          .single();
          
        if (!occurrenceError && occurrenceInfo) {
          console.log('[useOccurrenceTicketCategories] Found occurrence info:', occurrenceInfo);
          
          // Check if the parent event has seat categories and pricing
          const { data: eventPricing, error: pricingError } = await supabase
            .from('event_seat_pricing')
            .select(`
              *,
              seat_categories (
                id,
                name,
                color,
                base_price
              )
            `)
            .eq('event_id', occurrenceInfo.event_id)
            .eq('is_active', true);
            
          console.log('[useOccurrenceTicketCategories] Event pricing data:', eventPricing);
          
          if (!pricingError && eventPricing && eventPricing.length > 0) {
            console.log('[useOccurrenceTicketCategories] Found event pricing, creating occurrence categories...');
            
            // Group by category name to avoid duplicates and get the best pricing
            const categoryMap = new Map();
            eventPricing.forEach(pricing => {
              const categoryName = pricing.seat_categories?.name || 'General';
              if (!categoryMap.has(categoryName) || pricing.base_price < categoryMap.get(categoryName).base_price) {
                categoryMap.set(categoryName, pricing);
              }
            });
            
            // Create occurrence ticket categories based on unique event seat pricing
            const occurrenceCategoryInserts = Array.from(categoryMap.values()).map(pricing => ({
              occurrence_id: occurrenceId,
              category_name: pricing.seat_categories?.name || 'General',
              base_price: pricing.base_price || 0,
              convenience_fee: pricing.convenience_fee || 0,
              total_quantity: pricing.total_tickets || 100,
              available_quantity: pricing.available_tickets || 100,
              is_active: true
            }));
            
            console.log('[useOccurrenceTicketCategories] Creating unique occurrence categories:', occurrenceCategoryInserts);
            
            const { data: createdCategories, error: createError } = await supabase
              .from('occurrence_ticket_categories')
              .insert(occurrenceCategoryInserts)
              .select('*');
              
            if (createError) {
              console.error('[useOccurrenceTicketCategories] Error creating occurrence categories:', createError);
            } else {
              console.log('[useOccurrenceTicketCategories] Created occurrence categories:', createdCategories);
              setCategories(createdCategories || []);
              setIsEventSoldOut(false);
              return;
            }
          } else {
            console.log('[useOccurrenceTicketCategories] No pricing data found for parent event:', occurrenceInfo.event_id);
          }
        }
        
        setCategories([]);
        setIsEventSoldOut(false); // No categories doesn't mean sold out, might be configuration issue
        return;
      }

      // Calculate actual availability by checking confirmed bookings
      const categoriesWithRealAvailability = await Promise.all(
        data.map(async (category) => {
          try {
            // Get confirmed bookings for this category
            const { data: bookings, error: bookingsError } = await supabase
              .from('bookings')
              .select('quantity')
              .eq('event_occurrence_id', occurrenceId)
              .eq('occurrence_ticket_category_id', category.id)
              .eq('status', 'Confirmed');

            if (bookingsError) {
              console.error('[useOccurrenceTicketCategories] Error fetching bookings for category:', category.id, bookingsError);
              return category; // Return original category if booking fetch fails
            }

            const bookedQuantity = bookings?.reduce((sum, booking) => sum + (booking.quantity || 0), 0) || 0;
            const realAvailableQuantity = Math.max(0, category.total_quantity - bookedQuantity);

            console.log(`[useOccurrenceTicketCategories] Category ${category.category_name} availability:`, {
              total_quantity: category.total_quantity,
              stored_available: category.available_quantity,
              confirmed_bookings: bookedQuantity,
              real_available: realAvailableQuantity
            });

            return {
              ...category,
              available_quantity: realAvailableQuantity
            };
          } catch (error) {
            console.error('[useOccurrenceTicketCategories] Error processing category:', category.id, error);
            return category; // Return original category on error
          }
        })
      );

      setCategories(categoriesWithRealAvailability);

      // Check if ALL categories are sold out (available_quantity = 0)
      const allCategoriesSoldOut = categoriesWithRealAvailability.length > 0 && 
        categoriesWithRealAvailability.every(cat => cat.available_quantity === 0);

      console.log('[useOccurrenceTicketCategories] Sold out check:', {
        totalCategories: categoriesWithRealAvailability.length,
        categoriesWithStock: categoriesWithRealAvailability.filter(cat => cat.available_quantity > 0).length,
        allSoldOut: allCategoriesSoldOut
      });

      setIsEventSoldOut(allCategoriesSoldOut);

    } catch (err) {
      console.error('[useOccurrenceTicketCategories] Unexpected error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setCategories([]);
      setIsEventSoldOut(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [occurrenceId]);

  const refreshCategories = async () => {
    await fetchCategories();
  };

  return {
    categories,
    loading,
    error,
    refreshCategories,
    isEventSoldOut
  };
}
