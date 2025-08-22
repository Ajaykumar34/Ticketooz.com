
interface BookedSeat {
  seat_number: string;
  booking_id: string;
  status: string;
  row_name?: string;
}

interface SeatData {
  id: string;
  seat_number: string;
  row_name: string;
  is_available: boolean;
  is_blocked: boolean;
}

export const isSeatBooked = (seat: SeatData, bookedSeats: BookedSeat[]): boolean => {
  if (!seat || !seat.seat_number || !bookedSeats || bookedSeats.length === 0) {
    return false;
  }

  // FIXED: Only check if seat is actually booked by a user, not just unavailable
  // Do NOT return true for blocked or unavailable seats unless they're in bookedSeats
  const seatNumber = seat.seat_number.trim();
  const rowName = seat.row_name ? seat.row_name.trim() : '';
  const exactSeatId = `${rowName}${seatNumber}`;
  const seatId = seat.id;
  
  console.log('[isSeatBooked] Checking if seat is actually booked (not just unavailable):', {
    seatNumber,
    rowName,  
    exactSeatId,
    seatId,
    bookedSeatsCount: bookedSeats.length,
    seatAvailable: seat.is_available,
    seatBlocked: seat.is_blocked
  });
  
  // FIXED: Only count as booked if the seat is in the actual bookedSeats array
  // Don't count blocked or unavailable seats as "booked" unless they're actually booked
  const isBooked = bookedSeats.some(bookedSeat => {
    const bookedSeatId = bookedSeat.seat_number.trim();
    
    // Strategy 1: Exact seat identifier match (e.g., "A1", "B5") - PRIMARY and ONLY
    const exactMatch = bookedSeatId === exactSeatId;
    
    // Strategy 2: Only if booked seat has row_name, match with row validation
    const directMatch = bookedSeat.row_name && 
                       bookedSeat.row_name.trim() === rowName &&
                       bookedSeatId === seatNumber;
    
    console.log('[isSeatBooked] Comparing with actual booking:', {
      exactSeatId,
      bookedSeatId,
      exactMatch,
      directMatch,
      bookedSeatRowName: bookedSeat.row_name
    });
    
    return exactMatch || directMatch;
  });
  
  console.log('[isSeatBooked] Final result - is seat actually booked by user:', exactSeatId, ':', isBooked);
  return isBooked;
};

export const getSeatDisplayName = (seat: SeatData): string => {
  return `${seat.row_name || ''}${seat.seat_number}`;
};

export const formatSeatWithCategory = (seat: any): string => {
  const seatName = seat.seat_number ? `${seat.row_name || ''}${seat.seat_number}` : seat.id;
  const category = seat.seat_categories?.name || seat.category_name || seat.category || 'General';
  return `${seatName} (${category})`;
};

// Helper function to create exact seat identifiers for consistent booking
export const createExactSeatIdentifier = (seatInfo: any): string => {
  if (typeof seatInfo === 'string') {
    return seatInfo.trim();
  }
  
  if (typeof seatInfo === 'object' && seatInfo !== null) {
    // Priority: Use exact seat ID if available
    if (seatInfo.id) {
      return seatInfo.id;
    }
    
    // Construct from row + seat number for exact identification
    if (seatInfo.row_name && seatInfo.seat_number) {
      return `${seatInfo.row_name}${seatInfo.seat_number}`;
    }
    
    if (seatInfo.row && seatInfo.number) {
      return `${seatInfo.row}${seatInfo.number}`;
    }
    
    // Fallback to seat number only
    if (seatInfo.seat_number) {
      return seatInfo.seat_number;
    }
  }
  
  return '';
};

// Helper to validate and normalize seat booking data before saving
export const validateSeatBookingData = (selectedSeats: any[]): any[] => {
  return selectedSeats.map(seat => {
    // Ensure we store exact seat identifiers with all necessary data
    const normalizedSeat = {
      id: seat.id,
      seat_number: seat.seat_number,
      row_name: seat.row_name,
      exact_identifier: createExactSeatIdentifier(seat),
      // Preserve category information for display
      category: seat.seat_categories?.name || seat.category_name || seat.category || 'General',
      category_id: seat.seat_category_id || seat.category_id,
      price: seat.price || seat.base_price || 0,
      // Store complete seat data for booking success display
      seat_categories: seat.seat_categories,
      seat_category_name: seat.seat_categories?.name || seat.category_name || seat.category
    };
    
    console.log('Normalized seat data:', normalizedSeat);
    return normalizedSeat;
  });
};

