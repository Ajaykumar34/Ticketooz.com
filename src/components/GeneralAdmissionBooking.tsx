
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, Calendar, User, IndianRupee } from 'lucide-react';
import { useSeatPricing } from '@/hooks/useSeatPricing';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface GeneralAdmissionBookingProps {
  eventId: string;
  eventName: string;
  eventDate: string;
  organizerName?: string;
  organizerImage?: string;
  onTicketSelect: (tickets: Array<{
    categoryId: string;
    categoryName: string;
    quantity: number;
    basePrice: number;
    convenienceFee: number;
    price: number;
    total: number;
  }>) => void;
}

const GeneralAdmissionBooking = ({ 
  eventId, 
  eventName, 
  eventDate, 
  organizerName, 
  organizerImage,
  onTicketSelect 
}: GeneralAdmissionBookingProps) => {
  const { pricingData: pricing, loading, error } = useSeatPricing(eventId);
  const [selectedTickets, setSelectedTickets] = useState<{[key: string]: number}>({});
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  console.log('[GeneralAdmissionBooking] Component loaded for event:', eventId);
  console.log('[GeneralAdmissionBooking] Pricing data:', pricing);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading tickets...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !pricing || pricing.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            No tickets available for this event
          </div>
        </CardContent>
      </Card>
    );
  }

  const updateTicketQuantity = (categoryId: string, change: number) => {
    const currentQuantity = selectedTickets[categoryId] || 0;
    const newQuantity = Math.max(0, Math.min(10, currentQuantity + change));
    
    console.log(`[GeneralAdmissionBooking] Updating ticket quantity for category ${categoryId}: ${currentQuantity} -> ${newQuantity}`);
    
    const newSelectedTickets = {
      ...selectedTickets,
      [categoryId]: newQuantity
    };
    
    if (newQuantity === 0) {
      delete newSelectedTickets[categoryId];
    }
    
    setSelectedTickets(newSelectedTickets);
    
    // Convert to format expected by parent - ALWAYS use selectedGeneralTickets format
    const ticketSelection = Object.entries(newSelectedTickets).map(([catId, quantity]) => {
      const pricingData = pricing.find(p => p.seat_category_id === catId);
      if (!pricingData) return null;
      
      const basePrice = pricingData.base_price || 0;
      const convenienceFee = pricingData.calculated_convenience_fee || 0;
      const totalPrice = basePrice + convenienceFee;
      
      console.log(`[GeneralAdmissionBooking] Creating ticket selection for ${pricingData.seat_categories?.name}:`, {
        categoryId: catId,
        quantity,
        basePrice,
        convenienceFee,
        totalPrice
      });
      
      return {
        categoryId: catId,
        categoryName: pricingData.seat_categories?.name || 'General',
        quantity,
        basePrice: basePrice,
        convenienceFee: convenienceFee,
        price: totalPrice,
        total: totalPrice * quantity
      };
    }).filter(Boolean);
    
    console.log('[GeneralAdmissionBooking] Final ticket selection:', ticketSelection);
    onTicketSelect(ticketSelection);
  };

  const getBasePrice = () => {
    return Object.entries(selectedTickets).reduce((total, [categoryId, quantity]) => {
      const pricingData = pricing.find(p => p.seat_category_id === categoryId);
      if (!pricingData) return total;
      return total + ((pricingData.base_price || 0) * quantity);
    }, 0);
  };

  const getConvenienceFee = () => {
    return Object.entries(selectedTickets).reduce((total, [categoryId, quantity]) => {
      const pricingData = pricing.find(p => p.seat_category_id === categoryId);
      if (!pricingData) return total;
      return total + ((pricingData.calculated_convenience_fee || 0) * quantity);
    }, 0);
  };

  const getTotalPrice = () => {
    return getBasePrice() + getConvenienceFee();
  };

  const handleBookNow = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to book tickets",
        variant: "destructive",
      });
      navigate('/login');
      return;
    }

    if (getTotalPrice() === 0) {
      toast({
        title: "No Selection",
        description: "Please select tickets to proceed",
        variant: "destructive",
      });
      return;
    }

    // Create event data for checkout
    const eventData = {
      id: eventId,
      name: eventName,
      start_datetime: eventDate,
      venues: null,
      is_recurring: false // General admission is NOT recurring
    };

    // Create selectedGeneralTickets (NOT selectedRecurringTickets)
    const selectedGeneralTickets = Object.entries(selectedTickets).map(([categoryId, quantity]) => {
      const pricingData = pricing.find(p => p.seat_category_id === categoryId);
      if (!pricingData) return null;
      
      const basePrice = pricingData.base_price || 0;
      const convenienceFee = pricingData.calculated_convenience_fee || 0;
      
      return {
        categoryId,
        categoryName: pricingData.seat_categories?.name || 'General',
        quantity,
        basePrice: basePrice,
        convenienceFee: convenienceFee,
        price: basePrice + convenienceFee,
        total: (basePrice + convenienceFee) * quantity
      };
    }).filter(Boolean);

    const totalQuantity = Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
    const finalBasePrice = getBasePrice();
    const finalConvenienceFee = getConvenienceFee();
    const finalTotalPrice = getTotalPrice();

    console.log('[GeneralAdmissionBooking] Navigating to checkout with data:', {
      event: eventData,
      selectedGeneralTickets, // This should be selectedGeneralTickets, NOT selectedRecurringTickets
      quantity: totalQuantity,
      basePrice: finalBasePrice,
      convenienceFee: finalConvenienceFee,
      totalPrice: finalTotalPrice
    });

    navigate('/checkout', {
      state: {
        event: eventData,
        selectedGeneralTickets, // Use selectedGeneralTickets consistently
        quantity: totalQuantity,
        basePrice: finalBasePrice,
        convenienceFee: finalConvenienceFee,
        totalPrice: finalTotalPrice,
        eventDate: eventDate,
        isGeneralAdmission: true // Flag to distinguish from recurring events
      }
    });
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Event Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-2">{eventName}</h2>
        
        {/* Select Date */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Select Date</h3>
          <div className="flex items-center gap-2 p-2 border rounded bg-gray-50">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm">{eventDate}</span>
          </div>
        </div>

        {/* Organizer */}
        {organizerName && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Organised By</h3>
            <div className="flex items-center gap-3">
              {organizerImage ? (
                <img 
                  src={organizerImage} 
                  alt={organizerName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
              <div>
                <p className="font-medium text-sm">{organizerName}</p>
                <button className="text-xs text-blue-600 hover:underline">
                  View Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add to Calendar */}
        <Button variant="outline" size="sm" className="w-full mb-4">
          <Calendar className="w-4 h-4 mr-2" />
          Add to Calendar
        </Button>
      </div>

      {/* Ticket Selection */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Select Tickets</h3>
        
        <div className="space-y-4">
          {pricing.map((pricingData) => {
            const category = pricingData.seat_categories;
            const basePrice = pricingData.base_price || 0;
            const convenienceFee = pricingData.calculated_convenience_fee || 0;
            const totalPrice = basePrice + convenienceFee;
            const quantity = selectedTickets[pricingData.seat_category_id] || 0;
            
            return (
              <div key={pricingData.seat_category_id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-lg">
                        <IndianRupee className="w-4 h-4 inline" />
                        {totalPrice}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {category?.name || 'General Admission'}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      <div>Base: ₹{basePrice}</div>
                      {convenienceFee > 0 && <div>Fee: ₹{convenienceFee}</div>}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateTicketQuantity(pricingData.seat_category_id, -1)}
                      disabled={quantity === 0}
                      className="h-8 w-8 p-0 rounded-full"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    
                    <span className="w-8 text-center font-medium">{quantity}</span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateTicketQuantity(pricingData.seat_category_id, 1)}
                      disabled={quantity >= 10}
                      className="h-8 w-8 p-0 rounded-full"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {quantity > 0 && (
                  <div className="text-sm text-green-600 font-medium">
                    Subtotal: ₹{totalPrice * quantity}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Total Price */}
        <div className="border-t pt-4 mt-6">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span>Base Price:</span>
              <span>₹{getBasePrice()}</span>
            </div>
            {getConvenienceFee() > 0 && (
              <div className="flex justify-between text-sm">
                <span>Convenience Fee:</span>
                <span>₹{getConvenienceFee()}</span>
              </div>
            )}
            <div className="flex justify-between items-center font-medium text-lg border-t pt-2">
              <span>Total Price:</span>
              <span className="flex items-center">
                <IndianRupee className="w-5 h-5 mr-1" />
                {getTotalPrice()}
              </span>
            </div>
          </div>
          
          <Button 
            className="w-full bg-teal-500 hover:bg-teal-600 text-white py-3 rounded-lg font-medium"
            disabled={getTotalPrice() === 0}
            onClick={handleBookNow}
          >
            Book Now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GeneralAdmissionBooking;
