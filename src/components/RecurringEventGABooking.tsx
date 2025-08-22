
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, IndianRupee, Users } from 'lucide-react';
import { useOccurrenceTicketCategories } from '@/hooks/useOccurrenceTicketCategories';

interface RecurringEventGABookingProps {
  occurrenceId: string;
  isRecurring: boolean;
  onTicketSelect: (tickets: Array<{
    categoryId: string;
    categoryName: string;
    quantity: number;
    price: number;
    total: number;
    basePrice: number;
    convenienceFee: number;
  }>) => void;
  onProceedToCheckout: () => void;
}

const RecurringEventGABooking: React.FC<RecurringEventGABookingProps> = ({
  occurrenceId,
  isRecurring,
  onTicketSelect,
  onProceedToCheckout
}) => {
  const { categories, loading, error } = useOccurrenceTicketCategories(occurrenceId);
  const [selectedTickets, setSelectedTickets] = useState<{[key: string]: number}>({});

  useEffect(() => {
    const ticketSelection = Object.entries(selectedTickets).map(([categoryId, quantity]) => {
      const categoryData = categories.find(a => a.id === categoryId);
      if (!categoryData || quantity === 0) return null;
      
      // For recurring events, completely ignore convenience fee
      const basePrice = categoryData.base_price;
      const convenienceFee = isRecurring ? 0 : (categoryData.convenience_fee || 0);
      const price = isRecurring ? basePrice : basePrice + convenienceFee;
      const total = price * quantity;

      return {
        categoryId,
        categoryName: categoryData.category_name,
        quantity,
        price,
        total,
        basePrice,
        convenienceFee: isRecurring ? 0 : convenienceFee
      };
    }).filter(Boolean);

    onTicketSelect(ticketSelection);
  }, [selectedTickets, categories, isRecurring, onTicketSelect]);

  const handleQuantityChange = (categoryId: string, change: number) => {
    setSelectedTickets(prev => {
      const categoryData = categories.find(a => a.id === categoryId);
      if (!categoryData) return prev;

      const currentQuantity = prev[categoryId] || 0;
      const newQuantity = Math.max(0, Math.min(categoryData.available_quantity, currentQuantity + change));

      if (newQuantity === 0) {
        const { [categoryId]: removed, ...rest } = prev;
        return rest;
      }

      return { ...prev, [categoryId]: newQuantity };
    });
  };

  const getTotalTickets = () => {
    return Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalPrice = () => {
    return Object.entries(selectedTickets).reduce((total, [categoryId, quantity]) => {
      const categoryData = categories.find(a => a.id === categoryId);
      if (!categoryData) return total;

      // For recurring events, use only base price
      const price = isRecurring ? categoryData.base_price : categoryData.base_price + (categoryData.convenience_fee || 0);
      return total + (price * quantity);
    }, 0);
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
              <p className="text-sm">This event doesn't have ticket categories configured.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSoldOut = categories.every(cat => cat.available_quantity === 0);

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
              Select Tickets
            </CardTitle>
            <p className="text-sm text-gray-600">
              General admission - Select your quantity (seats assigned at venue)
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {categories.map((category) => {
              const selectedQuantity = selectedTickets[category.id] || 0;
              const basePrice = category.base_price;
              const isCategorySoldOut = category.available_quantity === 0;
              
              // For recurring events, show only base price
              const displayPrice = isRecurring ? basePrice : basePrice + (category.convenience_fee || 0);

              console.log(`[RecurringEventGABooking] Rendering category ${category.category_name}:`, {
                available_quantity: category.available_quantity,
                total_quantity: category.total_quantity,
                is_sold_out: isCategorySoldOut
              });

              return (
                <div
                  key={category.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg ${
                    isCategorySoldOut ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <div className="w-4 h-4 rounded border flex-shrink-0 bg-blue-500" />
                      <h3 className="font-semibold text-base sm:text-lg">
                        {category.category_name}
                      </h3>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <IndianRupee className="w-3 h-3" />
                        {displayPrice}
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
                          <span className={`font-medium ${category.available_quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            Available: {category.available_quantity}
                          </span>
                        </span>
                        <span className="text-gray-500">
                          Total: {category.total_quantity}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                          style={{ 
                            width: `${category.total_quantity > 0 ? ((category.total_quantity - category.available_quantity) / category.total_quantity) * 100 : 0}%` 
                          }}
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        {category.total_quantity > 0 ? Math.round(((category.total_quantity - category.available_quantity) / category.total_quantity) * 100) : 0}% booked
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 justify-center sm:justify-end mt-3 sm:mt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuantityChange(category.id, -1)}
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
                      onClick={() => handleQuantityChange(category.id, 1)}
                      disabled={selectedQuantity >= category.available_quantity || isCategorySoldOut}
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
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No tickets selected</p>
                  <p className="text-sm">Select tickets to see summary</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {Object.entries(selectedTickets).map(([categoryId, quantity]) => {
                      const categoryData = categories.find(a => a.id === categoryId);
                      if (!categoryData || quantity === 0) return null;

                      // For recurring events, show only base price in summary
                      const pricePerTicket = isRecurring ? categoryData.base_price : categoryData.base_price + (categoryData.convenience_fee || 0);
                      const totalForCategory = pricePerTicket * quantity;

                      return (
                        <div key={categoryId} className="flex justify-between text-sm">
                          <span>{categoryData.category_name} × {quantity}</span>
                          <span>₹{totalForCategory}</span>
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
                      onClick={onProceedToCheckout}
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

export default RecurringEventGABooking;