// Helper to extract exact seat information from booking data
export const extractExactSeatInfo = (booking: any, selectedSeats?: any[]): any[] => {
  console.log('Extracting exact seat info from:', { booking, selectedSeats });
  
  // Priority 1: Use selected seats if available (most accurate)
  if (selectedSeats && Array.isArray(selectedSeats) && selectedSeats.length > 0) {
    console.log('Using selectedSeats data');
    return selectedSeats.map(seat => ({
      ...seat,
      display_name: `${seat.row_name || ''}${seat.seat_number}`,
      category_display: seat.seat_categories?.name || seat.category_name || seat.category || 'General'
    }));
  }
  
  // Priority 2: Use booking.seat_numbers if structured properly
  if (booking?.seat_numbers && Array.isArray(booking.seat_numbers) && booking.seat_numbers.length > 0) {
    console.log('Using booking.seat_numbers data');
    return booking.seat_numbers.map(seat => ({
      ...seat,
      display_name: `${seat.row_name || ''}${seat.seat_number}`,
      category_display: seat.seat_categories?.name || seat.category_name || seat.category || 'General'
    }));
  }
  
  console.log('No exact seat info found, returning empty array');
  return [];
};

// NEW: Function to format detailed seat information for PDF
export const formatDetailedSeatInfoForPDF = (selectedSeats: any[]): Array<{
  seatNumber: string;
  category: string;
  price: number;
}> => {
  if (!selectedSeats || selectedSeats.length === 0) {
    return [];
  }

  return selectedSeats.map(seat => {
    const seatNumber = seat.row_name && seat.seat_number 
      ? `${seat.row_name}${seat.seat_number}`
      : seat.seat_number || seat.id || 'Unknown';
    
    const category = seat.seat_categories?.name || 
                    seat.category_name || 
                    seat.category || 
                    'General';
    
    const price = seat.price || seat.base_price || 0;
    
    return {
      seatNumber,
      category,
      price: Number(price)
    };
  });
};

// NEW: Helper function specifically for general admission to check availability
export const isGeneralAdmissionAvailable = (totalCapacity: number, bookedCount: number): boolean => {
  console.log('[isGeneralAdmissionAvailable] Checking availability:', {
    totalCapacity,
    bookedCount,
    available: bookedCount < totalCapacity
  });
  
  return bookedCount < totalCapacity;
};

// FIXED: New function to count actual booked seats accurately - only count seats that are in bookedSeats array
export const countActualBookedSeats = (seatLayout: any, bookedSeats: BookedSeat[]): number => {
  if (!seatLayout || !seatLayout.seats || !bookedSeats) {
    return 0;
  }

  const actuallyBookedCount = seatLayout.seats.filter((seat: SeatData) => {
    // Only count real seats (not blocked, not passages, have seat numbers)
    if (!seat.seat_number || seat.seat_number.trim() === '' || seat.is_blocked) {
      return false;
    }
    
    // FIXED: Only count as booked if the seat is actually in the bookedSeats array
    // Not just if it's unavailable
    return isSeatBooked(seat, bookedSeats);
  }).length;

  console.log('[countActualBookedSeats] FIXED - Only counting seats in bookedSeats array:', {
    totalSeats: seatLayout.seats.length,
    bookedSeatsData: bookedSeats.length,
    actuallyBookedCount
  });

  return actuallyBookedCount;
};

// NEW: Helper to count only available seats (excludes passages, blocked seats)
export const countAvailableSeats = (seatLayout: any): number => {
  if (!seatLayout || !seatLayout.seats) {
    return 0;
  }

  const availableCount = seatLayout.seats.filter((seat: SeatData) => 
    seat.is_available && 
    !seat.is_blocked && 
    seat.seat_number && 
    seat.seat_number.trim() !== ''
  ).length;

  console.log('[countAvailableSeats] Available seats count:', {
    totalSeats: seatLayout.seats.length,
    availableCount
  });

  return availableCount;
};
