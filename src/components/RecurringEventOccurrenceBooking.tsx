
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users, Ticket, Minus, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useOccurrenceTicketCategories } from '@/hooks/useOccurrenceTicketCategories';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface EventOccurrence {
  id: string;
  occurrence_date: string;
  occurrence_time: string;
  total_tickets: number;
  available_tickets: number;
  is_active: boolean;
}

interface RecurringEventOccurrenceBookingProps {
  eventId: string;
  eventName: string;
  eventDescription?: string;
  venueName?: string;
  venueAddress?: string;
  selectedOccurrence: EventOccurrence;
  refreshTrigger?: number;
  onBookingComplete: (bookingId: string) => void;
}

interface SelectedTicket {
  categoryId: string;
  categoryName: string;
  basePrice: number;
  convenienceFee: number;
  quantity: number;
  maxQuantity: number;
}

const RecurringEventOccurrenceBooking = ({
  eventId,
  eventName,
  eventDescription,
  venueName,
  venueAddress,
  selectedOccurrence,
  refreshTrigger,
  onBookingComplete
}: RecurringEventOccurrenceBookingProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { categories, loading: categoriesLoading, error: categoriesError, refreshCategories } = useOccurrenceTicketCategories(selectedOccurrence.id);
  
  const [selectedTickets, setSelectedTickets] = useState<SelectedTicket[]>([]);
  const [mainEventTime, setMainEventTime] = useState<string>('');
  const [loadingMainEvent, setLoadingMainEvent] = useState(true);
  const [displayCategories, setDisplayCategories] = useState<any[]>([]);

  useEffect(() => {
    const fetchMainEventTime = async () => {
      try {
        console.log('[RecurringEventBooking] Fetching main event time for event:', eventId);
        const { data, error } = await supabase
          .from('events')
          .select('event_time, start_datetime')
          .eq('id', eventId)
          .single();

        if (error) {
          console.error('[RecurringEventBooking] Error fetching main event time:', error);
        } else if (data) {
          console.log('[RecurringEventBooking] Main event data:', data);
          setMainEventTime(data.event_time || '');
        }
      } catch (err) {
        console.error('[RecurringEventBooking] Unexpected error fetching main event:', err);
      } finally {
        setLoadingMainEvent(false);
      }
    };

    if (eventId) {
      fetchMainEventTime();
    }
  }, [eventId]);

  // Refresh data when refreshTrigger changes (e.g., when returning from booking)
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      console.log('[RecurringEventOccurrenceBooking] Refresh triggered, refetching categories...');
      refreshCategories();
    }
  }, [refreshTrigger, refreshCategories]);

  // Update categories with actual availability from database, similar to BookMyShowStyleBooking
  useEffect(() => {
    const updateCategoriesWithActualAvailability = async () => {
      if (!categories || categories.length === 0) {
        console.log('[RecurringEventBooking] No categories to update');
        setDisplayCategories([]);
        return;
      }

      console.log('[RecurringEventBooking] Updating categories with actual database availability...');

      try {
        const updatedCategories = await Promise.all(
          categories.map(async (category) => {
            // Get actual booked tickets count for this category and occurrence
            const { data: bookings, error: bookingsError } = await supabase
              .from('bookings')
              .select('quantity')
              .eq('event_occurrence_id', selectedOccurrence.id)
              .eq('occurrence_ticket_category_id', category.id)
              .eq('status', 'Confirmed');

            if (bookingsError) {
              console.error('[RecurringEventBooking] Error fetching bookings for category:', category.id, bookingsError);
              // Use stored database values if there's an error
              return category;
            }

            const bookedTickets = bookings?.reduce((sum, booking) => sum + (booking.quantity || 0), 0) || 0;
            const actualAvailable = Math.max(0, category.total_quantity - bookedTickets);

            console.log(`[RecurringEventBooking] Category ${category.category_name} actual availability:`, {
              total_quantity: category.total_quantity,
              database_stored_available: category.available_quantity,
              confirmed_bookings_count: bookedTickets,
              actual_calculated_available: actualAvailable
            });

            return {
              ...category,
              actualAvailable: actualAvailable
            };
          })
        );

        console.log('[RecurringEventBooking] Final updated categories with actual availability:', updatedCategories);
        setDisplayCategories(updatedCategories);
      } catch (error) {
        console.error('[RecurringEventBooking] Error updating categories with actual availability:', error);
        // Fallback to original categories if there's an error
        setDisplayCategories(categories);
      }
    };

    updateCategoriesWithActualAvailability();
  }, [categories, selectedOccurrence.id]);

  const handleQuantityChange = (categoryId: string, newQuantity: number) => {
    const category = displayCategories.find(cat => cat.id === categoryId);
    if (!category) {
      console.warn(`[RecurringEventBooking] Category not found: ${categoryId}`);
      return;
    }

    console.log(`[RecurringEventBooking] Quantity change request - Category: ${categoryId}, Current available: ${category.actualAvailable}, Requested quantity: ${newQuantity}`);

    // Ensure quantity doesn't exceed available quantity and is within reasonable limits
    const maxAllowed = Math.min(category.actualAvailable, 10); // Limit to 10 tickets max per category
    const finalQuantity = Math.max(0, Math.min(newQuantity, maxAllowed));

    console.log(`[RecurringEventBooking] Final quantity after validation: ${finalQuantity} (max allowed: ${maxAllowed})`);

    if (finalQuantity <= 0) {
      // Remove ticket if quantity is 0
      console.log(`[RecurringEventBooking] Removing category ${categoryId} from selection`);
      setSelectedTickets(prev => prev.filter(ticket => ticket.categoryId !== categoryId));
    } else {
      setSelectedTickets(prev => {
        const existingIndex = prev.findIndex(ticket => ticket.categoryId === categoryId);
        
        if (existingIndex >= 0) {
          // Update existing ticket
          console.log(`[RecurringEventBooking] Updating existing selection for category ${categoryId}: ${prev[existingIndex].quantity} -> ${finalQuantity}`);
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: finalQuantity
          };
          return updated;
        } else {
          // Add new ticket
          console.log(`[RecurringEventBooking] Adding new selection for category ${categoryId}: ${finalQuantity} tickets`);
          return [...prev, {
            categoryId,
            categoryName: category.category_name,
            basePrice: category.base_price,
            convenienceFee: category.convenience_fee,
            quantity: finalQuantity,
            maxQuantity: category.actualAvailable
          }];
        }
      });
    }
  };

  const getSelectedQuantity = (categoryId: string) => {
    const ticket = selectedTickets.find(t => t.categoryId === categoryId);
    return ticket ? ticket.quantity : 0;
  };

  const getTotalPrice = () => {
    return selectedTickets.reduce((total, ticket) => 
      total + ((ticket.basePrice + ticket.convenienceFee) * ticket.quantity), 0
    );
  };

  const getTotalTickets = () => {
    return selectedTickets.reduce((total, ticket) => total + ticket.quantity, 0);
  };

  const handleProceedToCheckout = () => {
    if (selectedTickets.length === 0) {
      toast({
        title: "No Tickets Selected",
        description: "Please select at least one ticket to proceed",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to book tickets",
        variant: "destructive",
      });
      return;
    }

    // Calculate pricing details
    const basePrice = selectedTickets.reduce((sum, ticket) => sum + (ticket.basePrice * ticket.quantity), 0);
    const convenienceFee = selectedTickets.reduce((sum, ticket) => sum + (ticket.convenienceFee * ticket.quantity), 0);
    const totalPrice = basePrice + convenienceFee;

    const combinedSeats = selectedTickets.map(ticket => {
      return Array.from({ length: ticket.quantity }, (_, index) => ({
        seat_number: `${ticket.categoryName}-${index + 1}`,
        seat_category: ticket.categoryName,
        price: ticket.basePrice + ticket.convenienceFee,
        base_price: ticket.basePrice,
        convenience_fee: ticket.convenienceFee
      }));
    }).flat();

    const selectedGeneralTickets = selectedTickets.map(ticket => ({
      categoryId: ticket.categoryId,
      categoryName: ticket.categoryName,
      basePrice: ticket.basePrice,
      convenienceFee: ticket.convenienceFee,
      quantity: ticket.quantity,
      occurrenceTicketCategoryId: ticket.categoryId // Include for database trigger
    }));

    const eventForCheckout = {
      id: eventId,
      name: eventName,
      description: eventDescription,
      venues: venueName ? { name: venueName, address: venueAddress } : null,
      is_recurring: true,
      event_time: mainEventTime
    };

    console.log('[RecurringEventBooking] Navigating to checkout with main event time:', {
      event: eventForCheckout,
      mainEventTime,
      selectedOccurrenceDate: selectedOccurrence.occurrence_date,
      selectedOccurrenceTime: selectedOccurrence.occurrence_time
    });

    navigate('/checkout', {
      state: {
        event: eventForCheckout,
        selectedGeneralTickets,
        selectedSeats: combinedSeats,
        quantity: getTotalTickets(),
        basePrice,
        convenienceFee,
        totalPrice,
        eventDate: selectedOccurrence.occurrence_date,
        eventOccurrenceId: selectedOccurrence.id,
        isMultiCategoryBooking: true,
        categoryBreakdown: selectedTickets.map(ticket => ({
          categoryName: ticket.categoryName,
          quantity: ticket.quantity,
          unitPrice: ticket.basePrice,
          unitConvenienceFee: ticket.convenienceFee,
          subtotal: (ticket.basePrice + ticket.convenienceFee) * ticket.quantity
        }))
      }
    });
  };

  const occurrenceDate = new Date(selectedOccurrence.occurrence_date);
  
  // Display time - use main event time if available, otherwise occurrence time
  const displayTime = mainEventTime || selectedOccurrence.occurrence_time;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="space-y-6">
        {/* Event Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{eventName}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{format(occurrenceDate, 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>
                      {loadingMainEvent ? 'Loading time...' : displayTime}
                      {mainEventTime && mainEventTime !== selectedOccurrence.occurrence_time && (
                        <span className="text-xs text-blue-600 ml-1">(Main Event Time)</span>
                      )}
                    </span>
                  </div>
                  {venueName && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{venueName}</span>
                    </div>
                  )}
                </div>
                {eventDescription && (
                  <p className="text-gray-600 mt-2">{eventDescription}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ticket Category Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Select Tickets
              <Button
                variant="outline"
                size="sm"
                onClick={refreshCategories}
                disabled={categoriesLoading}
              >
                {categoriesLoading ? 'Refreshing...' : 'Refresh Availability'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoriesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : categoriesError ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">Error loading ticket categories: {categoriesError}</p>
                <Button variant="outline" onClick={refreshCategories}>
                  Try Again
                </Button>
              </div>
            ) : displayCategories.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No ticket categories available for this occurrence.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {displayCategories.map((category) => {
                  const selectedQuantity = getSelectedQuantity(category.id);
                  const isAvailable = category.actualAvailable > 0;
                  
                  console.log(`[RecurringEventBooking] Rendering category ${category.category_name} with actual availability:`, {
                    actualAvailable: category.actualAvailable,
                    total_quantity: category.total_quantity,
                    isAvailable,
                    selectedQuantity
                  });
                  
                  return (
                    <Card
                      key={category.id}
                      className={`transition-colors ${
                        !isAvailable ? 'opacity-50' : 'hover:border-primary/50'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold">{category.category_name}</h3>
                              {!isAvailable && (
                                <Badge variant="destructive">Sold Out</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                <span className={`font-medium ${isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                                  {category.actualAvailable === 0 ? (
                                    <span className="text-red-500 font-semibold">Sold Out</span>
                                  ) : (
                                    <span>{category.actualAvailable} available</span>
                                  )}
                                </span>
                                <span className="text-gray-500">
                                  / {category.total_quantity} total
                                </span>
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-lg font-bold">₹{category.base_price}</div>
                            </div>
                            
                            {isAvailable && (
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleQuantityChange(category.id, selectedQuantity - 1)}
                                  disabled={selectedQuantity <= 0}
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                                <div className="w-12 text-center font-medium">
                                  {selectedQuantity}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleQuantityChange(category.id, selectedQuantity + 1)}
                                  disabled={selectedQuantity >= category.actualAvailable}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Booking Summary & Proceed Button */}
        {selectedTickets.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Booking Summary</h3>
                  <Badge variant="secondary" className="text-sm">
                    Combined Booking - {selectedTickets.length} Categories
                  </Badge>
                </div>
                
                {/* Selected Tickets List */}
                <div className="space-y-2">
                  {selectedTickets.map((ticket) => {
                    // Get current category data to show real-time availability
                    const currentCategory = displayCategories.find(cat => cat.id === ticket.categoryId);
                    const currentAvailable = currentCategory ? currentCategory.actualAvailable : 0;
                    const currentTotal = currentCategory ? currentCategory.total_quantity : 0;
                    
                    return (
                      <div key={ticket.categoryId} className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-lg">
                        <div>
                          <span className="font-medium">{ticket.categoryName}</span>
                          <span className="text-muted-foreground ml-2">× {ticket.quantity}</span>
                          <div className="text-xs text-muted-foreground mt-1">
                            <span className={`${currentAvailable > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {currentAvailable === 0 ? 'Sold Out' : `${currentAvailable} available`}
                            </span>
                            <span className="text-gray-500 ml-1">/ {currentTotal} total</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">₹{(ticket.basePrice + ticket.convenienceFee) * ticket.quantity}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Total Tickets:</span>
                    <span className="font-medium">{getTotalTickets()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">Total Amount:</span>
                    <span className="font-bold text-xl text-green-600">₹{getTotalPrice()}</span>
                  </div>
                </div>

                <Button 
                  onClick={handleProceedToCheckout}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 text-lg"
                  size="lg"
                  disabled={loadingMainEvent}
                >
                  <Ticket className="w-5 h-5 mr-2" />
                  {loadingMainEvent ? 'Loading...' : 'Proceed to Checkout - Combined Booking'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RecurringEventOccurrenceBooking;
