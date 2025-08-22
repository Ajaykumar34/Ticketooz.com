
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus } from 'lucide-react';
import { useGeneralAdmissionAvailability } from '@/hooks/useGeneralAdmissionAvailability';

interface TicketSelectionInterfaceProps {
  eventId: string;
  onTicketSelect?: (tickets: any[]) => void;
}

interface SelectedTicket {
  categoryId: string;
  categoryName: string;
  quantity: number;
  basePrice: number;
  convenienceFee: number;
  totalPrice: number;
  color: string;
}

const TicketSelectionInterface = ({ eventId, onTicketSelect }: TicketSelectionInterfaceProps) => {
  const { availability, loading, error, refetch } = useGeneralAdmissionAvailability(eventId);
  const [selectedTickets, setSelectedTickets] = useState<{[key: string]: number}>({});

  // Calculate real-time availability by subtracting selected quantities from available quantities
  const realTimeAvailability = useMemo(() => {
    return availability.map(availData => {
      const selectedQuantity = selectedTickets[availData.seat_category_id] || 0;
      const realTimeAvailable = Math.max(0, availData.available_tickets - selectedQuantity);
      
      return {
        ...availData,
        real_time_available: realTimeAvailable,
        selected_quantity: selectedQuantity,
        is_sold_out: realTimeAvailable === 0
      };
    });
  }, [availability, selectedTickets]);

  const updateTicketQuantity = useCallback((categoryId: string, change: number) => {
    const availabilityData = availability.find(a => a.seat_category_id === categoryId);
    if (!availabilityData) return;

    const currentQuantity = selectedTickets[categoryId] || 0;
    const maxAvailable = availabilityData.available_tickets;
    
    // Calculate new quantity within bounds (0 to available_tickets)
    const newQuantity = Math.max(0, Math.min(maxAvailable, currentQuantity + change));
    
    console.log(`[TicketSelectionInterface] Category ${categoryId}: ${currentQuantity} -> ${newQuantity} (max: ${maxAvailable})`);

    setSelectedTickets(prev => {
      const updated = { ...prev };
      if (newQuantity === 0) {
        delete updated[categoryId];
      } else {
        updated[categoryId] = newQuantity;
      }
      return updated;
    });
  }, [availability, selectedTickets]);

  // FIXED: Stabilize the ticket selection update with useCallback
  const handleTicketSelectionUpdate = useCallback(() => {
    const ticketSelection = Object.entries(selectedTickets).map(([catId, quantity]) => {
      const availData = availability.find(a => a.seat_category_id === catId);
      if (!availData || quantity === 0) return null;
      
      const basePrice = availData.base_price || 0;
      const convenienceFee = availData.convenience_fee || 0;
      const totalPrice = basePrice + convenienceFee;
      
      // Create individual ticket objects for booking system
      const tickets = [];
      for (let i = 0; i < quantity; i++) {
        tickets.push({
          id: `${catId}-${i}`,
          seat_number: `${availData.category_name}-${i + 1}`,
          row_name: '',
          category_name: availData.category_name,
          seat_category_id: catId,
          seat_categories: {
            id: catId,
            name: availData.category_name,
            color: availData.color
          },
          price: basePrice,
          convenience_fee: convenienceFee,
          total_price: totalPrice,
          base_price: basePrice
        });
      }
      
      return tickets;
    }).filter(Boolean).flat();
    
    if (onTicketSelect) {
      onTicketSelect(ticketSelection);
    }
  }, [selectedTickets, availability, onTicketSelect]);

  // FIXED: Only call handleTicketSelectionUpdate when dependencies actually change
  useEffect(() => {
    if (availability.length > 0) {
      handleTicketSelectionUpdate();
    }
  }, [handleTicketSelectionUpdate, availability.length]);

  const getTotalPrice = () => {
    return Object.entries(selectedTickets).reduce((total, [categoryId, quantity]) => {
      const availData = availability.find(a => a.seat_category_id === categoryId);
      if (!availData) return total;
      
      const basePrice = availData.base_price || 0;
      const convenienceFee = availData.convenience_fee || 0;
      return total + ((basePrice + convenienceFee) * quantity);
    }, 0);
  };

  const getTotalTickets = () => {
    return Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
  };

  const getSelectedTicketsSummary = (): SelectedTicket[] => {
    return Object.entries(selectedTickets).map(([categoryId, quantity]) => {
      const availData = availability.find(a => a.seat_category_id === categoryId);
      if (!availData) return null;
      
      const basePrice = availData.base_price || 0;
      const convenienceFee = availData.convenience_fee || 0;
      const totalPrice = (basePrice + convenienceFee) * quantity;
      
      return {
        categoryId,
        categoryName: availData.category_name,
        quantity,
        basePrice,
        convenienceFee,
        totalPrice,
        color: availData.color
      };
    }).filter(Boolean) as SelectedTicket[];
  };

  // Add refresh button to manually trigger data refresh
  const handleRefresh = () => {
    console.log('[TicketSelectionInterface] Manual refresh triggered');
    refetch();
  };

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
            <p>Error loading tickets: {error}</p>
            <Button onClick={handleRefresh} variant="outline" className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Select Tickets</CardTitle>
            <p className="text-sm text-gray-600">Choose your ticket categories and quantities</p>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {realTimeAvailability && realTimeAvailability.length > 0 ? (
          <div className="space-y-4">
            {realTimeAvailability.map((availabilityData) => {
              const basePrice = availabilityData.base_price || 0;
              const convenienceFee = availabilityData.convenience_fee || 0;
              const totalPrice = basePrice + convenienceFee;
              const selectedQuantity = availabilityData.selected_quantity;
              const realTimeAvailable = availabilityData.real_time_available;
              const isAvailable = realTimeAvailable > 0;
              
              return (
                <div key={availabilityData.seat_category_id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: availabilityData.color || '#4ECDC4' }}
                        />
                        <span className="font-medium text-lg">
                          {availabilityData.category_name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          ₹{totalPrice}
                        </Badge>
                        {!isAvailable && (
                          <Badge variant="destructive" className="text-xs">
                            NOT AVAILABLE
                          </Badge>
                        )}
                        {selectedQuantity > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {selectedQuantity} SELECTED
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        <div>Base: ₹{basePrice}</div>
                        {convenienceFee > 0 && <div>Fee: ₹{convenienceFee}</div>}
                      </div>
                      <div className="text-sm font-medium">
                        <span className={`${isAvailable ? 'text-blue-600' : 'text-red-600'}`}>
                          Available: {realTimeAvailable}
                        </span>
                        <span className="text-gray-400 ml-2">
                          / {availabilityData.total_tickets} total
                        </span>
                        {selectedQuantity > 0 && (
                          <span className="text-green-600 ml-2">
                            ({selectedQuantity} selected)
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateTicketQuantity(availabilityData.seat_category_id, -1)}
                        disabled={selectedQuantity === 0}
                        className="h-8 w-8 p-0 rounded-full"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      
                      <span className="w-8 text-center font-medium text-lg">{selectedQuantity}</span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateTicketQuantity(availabilityData.seat_category_id, 1)}
                        disabled={!isAvailable}
                        className="h-8 w-8 p-0 rounded-full"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {selectedQuantity > 0 && (
                    <div className="text-sm text-green-600 font-medium">
                      Subtotal: ₹{totalPrice * selectedQuantity}
                    </div>
                  )}
                </div>
              );
            })}
            
            {getTotalTickets() > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                <div className="mb-4">
                  <h4 className="font-semibold text-lg mb-2">Selected Tickets Summary</h4>
                  <div className="space-y-2">
                    {getSelectedTicketsSummary().map((ticket) => (
                      <div key={ticket.categoryId} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: ticket.color }}
                          />
                          <span>{ticket.categoryName} × {ticket.quantity}</span>
                        </div>
                        <span className="font-medium">₹{ticket.totalPrice}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-between items-center border-t pt-3">
                  <div>
                    <h4 className="font-semibold text-lg">Total</h4>
                    <p className="text-sm text-gray-600">
                      {getTotalTickets()} ticket{getTotalTickets() > 1 ? 's' : ''} selected
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      ₹{getTotalPrice()}
                    </div>
                    <p className="text-xs text-gray-500">Total Amount</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <h3 className="text-lg font-semibold mb-2">No Ticket Categories Available</h3>
            <p>This event doesn't have any ticket categories configured yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TicketSelectionInterface;
