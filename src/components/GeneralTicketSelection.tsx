
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, Ticket, IndianRupee } from 'lucide-react';
import { useSeatPricing } from '@/hooks/useSeatPricing';

interface GeneralTicketSelectionProps {
  eventId: string;
  onTicketSelect: (tickets: Array<{
    categoryId: string;
    categoryName: string;
    quantity: number;
    price: number;
    total: number;
  }>) => void;
}

const GeneralTicketSelection = ({ eventId, onTicketSelect }: GeneralTicketSelectionProps) => {
  const { pricingData: pricing, loading, error } = useSeatPricing(eventId);
  const [selectedTickets, setSelectedTickets] = useState<{[key: string]: number}>({});

  console.log('[GeneralTicketSelection] Pricing data:', pricing);
  console.log('[GeneralTicketSelection] Loading:', loading);
  console.log('[GeneralTicketSelection] Error:', error);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading ticket categories...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error loading tickets: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pricing || pricing.length === 0) {
    console.log('[GeneralTicketSelection] No pricing data available');
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Ticket Categories Available</h3>
            <p>This event doesn't have any ticket categories configured yet.</p>
            <p className="text-sm mt-2">Please contact the event organizer for more information.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const updateTicketQuantity = (categoryId: string, change: number, availableTickets: number) => {
    const currentQuantity = selectedTickets[categoryId] || 0;
    const newQuantity = Math.max(0, Math.min(Math.min(10, availableTickets), currentQuantity + change));
    
    const newSelectedTickets = {
      ...selectedTickets,
      [categoryId]: newQuantity
    };
    
    if (newQuantity === 0) {
      delete newSelectedTickets[categoryId];
    }
    
    setSelectedTickets(newSelectedTickets);
    
    // Convert to format expected by parent
    const ticketSelection = Object.entries(newSelectedTickets).map(([catId, quantity]) => {
      const pricingData = pricing.find(p => p.seat_category_id === catId);
      if (!pricingData) return null;
      
      const basePrice = pricingData.base_price || 0;
      const convenienceFee = pricingData.calculated_convenience_fee || pricingData.convenience_fee || 0;
      const totalPrice = basePrice + convenienceFee;
      
      return {
        categoryId: catId,
        categoryName: pricingData.seat_categories?.name || 'General',
        quantity,
        price: totalPrice,
        total: totalPrice * quantity
      };
    }).filter(Boolean);
    
    console.log('[GeneralTicketSelection] Ticket selection updated:', ticketSelection);
    onTicketSelect(ticketSelection);
  };

  const getTotalTickets = () => {
    return Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalPrice = () => {
    return Object.entries(selectedTickets).reduce((total, [categoryId, quantity]) => {
      const pricingData = pricing.find(p => p.seat_category_id === categoryId);
      if (!pricingData) return total;
      
          const basePrice = pricingData.base_price || 0;
          const convenienceFee = pricingData.calculated_convenience_fee || pricingData.convenience_fee || 0;
          const ticketPrice = basePrice + convenienceFee;
      return total + (ticketPrice * quantity);
    }, 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="w-5 h-5" />
          Select Tickets
        </CardTitle>
        <p className="text-sm text-gray-600">
          Choose your ticket categories and quantities
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {pricing.map((pricingData) => {
          const category = pricingData.seat_categories;
          const basePrice = pricingData.base_price || 0;
          const convenienceFee = pricingData.calculated_convenience_fee || pricingData.convenience_fee || 0;
          const ticketPrice = basePrice + convenienceFee;
          const quantity = selectedTickets[pricingData.seat_category_id] || 0;
          const availableTickets = pricingData.available_tickets || 0;
          const isSoldOut = availableTickets === 0;
          
          return (
            <div
              key={pricingData.seat_category_id}
              className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                isSoldOut ? 'bg-gray-100 opacity-60' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: category?.color || '#4ECDC4' }}
                  />
                  <h3 className="font-semibold">{category?.name || 'General'}</h3>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <IndianRupee className="w-3 h-3" />
                    {ticketPrice}
                  </Badge>
                  {isSoldOut && (
                    <Badge variant="destructive" className="text-xs">
                      SOLD OUT
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  Base Price: ₹{basePrice}
                  {convenienceFee > 0 && (
                    <span className="ml-2">+ Convenience Fee: ₹{convenienceFee}</span>
                  )}
                  <div className="mt-1">
                    Available: {availableTickets} tickets
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateTicketQuantity(pricingData.seat_category_id, -1, availableTickets)}
                  disabled={quantity === 0 || isSoldOut}
                  className="h-8 w-8 p-0"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                
                <span className="w-8 text-center font-medium text-lg">{quantity}</span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateTicketQuantity(pricingData.seat_category_id, 1, availableTickets)}
                  disabled={quantity >= 10 || quantity >= availableTickets || isSoldOut}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
        
        {getTotalTickets() > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-semibold text-lg">Selected Tickets</h4>
                <p className="text-sm text-gray-600">
                  {getTotalTickets()} ticket{getTotalTickets() > 1 ? 's' : ''} selected
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center text-2xl font-bold text-green-600">
                  <IndianRupee className="w-5 h-5 mr-1" />
                  {getTotalPrice()}
                </div>
                <p className="text-xs text-gray-500">Total Amount</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GeneralTicketSelection;
