import { supabase } from '@/integrations/supabase/client';

/**
 * Check if a recurring event is sold out and update the sold_out_at column if needed
 */
export const checkAndUpdateRecurringEventSoldOutStatus = async (eventId: string): Promise<boolean> => {
  try {
    console.log('[checkAndUpdateRecurringEventSoldOutStatus] Checking sold out status for recurring event:', eventId);

    // First check if this is a recurring event
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('is_recurring, sold_out_at, is_sold_out')
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      console.error('[checkAndUpdateRecurringEventSoldOutStatus] Error fetching event:', eventError);
      return false;
    }

    // Only process recurring events
    if (!eventData.is_recurring) {
      console.log('[checkAndUpdateRecurringEventSoldOutStatus] Event is not recurring, skipping');
      return false;
    }

    // If already marked as sold out, no need to check again
    if (eventData.sold_out_at || eventData.is_sold_out) {
      console.log('[checkAndUpdateRecurringEventSoldOutStatus] Event already marked as sold out');
      return true;
    }

    // Get all future occurrences for the event
    const { data: occurrences, error: occurrenceError } = await supabase
      .from('event_occurrences')
      .select('id')
      .eq('event_id', eventId)
      .gte('occurrence_datetime', new Date().toISOString())
      .eq('is_active', true);

    if (occurrenceError) {
      console.error('[checkAndUpdateRecurringEventSoldOutStatus] Error fetching occurrences:', occurrenceError);
      return false;
    }

    // If no occurrences exist yet, it's not sold out
    if (!occurrences || occurrences.length === 0) {
      console.log('[checkAndUpdateRecurringEventSoldOutStatus] No future occurrences found');
      return false;
    }

    // Check if all future occurrences are sold out
    let hasAvailableTickets = false;
    for (const occurrence of occurrences) {
      const { data: categories, error: categoriesError } = await supabase
        .from('occurrence_ticket_categories')
        .select('id, total_quantity')
        .eq('occurrence_id', occurrence.id)
        .eq('is_active', true);

      if (categoriesError) {
        console.error('[checkAndUpdateRecurringEventSoldOutStatus] Error fetching categories for occurrence:', occurrence.id, categoriesError);
        continue;
      }

      if (!categories || categories.length === 0) {
        console.log('[checkAndUpdateRecurringEventSoldOutStatus] No categories found for occurrence:', occurrence.id);
        continue;
      }

      // For each category, calculate real availability
      for (const category of categories) {
        // Get confirmed bookings for this category
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('quantity')
          .eq('event_occurrence_id', occurrence.id)
          .eq('occurrence_ticket_category_id', category.id)
          .eq('status', 'Confirmed');

        if (bookingsError) {
          console.error('[checkAndUpdateRecurringEventSoldOutStatus] Error fetching bookings for category:', category.id, bookingsError);
          continue;
        }

        const bookedQuantity = bookings?.reduce((sum, booking) => sum + (booking.quantity || 0), 0) || 0;
        const realAvailableQuantity = Math.max(0, category.total_quantity - bookedQuantity);

        console.log('[checkAndUpdateRecurringEventSoldOutStatus] Category availability:', {
          occurrenceId: occurrence.id,
          categoryId: category.id,
          totalQuantity: category.total_quantity,
          bookedQuantity,
          realAvailableQuantity
        });

        // If any category has available tickets, not sold out
        if (realAvailableQuantity > 0) {
          hasAvailableTickets = true;
          break;
        }
      }

      // If we found available tickets in any occurrence, break
      if (hasAvailableTickets) break;
    }

    console.log('[checkAndUpdateRecurringEventSoldOutStatus] Has available tickets:', hasAvailableTickets);

    const isSoldOut = !hasAvailableTickets;

    if (isSoldOut) {
      // Update the event to mark it as sold out
      const { error: updateError } = await supabase
        .from('events')
        .update({
          sold_out_at: new Date().toISOString(),
          is_sold_out: true
        })
        .eq('id', eventId);

      if (updateError) {
        console.error('[checkAndUpdateRecurringEventSoldOutStatus] Error updating sold out status:', updateError);
        return false;
      }

      console.log('[checkAndUpdateRecurringEventSoldOutStatus] Recurring event marked as sold out successfully');
      return true;
    }

    console.log('[checkAndUpdateRecurringEventSoldOutStatus] Recurring event is not sold out yet');
    return false;

  } catch (error) {
    console.error('[checkAndUpdateRecurringEventSoldOutStatus] Error:', error);
    return false;
  }
};

/**
 * Check if a recurring event is sold out (without updating the database)
 */
export const isRecurringEventSoldOut = async (eventId: string): Promise<boolean> => {
  try {
    // First check if already marked as sold out in database
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('is_recurring, sold_out_at, is_sold_out')
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      return false;
    }

    // If already marked as sold out, return true
    if (eventData.sold_out_at || eventData.is_sold_out) {
      return true;
    }

    // Only check recurring events
    if (!eventData.is_recurring) {
      return false;
    }

    // Use the same logic as checkAndUpdateRecurringEventSoldOutStatus but without updating
    const { data: occurrences } = await supabase
      .from('event_occurrences')
      .select('id')
      .eq('event_id', eventId)
      .gte('occurrence_datetime', new Date().toISOString())
      .eq('is_active', true);

    if (!occurrences || occurrences.length === 0) {
      return false;
    }

    let hasAvailableTickets = false;
    for (const occurrence of occurrences) {
      const { data: categories } = await supabase
        .from('occurrence_ticket_categories')
        .select('id, total_quantity')
        .eq('occurrence_id', occurrence.id)
        .eq('is_active', true);

      if (!categories || categories.length === 0) {
        continue;
      }

      for (const category of categories) {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('quantity')
          .eq('event_occurrence_id', occurrence.id)
          .eq('occurrence_ticket_category_id', category.id)
          .eq('status', 'Confirmed');

        const bookedQuantity = bookings?.reduce((sum, booking) => sum + (booking.quantity || 0), 0) || 0;
        const realAvailableQuantity = Math.max(0, category.total_quantity - bookedQuantity);

        if (realAvailableQuantity > 0) {
          hasAvailableTickets = true;
          break;
        }
      }

      if (hasAvailableTickets) break;
    }

    return !hasAvailableTickets;

  } catch (error) {
    console.error('[isRecurringEventSoldOut] Error:', error);
    return false;
  }
};