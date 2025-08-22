import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, IndianRupee, Users, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface GeneralAdmissionBookingInterfaceProps {
  eventId: string;
  refreshTrigger?: number;
  onBookingComplete?: (bookingId: string) => void;
}

interface TicketCategory {
  seat_category_id: string;
  category_name: string;
  base_price: number;
  convenience_fee: number;
  commission: number;
  total_tickets: number;
  available_tickets: number;
  booked_tickets: number;
  color: string;
}

interface SelectedTicket {
  categoryId: string;
  categoryName: string;
  quantity: number;
  basePrice: number;
  convenienceFee: number;
  total: number;
}

const GeneralAdmissionBookingInterface = ({ 
  eventId, 
  refreshTrigger, 
  onBookingComplete 
}: GeneralAdmissionBookingInterfaceProps) => {
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [selectedTickets, setSelectedTickets] = useState<{[key: string]: number}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventData, setEventData] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchAvailability = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[GeneralAdmissionBooking] Fetching availability for event:', eventId);

      // Get event data first
      const { data: eventResponse, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          venues (
            id,
            name,
            address,
            city,
            state,
            latitude,
            longitude
          )
        `)
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('[GeneralAdmissionBooking] Event data error:', eventError);
        throw eventError;
      }

      setEventData(eventResponse);

      // For general admission, fetch directly from event_seat_pricing with seat category details
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
        console.error('[GeneralAdmissionBooking] Pricing error:', pricingError);
        throw pricingError;
      }

      console.log('[GeneralAdmissionBooking] Pricing data:', pricingData);

      if (!pricingData || pricingData.length === 0) {
        console.log('[GeneralAdmissionBooking] No pricing data found for this event');
        setCategories([]);
        return;
      }

      // Get actual booking counts for each category
      const categoriesWithBookings = await Promise.all(
        pricingData.map(async (pricing) => {
          const categoryName = pricing.seat_categories?.name || 'General';
          const totalTickets = pricing.total_tickets || 100;
          const basePrice = pricing.base_price || 0;
          const convenienceFee = pricing.convenience_fee || 0;
          const commission = pricing.commission || 0;
          const categoryColor = pricing.seat_categories?.color || '#4ECDC4';
          
          // Get confirmed bookings for this category
          const { data: bookings, error: bookingError } = await supabase
            .from('bookings')
            .select('quantity, seat_numbers')
            .eq('event_id', eventId)
            .eq('status', 'Confirmed');

          if (bookingError) {
            console.error(`[GeneralAdmissionBooking] Booking error for ${categoryName}:`, bookingError);
          }

          // FIXED: Calculate actual booked tickets for THIS SPECIFIC category only
          const actualBookedTickets = bookings?.reduce((sum, booking) => {
            // Ensure seat_numbers is an array and exists
            const seatNumbers = Array.isArray(booking.seat_numbers) ? booking.seat_numbers : [];
            
            // Count only seats that belong to this specific category
            const categoryTicketsCount = seatNumbers.reduce((categorySum, seat: any) => {
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

          const availableTickets = Math.max(0, totalTickets - actualBookedTickets);

          return {
            seat_category_id: pricing.seat_category_id || pricing.id,
            category_name: categoryName,
            base_price: basePrice,
            convenience_fee: convenienceFee,
            commission: commission,
            total_tickets: totalTickets,
            available_tickets: availableTickets,
            booked_tickets: actualBookedTickets,
            color: categoryColor
          };
        })
      );

      console.log('[GeneralAdmissionBooking] Final categories with booking counts:', categoriesWithBookings);
      setCategories(categoriesWithBookings);

    } catch (err: any) {
      console.error('[GeneralAdmissionBooking] Error:', err);
      setError(err.message || 'Failed to load ticket availability');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchAvailability();

    // Set up real-time subscription for updates
    const channel = supabase
      .channel(`ga-booking-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_seat_pricing',
          filter: `event_id=eq.${eventId}`
        },
        (payload) => {
          console.log('[GeneralAdmissionBooking] Pricing update received:', payload);
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
          console.log('[GeneralAdmissionBooking] Seat categories update received:', payload);
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
          console.log('[GeneralAdmissionBooking] Booking update received:', payload);
          setTimeout(() => {
            fetchAvailability();
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAvailability, eventId]);

  // Refresh when trigger changes
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      console.log('[GeneralAdmissionBooking] Refresh triggered');
      fetchAvailability();
    }
  }, [refreshTrigger, fetchAvailability]);

  const handleQuantityChange = useCallback((categoryId: string, change: number) => {
    setSelectedTickets(prev => {
      const categoryData = categories.find(c => c.seat_category_id === categoryId);
      if (!categoryData) return prev;
      
      const currentQuantity = prev[categoryId] || 0;
      const newQuantity = Math.max(0, Math.min(categoryData.available_tickets, currentQuantity + change));
      
      if (newQuantity === 0) {
        const { [categoryId]: removed, ...rest } = prev;
        return rest;
      }
      
      if (newQuantity === currentQuantity) {
        return prev;
      }
      
      return { ...prev, [categoryId]: newQuantity };
    });
  }, [categories]);

  const getSelectedTicketsArray = useCallback((): SelectedTicket[] => {
    return Object.entries(selectedTickets).map(([categoryId, quantity]) => {
      const categoryData = categories.find(c => c.seat_category_id === categoryId);
      if (!categoryData || quantity === 0) return null;
      
      return {
        categoryId,
        categoryName: categoryData.category_name,
        quantity,
        basePrice: categoryData.base_price,
        convenienceFee: categoryData.convenience_fee,
        total: (categoryData.base_price + categoryData.convenience_fee) * quantity
      };
    }).filter(Boolean) as SelectedTicket[];
  }, [selectedTickets, categories]);

  const getTotalTickets = () => {
    return Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalPrice = () => {
    return getSelectedTicketsArray().reduce((total, ticket) => total + ticket.total, 0);
  };

  const handleProceedToBooking = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to book tickets",
        variant: "destructive",
      });
      navigate('/login');
      return;
    }

    const selectedTicketsArray = getSelectedTicketsArray();
    if (selectedTicketsArray.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select tickets to proceed",
        variant: "destructive",
      });
      return;
    }

    // Navigate to checkout with booking data
    const bookingData = {
      event: eventData,
      selectedGeneralTickets: selectedTicketsArray,
      totalPrice: getTotalPrice(),
      totalTickets: getTotalTickets(),
      quantity: getTotalTickets(),
      basePrice: selectedTicketsArray.reduce((sum, ticket) => sum + (ticket.basePrice * ticket.quantity), 0),
      convenienceFee: selectedTicketsArray.reduce((sum, ticket) => sum + (ticket.convenienceFee * ticket.quantity), 0),
      layoutType: 'general'
    };

    navigate('/checkout', { state: bookingData });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ticket options...</p>
        </div>
      </div>
    );
  }

  if (error || !categories || categories.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <div className="text-red-600 mb-4">
              <Users className="w-12 h-12 mx-auto mb-2" />
              <h3 className="text-lg font-semibold">No Tickets Available</h3>
              <p className="text-sm">
                {error || "This event doesn't have ticket categories configured."}
              </p>
            </div>
            <Button onClick={fetchAvailability} variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if event is sold out
  const isSoldOut = categories.every(cat => cat.available_tickets === 0);

  if (isSoldOut) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <div className="text-red-600 mb-4">
              <Users className="w-12 h-12 mx-auto mb-2" />
              <h3 className="text-lg font-semibold">Event Sold Out</h3>
              <p className="text-sm">All tickets for this event have been booked.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
      {/* Ticket Categories */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Users className="w-5 h-5" />
              Select Tickets ({categories.length} categories available)
            </CardTitle>
            <p className="text-sm text-gray-600">
              General admission - Select your quantity (seats assigned at venue)
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {categories.map((category) => {
              const selectedQuantity = selectedTickets[category.seat_category_id] || 0;
              const isCategorySoldOut = category.available_tickets === 0;
              
              return (
                <div
                  key={category.seat_category_id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg ${
                    isCategorySoldOut ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <div
                        className="w-4 h-4 rounded border flex-shrink-0"
                        style={{ backgroundColor: category.color }}
                      />
                      <h3 className="font-semibold text-base sm:text-lg">
                        {category.category_name}
                      </h3>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <IndianRupee className="w-3 h-3" />
                        {category.base_price}
                      </Badge>
                      {isCategorySoldOut && (
                        <Badge variant="destructive" className="text-xs">
                          SOLD OUT
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <span className={`font-medium ${category.available_tickets > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            Available: {category.available_tickets}
                          </span>
                        </span>
                        <span className="text-gray-500">
                          Total: {category.total_tickets}
                        </span>
                        <span className="text-blue-600">
                          Booked: {category.booked_tickets}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                          style={{ 
                            width: `${category.total_tickets > 0 ? (category.booked_tickets / category.total_tickets) * 100 : 0}%` 
                          }}
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        {category.total_tickets > 0 ? Math.round((category.booked_tickets / category.total_tickets) * 100) : 0}% booked
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 justify-center sm:justify-end mt-3 sm:mt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuantityChange(category.seat_category_id, -1)}
                      disabled={selectedQuantity === 0 || isCategorySoldOut}
                      className="h-8 w-8 p-0"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    
                    <div className="bg-white px-4 py-2 rounded-lg border-2 border-blue-300 min-w-[60px] text-center">
                      <span className="font-bold text-xl text-blue-700">{selectedQuantity}</span>
                      <div className="text-xs text-gray-600">Selected</div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuantityChange(category.seat_category_id, 1)}
                      disabled={selectedQuantity >= category.available_tickets || isCategorySoldOut}
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Order Summary */}
      <div className="lg:col-span-1">
        <div className="sticky top-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {getTotalTickets() === 0 ? (
                <div className="text-center py-6 sm:py-8 text-gray-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No tickets selected</p>
                  <p className="text-sm">Select tickets to see summary</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {getSelectedTicketsArray().map((ticket) => {
                      const baseTotal = ticket.basePrice * ticket.quantity;
                      const feeTotal = ticket.convenienceFee * ticket.quantity;
                      
                      return (
                        <div key={ticket.categoryId} className="text-sm">
                          <div className="flex justify-between font-medium">
                            <span>{ticket.categoryName} × {ticket.quantity}</span>
                            <span>₹{ticket.total}</span>
                          </div>
                          <div className="flex justify-between text-gray-500 ml-4">
                            <span>Base: ₹{ticket.basePrice} × {ticket.quantity}</span>
                            <span>₹{baseTotal}</span>
                          </div>
                          <div className="flex justify-between text-gray-500 ml-4">
                            <span>Convenience Fee</span>
                            <span>₹{feeTotal}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Total Tickets:</span>
                      <span className="font-medium">{getTotalTickets()}</span>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-bold text-lg">Total:</span>
                      <div className="flex items-center font-bold text-xl text-green-600">
                        <IndianRupee className="w-5 h-5 mr-1" />
                        {getTotalPrice()}
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleProceedToBooking}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-base sm:text-lg font-medium"
                      size="lg"
                      disabled={getTotalTickets() === 0}
                    >
                      Proceed to Checkout
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GeneralAdmissionBookingInterface;
