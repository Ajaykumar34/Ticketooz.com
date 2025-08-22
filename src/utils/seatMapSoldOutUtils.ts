import { supabase } from '@/integrations/supabase/client';
import { countAvailableSeats, countActualBookedSeats } from '@/utils/seatBookingUtils';

interface BookedSeat {
  seat_number: string;
  booking_id: string;
  status: string;
  row_name?: string;
}

interface LayoutDataStructure {
  seats?: Array<{
    id?: string;
    number?: string;
    row?: string;
    x?: number;
    y?: number;
    isBlocked?: boolean;
    isPassage?: boolean;
    categoryId?: string;
  }>;
  rows?: number;
  columns?: number;
}

function isValidLayoutData(data: any): data is LayoutDataStructure {
  return data && typeof data === 'object' && Array.isArray(data.seats);
}

/**
 * Check if a seat map event is sold out and update the sold_out_at column if needed
 */
export const checkAndUpdateSeatMapSoldOutStatus = async (eventId: string): Promise<boolean> => {
  try {
    console.log('[checkAndUpdateSeatMapSoldOutStatus] Checking sold out status for event:', eventId);

    // First check if this is a seat map event
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('layout_type, sold_out_at, is_sold_out')
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      console.error('[checkAndUpdateSeatMapSoldOutStatus] Error fetching event:', eventError);
      return false;
    }

    // Only process seat map events
    if (eventData.layout_type !== 'seatmap') {
      console.log('[checkAndUpdateSeatMapSoldOutStatus] Event is not a seat map event, skipping');
      return false;
    }

    // If already marked as sold out, no need to check again
    if (eventData.sold_out_at || eventData.is_sold_out) {
      console.log('[checkAndUpdateSeatMapSoldOutStatus] Event already marked as sold out');
      return true;
    }

    // Get seat layout for the event
    const { data: seatLayouts, error: layoutError } = await supabase
      .from('seat_layouts')
      .select('*')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (layoutError || !seatLayouts || seatLayouts.length === 0) {
      console.log('[checkAndUpdateSeatMapSoldOutStatus] No seat layout found for event');
      return false;
    }

    const seatLayout = seatLayouts[0];

    // Generate seat data from layout_data if no individual seats exist
    let seats = [];
    
    // First try to get individual seat records
    const { data: seatsData } = await supabase
      .from('seats')
      .select('*')
      .eq('seat_layout_id', seatLayout.id);

    if (seatsData && seatsData.length > 0) {
      seats = seatsData;
    } else if (isValidLayoutData(seatLayout.layout_data) && seatLayout.layout_data.seats) {
      // Generate from layout_data
      seats = seatLayout.layout_data.seats.map((seat: any) => ({
        id: seat.id || `temp-${seat.y}-${seat.x}`,
        seat_number: seat.number || '',
        row_name: seat.row || '',
        x_position: seat.x || 0,
        y_position: seat.y || 0,
        is_available: !seat.isBlocked && !seat.isPassage,
        is_blocked: seat.isBlocked || false,
        seat_category_id: seat.categoryId || ''
      }));
    }

    const seatLayoutWithSeats = {
      ...seatLayout,
      seats
    };

    // Get booked seats for this event
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('seat_numbers')
      .eq('event_id', eventId)
      .in('status', ['Confirmed', 'Pending']);

    if (bookingsError) {
      console.error('[checkAndUpdateSeatMapSoldOutStatus] Error fetching bookings:', bookingsError);
      return false;
    }

    // Process booked seats
    const bookedSeats: BookedSeat[] = [];
    
    if (bookings && bookings.length > 0) {
      bookings.forEach(booking => {
        if (booking.seat_numbers && Array.isArray(booking.seat_numbers)) {
          booking.seat_numbers.forEach((seatInfo: any) => {
            if (seatInfo.seat_number) {
              bookedSeats.push({
                seat_number: seatInfo.seat_number,
                row_name: seatInfo.row_name || '',
                booking_id: 'temp-id',
                status: 'Confirmed'
              });
            }
          });
        }
      });
    }

    // Count available and booked seats
    const totalAvailableSeats = countAvailableSeats(seatLayoutWithSeats);
    const actualBookedSeats = countActualBookedSeats(seatLayoutWithSeats, bookedSeats);

    console.log('[checkAndUpdateSeatMapSoldOutStatus] Seat counts:', {
      totalAvailableSeats,
      actualBookedSeats,
      isSoldOut: actualBookedSeats >= totalAvailableSeats && totalAvailableSeats > 0
    });

    // Check if sold out
    const isSoldOut = totalAvailableSeats > 0 && actualBookedSeats >= totalAvailableSeats;

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
        console.error('[checkAndUpdateSeatMapSoldOutStatus] Error updating sold out status:', updateError);
        return false;
      }

      console.log('[checkAndUpdateSeatMapSoldOutStatus] Event marked as sold out successfully');
      return true;
    }

    console.log('[checkAndUpdateSeatMapSoldOutStatus] Event is not sold out yet');
    return false;

  } catch (error) {
    console.error('[checkAndUpdateSeatMapSoldOutStatus] Error:', error);
    return false;
  }
};

