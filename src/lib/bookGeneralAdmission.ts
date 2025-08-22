
import { supabase } from '@/integrations/supabase/client';
import { checkAndUpdateSeatMapSoldOutStatus } from '@/utils/seatMapSoldOutUtils';

interface SelectedTicket {
  categoryName: string;
  quantity: number;
  basePrice: number;
  convenienceFee: number;
}

interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  state?: string;
}

export const bookGeneralAdmission = async (
  eventId: string,
  selectedTickets: SelectedTicket[],
  customerInfo: CustomerInfo,
  totalPrice: number,
  basePrice: number,
  convenienceFee: number,
  eventOccurrenceId?: string,
  occurrenceTicketCategoryId?: string
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('[bookGeneralAdmission] Starting booking process:', {
      eventId,
      eventOccurrenceId,
      occurrenceTicketCategoryId,
      selectedTickets,
      totalPrice
    });

    // For recurring events, we need to validate and get the correct category IDs
    if (eventOccurrenceId && selectedTickets.length > 0) {
      console.log('[bookGeneralAdmission] Processing recurring event booking');
      
      const bookings = [];
      
      for (const ticket of selectedTickets) {
        console.log(`[bookGeneralAdmission] Processing ticket for category: ${ticket.categoryName}`);
        
        // Get the correct category ID for this ticket category
        const { data: categoryData, error: categoryError } = await supabase
          .from('occurrence_ticket_categories')
          .select('id, available_quantity, total_quantity, category_name')
          .eq('occurrence_id', eventOccurrenceId)
          .eq('category_name', ticket.categoryName)
          .eq('is_active', true)
          .single();

        if (categoryError || !categoryData) {
          console.error(`[bookGeneralAdmission] Category lookup failed for ${ticket.categoryName}:`, categoryError);
          throw new Error(`Ticket category "${ticket.categoryName}" not found or unavailable for this event occurrence. Please refresh the page and try again.`);
        }

        console.log(`[bookGeneralAdmission] Found valid category:`, categoryData);

        // Calculate real availability by checking confirmed bookings
        const { data: existingBookings, error: existingBookingsError } = await supabase
          .from('bookings')
          .select('quantity')
          .eq('event_occurrence_id', eventOccurrenceId)
          .eq('occurrence_ticket_category_id', categoryData.id)
          .eq('status', 'Confirmed');

        if (existingBookingsError) {
          console.error(`[bookGeneralAdmission] Error checking existing bookings:`, existingBookingsError);
        }

        const bookedQuantity = existingBookings?.reduce((sum, booking) => sum + (booking.quantity || 0), 0) || 0;
        const realAvailableQuantity = Math.max(0, categoryData.total_quantity - bookedQuantity);

        console.log(`[bookGeneralAdmission] Real availability for ${ticket.categoryName}:`, {
          total_quantity: categoryData.total_quantity,
          stored_available: categoryData.available_quantity,
          confirmed_bookings: bookedQuantity,
          real_available: realAvailableQuantity
        });

        // Validate availability using real calculation
        if (realAvailableQuantity < ticket.quantity) {
          throw new Error(`Only ${realAvailableQuantity} tickets available for ${ticket.categoryName}`);
        }

        const categoryTotalPrice = (ticket.basePrice + ticket.convenienceFee) * ticket.quantity;

        // Create booking record for this specific category
        const bookingData = {
          user_id: user.id,
          event_id: eventId,
          quantity: ticket.quantity,
          total_price: categoryTotalPrice,
          status: 'Confirmed' as const,
          convenience_fee: ticket.convenienceFee * ticket.quantity,
          customer_name: `${customerInfo.firstName} ${customerInfo.lastName}`.trim(),
          customer_email: customerInfo.email,
          customer_phone: customerInfo.phone,
          customer_address: customerInfo.address || '',
          customer_state: customerInfo.state || '',
          event_occurrence_id: eventOccurrenceId,
          occurrence_ticket_category_id: categoryData.id,
          seat_numbers: [{
            price: ticket.basePrice,
            quantity: ticket.quantity.toString(),
            seat_number: ticket.categoryName,
            seat_category: ticket.categoryName,
            category: ticket.categoryName,
            categoryName: ticket.categoryName,
            category_id: categoryData.id,
            total_quantity: "N/A",
            available_quantity: "N/A"
          }] as any,
          booking_metadata: {
            selectedTickets: [{
              categoryName: ticket.categoryName,
              quantity: ticket.quantity,
              basePrice: ticket.basePrice,
              convenienceFee: ticket.convenienceFee
            }],
            ticketCategories: [{
              categoryName: ticket.categoryName,
              quantity: ticket.quantity,
              categoryId: categoryData.id
            }]
          } as any
        };

        console.log(`[bookGeneralAdmission] Creating booking for ${ticket.categoryName}:`, bookingData);

        const { data: booking, error: categoryBookingError } = await supabase
          .from('bookings')
          .insert(bookingData)
          .select()
          .single();

        if (categoryBookingError) {
          console.error(`[bookGeneralAdmission] Booking creation failed for ${ticket.categoryName}:`, categoryBookingError);
          throw new Error(`Failed to create booking for ${ticket.categoryName}: ${categoryBookingError.message}`);
        }

        console.log(`[bookGeneralAdmission] Booking created successfully for ${ticket.categoryName}:`, booking.id);
        
        // Update the occurrence ticket category availability
        const newAvailableQuantity = Math.max(0, realAvailableQuantity - ticket.quantity);
        const { error: updateError } = await supabase
          .from('occurrence_ticket_categories')
          .update({ available_quantity: newAvailableQuantity })
          .eq('id', categoryData.id);

        if (updateError) {
          console.error(`[bookGeneralAdmission] Error updating availability for ${ticket.categoryName}:`, updateError);
          // Don't throw error here, booking is already created
        } else {
          console.log(`[bookGeneralAdmission] Updated availability for ${ticket.categoryName}: ${newAvailableQuantity}`);
        }

        bookings.push(booking);
      }

      // Return the first booking (they're all related)
      return bookings[0];
    }

    // For non-recurring events or single category bookings
    const totalQuantity = selectedTickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
    const primaryTicket = selectedTickets[0];

    if (!primaryTicket) {
      throw new Error('No tickets selected for booking');
    }

    // For non-recurring events, we don't need occurrence_ticket_category_id
    let finalCategoryId = null;
    
    if (eventOccurrenceId) {
      // For recurring events with single category, validate the category
      const { data: categoryData, error: categoryError } = await supabase
        .from('occurrence_ticket_categories')
        .select('id, available_quantity, total_quantity, category_name')
        .eq('occurrence_id', eventOccurrenceId)
        .eq('category_name', primaryTicket.categoryName)
        .eq('is_active', true)
        .single();

      if (categoryError || !categoryData) {
        console.error('[bookGeneralAdmission] Single category lookup failed:', categoryError);
        throw new Error(`Ticket category "${primaryTicket.categoryName}" not found or unavailable for this event occurrence. Please refresh the page and try again.`);
      }

      // Calculate real availability by checking confirmed bookings
      const { data: existingBookings, error: singleCategoryBookingsError } = await supabase
        .from('bookings')
        .select('quantity')
        .eq('event_occurrence_id', eventOccurrenceId)
        .eq('occurrence_ticket_category_id', categoryData.id)
        .eq('status', 'Confirmed');

      if (singleCategoryBookingsError) {
        console.error('[bookGeneralAdmission] Error checking existing bookings:', singleCategoryBookingsError);
      }

      const bookedQuantity = existingBookings?.reduce((sum, booking) => sum + (booking.quantity || 0), 0) || 0;
      const realAvailableQuantity = Math.max(0, categoryData.total_quantity - bookedQuantity);

      console.log('[bookGeneralAdmission] Real availability for single category:', {
        total_quantity: categoryData.total_quantity,
        stored_available: categoryData.available_quantity,
        confirmed_bookings: bookedQuantity,
        real_available: realAvailableQuantity
      });

      // Validate availability using real calculation
      if (realAvailableQuantity < totalQuantity) {
        throw new Error(`Only ${realAvailableQuantity} tickets available for ${primaryTicket.categoryName}`);
      }

      finalCategoryId = categoryData.id;
    }

    console.log('[bookGeneralAdmission] Creating single booking with category ID:', finalCategoryId);

    // Create booking record
    const bookingData = {
      user_id: user.id,
      event_id: eventId,
      quantity: totalQuantity,
      total_price: totalPrice,
      status: 'Confirmed' as const,
      convenience_fee: convenienceFee,
      customer_name: `${customerInfo.firstName} ${customerInfo.lastName}`.trim(),
      customer_email: customerInfo.email,
      customer_phone: customerInfo.phone,
      customer_address: customerInfo.address || '',
      customer_state: customerInfo.state || '',
      event_occurrence_id: eventOccurrenceId || null,
      occurrence_ticket_category_id: finalCategoryId,
      seat_numbers: selectedTickets.map(ticket => ({
        price: ticket.basePrice,
        quantity: ticket.quantity.toString(),
        seat_number: ticket.categoryName,
        seat_category: ticket.categoryName,
        category: ticket.categoryName,
        categoryName: ticket.categoryName,
        category_id: finalCategoryId,
        total_quantity: "N/A",
        available_quantity: "N/A"
      })) as any,
      booking_metadata: {
        selectedTickets: selectedTickets.map(ticket => ({
          categoryName: ticket.categoryName,
          quantity: ticket.quantity,
          basePrice: ticket.basePrice,
          convenienceFee: ticket.convenienceFee
        })),
        ticketCategories: selectedTickets.map(ticket => ({
          categoryName: ticket.categoryName,
          quantity: ticket.quantity,
          categoryId: finalCategoryId
        }))
      } as any
    };

    console.log('[bookGeneralAdmission] Creating booking:', bookingData);

    const { data: booking, error: singleBookingError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();

    if (singleBookingError) {
      console.error('[bookGeneralAdmission] Booking creation error:', singleBookingError);
      
      // Provide more specific error messages
      if (singleBookingError.code === '23503' && singleBookingError.message.includes('occurrence_ticket_category_id_fkey')) {
        throw new Error('Invalid ticket category selected. Please refresh the page and try again.');
      }
      
      throw new Error(`Failed to create booking: ${singleBookingError.message}`);
    }

    console.log('[bookGeneralAdmission] Booking created successfully:', booking.id);
    
    // Update availability for recurring events
    if (eventOccurrenceId && finalCategoryId) {
      const { data: categoryData } = await supabase
        .from('occurrence_ticket_categories')
        .select('available_quantity, total_quantity')
        .eq('id', finalCategoryId)
        .single();

      if (categoryData) {
        const { data: existingBookings } = await supabase
          .from('bookings')
          .select('quantity')
          .eq('event_occurrence_id', eventOccurrenceId)
          .eq('occurrence_ticket_category_id', finalCategoryId)
          .eq('status', 'Confirmed');

        const bookedQuantity = existingBookings?.reduce((sum, booking) => sum + (booking.quantity || 0), 0) || 0;
        const newAvailableQuantity = Math.max(0, categoryData.total_quantity - bookedQuantity);

        await supabase
          .from('occurrence_ticket_categories')
          .update({ available_quantity: newAvailableQuantity })
          .eq('id', finalCategoryId);

        console.log('[bookGeneralAdmission] Updated availability after single booking:', newAvailableQuantity);
      }
    }
    
    // Check and update sold-out status for seat map events
    try {
      await checkAndUpdateSeatMapSoldOutStatus(eventId);
    } catch (error) {
      console.error('[bookGeneralAdmission] Error checking sold-out status:', error);
    }
    
    return booking;

  } catch (error) {
    console.error('[bookGeneralAdmission] Error:', error);
    throw error;
  }
};
