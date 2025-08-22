
// Enhanced booking utilities with separate booking display functionality
interface BookingForDisplay {
  id: string;
  quantity: number;
  total_price: number;
  booking_date: string;
  convenience_fee?: number | null;
  seat_numbers?: Array<{
    price: number;
    seat_number: string;
    seat_category: string;
  }> | null;
  event: {
    name: string;
    start_datetime: string;
    venue?: {
      name: string;
      city: string;
      address: string;
    } | null;
  } | null;
}

// Simplified function to process bookings without any combination
export const processBookings = (bookings: BookingForDisplay[]): BookingForDisplay[] => {
  // Simply return all bookings individually, sorted by booking date (newest first)
  return bookings.sort((a, b) => 
    new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()
  );
};

// Helper function to check if booking has multiple categories (for display purposes)
export const hasMultipleCategories = (booking: BookingForDisplay): boolean => {
  if (!booking.seat_numbers || booking.seat_numbers.length <= 1) {
    return false;
  }
  
  const categories = new Set(booking.seat_numbers.map(seat => seat.seat_category));
  return categories.size > 1;
};

// Helper function to get category breakdown for display
export const getCategoryBreakdown = (booking: BookingForDisplay): Array<{category: string, count: number, totalPrice: number}> => {
  if (!booking.seat_numbers || !Array.isArray(booking.seat_numbers)) {
    return [{ category: 'General', count: booking.quantity, totalPrice: booking.total_price }];
  }
  
  const categoryMap = new Map<string, { count: number; totalPrice: number }>();
  
  booking.seat_numbers.forEach((seat: any) => {
    const category = seat.seat_category || seat.category || 'General';
    const price = seat.price || 0;
    // FIXED: Handle quantity/booked_quantity for general admission bookings
    const quantity = parseInt(seat.quantity) || parseInt(seat.booked_quantity) || 1;
    
    if (!categoryMap.has(category)) {
      categoryMap.set(category, { count: 0, totalPrice: 0 });
    }
    const current = categoryMap.get(category)!;
    current.count += quantity; // Use actual quantity instead of always 1
    current.totalPrice += price * quantity; // Multiply price by quantity
  });
  
  return Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    count: data.count,
    totalPrice: data.totalPrice
  }));
};
