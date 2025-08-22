import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { checkAndUpdateSeatMapSoldOutStatus, isSeatMapEventSoldOut } from "@/utils/seatMapSoldOutUtils";
import { checkAndUpdateRecurringEventSoldOutStatus, isRecurringEventSoldOut } from "@/utils/recurringEventSoldOutUtils";

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

export interface PublicEvent {
  id: string;
  name: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
  sale_start: string;
  sale_end: string;
  poster?: string;
  artist_name?: string;
  artist_image?: string;
  terms_and_conditions?: string;
  venue_id?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  is_featured: boolean;
  is_regular: boolean;
  category_id: string | null;
  category: string;
  language?: string;
  sub_category?: string;
  is_recurring?: boolean;
  recurrence_type?: string;
  recurrence_end_date?: string;
  
  // For joined data from categories table
  categories?: { 
    id: string;
    name: string;
  } | null; 

  // For joined data from venues table
  venues?: {
    id: string;
    name: string;
    address: string;
    city: string;
  } | null;

  // Additional fields for public display
  date?: string;
  time?: string;
  city?: string;
  price?: number;
  ticket_sale_end_date?: string;
  ticket_sale_end_time?: string;
  ticket_sale_start_date?: string;
  ticket_sale_start_time?: string;
  is_sold_out?: boolean; // New field to track sold out status
}

// Helper function to check if event sales have ended
const isEventSaleEnded = (event: PublicEvent) => {
  if (!event.sale_end) return false;
  const now = new Date();
  const saleEnd = new Date(event.sale_end);
  return now > saleEnd;
};

// Helper function to check if event sales have started
const isEventSaleStarted = (event: PublicEvent) => {
  if (!event.sale_start) return true;
  const now = new Date();
  const saleStart = new Date(event.sale_start);
  return now >= saleStart;
};

// Updated helper function to check if event itself is past/expired
const isEventPast = (event: PublicEvent) => {
  const now = new Date();
  
  // For recurring events, check against recurrence_end_date
  if (event.is_recurring && event.recurrence_end_date) {
    const recurrenceEnd = new Date(event.recurrence_end_date);
    recurrenceEnd.setHours(23, 59, 59, 999);
    return now > recurrenceEnd;
  }
  
  // For non-recurring events, use the original logic
  const eventEnd = new Date(event.end_datetime || event.start_datetime);
  eventEnd.setHours(23, 59, 59, 999);
  return now > eventEnd;
};

// New helper function to check if event is sold out
const checkEventSoldOut = async (eventId: string, isRecurring: boolean = false) => {
  try {
    if (isRecurring) {
      // For recurring events, use the dedicated function and update the database
      const isSoldOut = await checkAndUpdateRecurringEventSoldOutStatus(eventId);
      console.log('[checkEventSoldOut] Recurring event sold out check result:', isSoldOut);
      return isSoldOut;
    } else {
      // First, check if this is a seat map event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('layout_type')
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('[checkEventSoldOut] Error fetching event layout type:', eventError);
        return false;
      }

      // For seat map events, use the specialized seat map sold out check
      if (eventData?.layout_type === 'seatmap') {
        console.log('[checkEventSoldOut] Checking seat map event sold out status...');
        const isSoldOut = await isSeatMapEventSoldOut(eventId);
        console.log('[checkEventSoldOut] Seat map event sold out result:', isSoldOut);
        return isSoldOut;
      } else if (eventData?.layout_type === 'general') {
        // For general admission events, use accurate sold out calculation
        // Get pricing data with category details
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
          .eq('is_active', true);

        if (pricingError || !pricingData || pricingData.length === 0) {
          console.log('[checkEventSoldOut] No pricing data found for general admission event');
          return true; // No pricing data = sold out
        }

        // Calculate actual booked tickets for each category
        let allCategoriesSoldOut = true;
        
        for (const pricing of pricingData) {
          const categoryName = pricing.seat_categories?.name || 'General';
          const totalTickets = pricing.total_tickets || 0;
          
          // Get actual booked count from bookings with proper typing
          const { data: bookingData, error: bookingError } = await supabase
            .from('bookings')
            .select('quantity, seat_numbers')
            .eq('event_id', eventId)
            .eq('status', 'Confirmed') as { data: BookingData[] | null; error: any };

          if (bookingError) {
            console.error(`[checkEventSoldOut] Booking error for ${categoryName}:`, bookingError);
            continue;
          }

          // Calculate actual booked tickets for this specific category
          const actualBookedTickets = bookingData?.reduce((sum, booking) => {
            const seatNumbers = Array.isArray(booking.seat_numbers) ? booking.seat_numbers : [];
            
            const categoryTicketsCount = seatNumbers.reduce((categorySum, seat) => {
              const isForThisCategory = seat.seat_category === categoryName || 
                                       seat.categoryName === categoryName ||
                                       seat.category === categoryName;
              
              if (isForThisCategory) {
                const seatQuantity = seat.quantity ? 
                  (typeof seat.quantity === 'number' ? seat.quantity : parseInt(String(seat.quantity))) : 1;
                return categorySum + (isNaN(seatQuantity) ? 1 : seatQuantity);
              }
              return categorySum;
            }, 0);
            
            return sum + categoryTicketsCount;
          }, 0) || 0;

          const availableTickets = Math.max(0, totalTickets - actualBookedTickets);
          
          // If any category has available tickets, event is not sold out
          if (availableTickets > 0) {
            allCategoriesSoldOut = false;
            break;
          }
        }
        
        console.log('[checkEventSoldOut] General admission event sold out check result:', allCategoriesSoldOut);
        return allCategoriesSoldOut;
      } else {
        // For other event types, use the original logic
        const { data: pricing, error: pricingError } = await supabase
          .from('event_seat_pricing')
          .select('available_tickets')
          .eq('event_id', eventId)
          .eq('is_active', true);

        if (pricingError || !pricing || pricing.length === 0) {
          return true; // No pricing data = sold out
        }

        // Check if all categories are sold out
        return pricing.every(p => p.available_tickets === 0);
      }
    }
  } catch (error) {
    console.error('[checkEventSoldOut] Error checking sold out status:', error);
    return false; // On error, assume not sold out
  }
};

