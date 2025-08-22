
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Ticket, Minus, Plus, RefreshCw } from 'lucide-react';
import { useOccurrenceTicketCategories } from '@/hooks/useOccurrenceTicketCategories';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EventOccurrence {
  id: string;
  occurrence_date: string;
  occurrence_time: string;
  total_tickets: number;
  available_tickets: number;
  is_active: boolean;
}

interface SelectedTicket {
  categoryId: string;
  categoryName: string;
  basePrice: number;
  convenienceFee: number;
  quantity: number;
  maxQuantity: number;
}

interface RecurringEventTicketSelectionProps {
  selectedOccurrence: EventOccurrence;
  onTicketSelection: (selectedTickets: SelectedTicket[]) => void;
  onProceedToBooking: () => void;
  refreshTrigger?: number;
  isBookingInProgress?: boolean;
}

const RecurringEventTicketSelection = ({
  selectedOccurrence,
  onTicketSelection,
  onProceedToBooking,
  refreshTrigger = 0,
  isBookingInProgress = false
}: RecurringEventTicketSelectionProps) => {
  const { toast } = useToast();
  const { categories, loading: categoriesLoading, error: categoriesError, refreshCategories, isEventSoldOut } = useOccurrenceTicketCategories(selectedOccurrence.id);
  
  const [selectedTickets, setSelectedTickets] = useState<SelectedTicket[]>([]);
  const [displayCategories, setDisplayCategories] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshTrigger, setLastRefreshTrigger] = useState(0);

  // Only refresh categories when refreshTrigger changes and we're not in the middle of booking
  useEffect(() => {
    if (refreshTrigger > lastRefreshTrigger && !isBookingInProgress) {
      console.log('[RecurringEventTicketSelection] Refresh triggered, refetching categories...');
      refreshCategories();
      setLastRefreshTrigger(refreshTrigger);
    }
  }, [refreshTrigger, isBookingInProgress, lastRefreshTrigger, refreshCategories]);

  // Update categories with actual availability from database
  useEffect(() => {
    const updateCategoriesWithActualAvailability = async () => {
      if (!categories || categories.length === 0) {
        console.log('[RecurringEventTicketSelection] No categories to update');
        setDisplayCategories([]);
        return;
      }

      console.log('[RecurringEventTicketSelection] Updating categories with actual database availability...');
      console.log('[RecurringEventTicketSelection] Overall event sold out status:', isEventSoldOut);

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
              console.error('[RecurringEventTicketSelection] Error fetching bookings for category:', category.id, bookingsError);
              return category;
            }

            const bookedTickets = bookings?.reduce((sum, booking) => sum + (booking.quantity || 0), 0) || 0;
            const actualAvailable = Math.max(0, category.total_quantity - bookedTickets);

            console.log(`[RecurringEventTicketSelection] Category ${category.category_name} actual availability:`, {
              total_quantity: category.total_quantity,
              database_stored_available: category.available_quantity,
              confirmed_bookings_count: bookedTickets,
              actual_calculated_available: actualAvailable,
              is_category_sold_out: actualAvailable === 0
            });

            return {
              ...category,
              actualAvailable: actualAvailable,
              // Use the real-time calculated value for UI
              available_quantity: actualAvailable
            };
          })
        );

        console.log('[RecurringEventTicketSelection] Final updated categories with actual availability:', updatedCategories);
        setDisplayCategories(updatedCategories);
      } catch (error) {
        console.error('[RecurringEventTicketSelection] Error updating categories with actual availability:', error);
        setDisplayCategories(categories);
      }
    };

    updateCategoriesWithActualAvailability();
  }, [categories, selectedOccurrence.id, isEventSoldOut]);

  // Notify parent component when tickets are selected
  useEffect(() => {
    onTicketSelection(selectedTickets);
  }, [selectedTickets, onTicketSelection]);

  const handleQuantityChange = (categoryId: string, newQuantity: number) => {
    // Don't allow changes during booking
    if (isBookingInProgress) return;

    const category = displayCategories.find(cat => cat.id === categoryId);
    if (!category) {
      console.warn(`[RecurringEventTicketSelection] Category not found: ${categoryId}`);
      return;
    }

    console.log(`[RecurringEventTicketSelection] Quantity change request - Category: ${categoryId}, Current available: ${category.available_quantity}, Requested quantity: ${newQuantity}`);

    // Ensure quantity doesn't exceed available quantity and is within reasonable limits
    const maxAllowed = Math.min(category.available_quantity, 10); // Limit to 10 tickets max per category
    const finalQuantity = Math.max(0, Math.min(newQuantity, maxAllowed));

    console.log(`[RecurringEventTicketSelection] Final quantity after validation: ${finalQuantity} (max allowed: ${maxAllowed})`);

    if (finalQuantity <= 0) {
      // Remove ticket if quantity is 0
      console.log(`[RecurringEventTicketSelection] Removing category ${categoryId} from selection`);
      setSelectedTickets(prev => prev.filter(ticket => ticket.categoryId !== categoryId));
    } else {
      setSelectedTickets(prev => {
        const existingIndex = prev.findIndex(ticket => ticket.categoryId === categoryId);
        
        if (existingIndex >= 0) {
          // Update existing ticket
          console.log(`[RecurringEventTicketSelection] Updating existing selection for category ${categoryId}: ${prev[existingIndex].quantity} -> ${finalQuantity}`);
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: finalQuantity
          };
          return updated;
        } else {
          // Add new ticket
          console.log(`[RecurringEventTicketSelection] Adding new selection for category ${categoryId}: ${finalQuantity} tickets`);
          return [...prev, {
            categoryId,
            categoryName: category.category_name,
            basePrice: category.base_price,
            convenienceFee: category.convenience_fee,
            quantity: finalQuantity,
            maxQuantity: category.available_quantity
          }];
        }
      });
    }
  };

  const handleRefresh = async () => {
    if (isBookingInProgress) return;
    
    setRefreshing(true);
    try {
      await refreshCategories();
      toast({
        title: "Refreshed",
        description: "Ticket availability has been updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh availability",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
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

  const handleProceedToBooking = () => {
    if (selectedTickets.length === 0) {
      toast({
        title: "No Tickets Selected",
        description: "Please select at least one ticket to proceed",
        variant: "destructive",
      });
      return;
    }

    onProceedToBooking();
  };

  return (
    <div className="space-y-6">
      {/* Show event-wide sold out message only if ALL categories are sold out */}
      {isEventSoldOut && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <Badge variant="destructive" className="mb-2">Event Sold Out</Badge>
              <p className="text-red-700">All ticket categories for this event are sold out.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ticket Category Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              Select Tickets
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={categoriesLoading || refreshing || isBookingInProgress}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </CardTitle>
          <p className="text-muted-foreground">
            Choose your ticket categories and quantities
          </p>
        </CardHeader>
        <CardContent>
          {categoriesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : categoriesError ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">Error loading ticket categories: {categoriesError}</p>
              <Button variant="outline" onClick={refreshCategories} disabled={isBookingInProgress}>
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
                const isAvailable = category.available_quantity > 0;
                
                return (
                  <Card
                    key={category.id}
                    className={`transition-colors ${
                      !isAvailable ? 'opacity-50 bg-gray-50' : 
                      isBookingInProgress ? 'opacity-70' : 'hover:border-primary/50'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">{category.category_name}</h3>
                            {!isAvailable && (
                              <Badge variant="destructive">Sold Out</Badge>
                            )}
                            {selectedQuantity > 0 && (
                              <Badge variant="secondary">
                                {selectedQuantity} selected
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-2">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                <span className={`font-medium ${isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                                  {category.available_quantity === 0 ? (
                                    <span className="text-red-500 font-semibold">Sold Out</span>
                                  ) : (
                                    <span>{category.available_quantity} available</span>
                                  )}
                                </span>
                                <span className="text-gray-500">
                                  / {category.total_quantity} total
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-xl font-bold text-primary">₹{category.base_price}</div>
                            {category.convenience_fee > 0 && (
                              <div className="text-sm text-muted-foreground">
                                + ₹{category.convenience_fee} fee
                              </div>
                            )}
                          </div>
                          
                          {isAvailable && (
                            <div className="flex items-center space-x-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuantityChange(category.id, selectedQuantity - 1)}
                                disabled={selectedQuantity <= 0 || isBookingInProgress}
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <div className="w-16 text-center font-bold text-lg">
                                {selectedQuantity}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuantityChange(category.id, selectedQuantity + 1)}
                                disabled={selectedQuantity >= category.available_quantity || isBookingInProgress}
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

      {/* Booking Summary */}
      {selectedTickets.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Booking Summary</h3>
                <Badge variant="secondary" className="text-sm">
                  {selectedTickets.length} Categories Selected
                </Badge>
              </div>
              
              {/* Selected Tickets List */}
              <div className="space-y-2">
                {selectedTickets.map((ticket) => {
                  const currentCategory = displayCategories.find(cat => cat.id === ticket.categoryId);
                  const currentAvailable = currentCategory ? currentCategory.available_quantity : 0;
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
                        <div className="text-xs text-muted-foreground">
                          ₹{ticket.basePrice} + ₹{ticket.convenienceFee} fee each
                        </div>
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
                onClick={handleProceedToBooking}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 text-lg"
                size="lg"
                disabled={selectedTickets.length === 0 || isBookingInProgress}
              >
                <Ticket className="w-5 h-5 mr-2" />
                {isBookingInProgress ? 'Booking in Progress...' : `Proceed to Booking (${getTotalTickets()} tickets)`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RecurringEventTicketSelection;