/**
 * Check if a seat map event is sold out (without updating the database)
 */
export const isSeatMapEventSoldOut = async (eventId: string): Promise<boolean> => {
  try {
    // First check if already marked as sold out in database
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('layout_type, sold_out_at, is_sold_out')
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      return false;
    }

    // If already marked as sold out, return true
    if (eventData.sold_out_at || eventData.is_sold_out) {
      return true;
    }

    // Only check seat map events
    if (eventData.layout_type !== 'seatmap') {
      return false;
    }

    // Use the same logic as checkAndUpdateSeatMapSoldOutStatus but without updating
    const { data: seatLayouts } = await supabase
      .from('seat_layouts')
      .select('*')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!seatLayouts || seatLayouts.length === 0) {
      return false;
    }

    const seatLayout = seatLayouts[0];
    let seats = [];
    
    const { data: seatsData } = await supabase
      .from('seats')
      .select('*')
      .eq('seat_layout_id', seatLayout.id);

    if (seatsData && seatsData.length > 0) {
      seats = seatsData;
    } else if (isValidLayoutData(seatLayout.layout_data) && seatLayout.layout_data.seats) {
      seats = seatLayout.layout_data.seats.map((seat: any) => ({
        id: seat.id || `temp-${seat.y}-${seat.x}`,
        seat_number: seat.number || '',
        row_name: seat.row || '',
        is_available: !seat.isBlocked && !seat.isPassage,
        is_blocked: seat.isBlocked || false
      }));
    }

    const seatLayoutWithSeats = { ...seatLayout, seats };

    const { data: bookings } = await supabase
      .from('bookings')
      .select('seat_numbers')
      .eq('event_id', eventId)
      .in('status', ['Confirmed', 'Pending']);

    const bookedSeats: BookedSeat[] = [];
    
    if (bookings && bookings.length > 0) {
      bookings.forEach(booking => {
        if (booking.seat_numbers && Array.isArray(booking.seat_numbers)) {
          booking.seat_numbers.forEach((seatInfo: any) => {
            if (seatInfo.seat_number) {
              bookedSeats.push({
                seat_number: seatInfo.seat_number,
                row_name: seatInfo.row_name || '',
                booking_id: 'temp-id',
                status: 'Confirmed'
              });
            }
          });
        }
      });
    }

    const totalAvailableSeats = countAvailableSeats(seatLayoutWithSeats);
    const actualBookedSeats = countActualBookedSeats(seatLayoutWithSeats, bookedSeats);

    return totalAvailableSeats > 0 && actualBookedSeats >= totalAvailableSeats;

  } catch (error) {
    console.error('[isSeatMapEventSoldOut] Error:', error);
    return false;
  }
};