export function usePublicEvents() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        // First fetch events without joins to avoid foreign key issues
        const { data: eventsData, error: eventsError } = await supabase
          .from("events")
          .select("*")
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (eventsError) {
          console.error("[PublicEvents] Error fetching events:", eventsError);
          setEvents([]);
          return;
        }

        // Fetch categories separately
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("categories")
          .select("id, name")
          .eq("is_active", true);

        if (categoriesError) {
          console.error("[PublicEvents] Error fetching categories:", categoriesError);
        }

        // Fetch venues separately
        const { data: venuesData, error: venuesError } = await supabase
          .from("venues")
          .select("id, name, address, city");

        if (venuesError) {
          console.error("[PublicEvents] Error fetching venues:", venuesError);
        }

        // Process events
        const processedEvents: PublicEvent[] = [];
        
        for (const event of eventsData || []) {
          // Skip expired events
          if (isEventPast(event)) {
            console.log(`[PublicEvents] Event ${event.name}: skipped (expired)`);
            continue;
          }

          const startDate = new Date(event.start_datetime);
          
          // Find matching category and venue
          const category = categoriesData?.find(cat => cat.id === event.category_id);
          const venue = venuesData?.find(ven => ven.id === event.venue_id);
          
          // Check if event is sold out
          const isSoldOut = await checkEventSoldOut(event.id, event.is_recurring);
          
          // Always include the event - don't filter out sold-out events
          processedEvents.push({
            ...event,
            is_featured: event.is_featured ?? false,
            is_regular: event.is_regular ?? false,
            category_id: event.category_id ?? null,
            categories: category || null,
            venues: venue || null,
            language: event.language || '',
            sub_category: event.sub_category || '',
            is_recurring: event.is_recurring || false,
            recurrence_type: event.recurrence_type || null,
            recurrence_end_date: event.recurrence_end_date || null,
            is_sold_out: isSoldOut,
            // Format date and time for display
            date: startDate.toLocaleDateString(),
            time: startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            city: venue?.city || '',
            // Default price (you may want to fetch from event_pricing table)
            price: 500,
            // Convert sale dates for compatibility
            ticket_sale_end_date: event.sale_end ? new Date(event.sale_end).toISOString().split('T')[0] : null,
            ticket_sale_end_time: event.sale_end ? new Date(event.sale_end).toISOString().split('T')[1].slice(0, 5) : null,
            ticket_sale_start_date: event.sale_start ? new Date(event.sale_start).toISOString().split('T')[0] : null,
            ticket_sale_start_time: event.sale_start ? new Date(event.sale_start).toISOString().split('T')[1].slice(0, 5) : null,
          });
        }

        console.log("[PublicEvents] Processed events:", processedEvents.length);
        setEvents(processedEvents);
      } catch (err) {
        console.error("[PublicEvents] Unexpected error", err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return { events, loading };
}

export function usePopularEvents() {
  const { events, loading } = usePublicEvents();
  
  const popularEvents = events.filter(event => {
    return event.is_featured && !isEventPast(event);
  });
  
  console.log("[PopularEvents] Popular events:", popularEvents);
  return { events: popularEvents, loading };
}

export function useRegularEvents() {
  const { events, loading } = usePublicEvents();
  
  const regularEvents = events.filter(event => {
    return !event.is_featured && !isEventPast(event) && event.is_recurring;
  });
  
  console.log("[RegularEvents] Regular events (recurring only):", regularEvents);
  return { events: regularEvents, loading };
}

export function useUpcomingEvents() {
  const { events, loading } = usePublicEvents();
  
  const upcomingEvents = events.filter(event => {
    const saleStarted = isEventSaleStarted(event);
    const eventPast = isEventPast(event);
    
    // Include events where sale hasn't started yet but event itself is not past
    return !saleStarted && !eventPast;
  });
  
  console.log("[UpcomingEvents] Upcoming events:", upcomingEvents);
  return { events: upcomingEvents, loading };
}

export function useNonRecurringEvents() {
  const { events, loading } = usePublicEvents();
  
  const nonRecurringEvents = events.filter(event => {
    return !event.is_featured && !event.is_recurring && !isEventPast(event);
  });
  
  console.log("[NonRecurringEvents] Non-recurring, non-featured events:", nonRecurringEvents);
  return { events: nonRecurringEvents, loading };
}

// Export helper functions for use in components
export { isEventSaleStarted, isEventSaleEnded, isEventPast };

// For backward compatibility, export the old function name as an alias
export const useFeaturedEvents = usePopularEvents;
