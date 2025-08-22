
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { bookGeneralAdmission } from '@/lib/bookGeneralAdmission';
import { useAuth } from '@/hooks/useAuth';
import { Minus, Plus, Users } from 'lucide-react';

interface GeneralAdmissionBookingButtonProps {
  eventId: string;
  eventOccurrenceId: string;
  seatCategoryId: string;
  categoryName: string;
  basePrice: number;
  convenienceFee?: number;
  calculatedConvenienceFee?: number; // Add support for calculated convenience fee
  availableTickets: number;
  onBookingSuccess?: (bookingId: string) => void;
}

export const GeneralAdmissionBookingButton = ({
  eventId,
  eventOccurrenceId,
  seatCategoryId,
  categoryName,
  basePrice,
  convenienceFee = 0,
  calculatedConvenienceFee,
  availableTickets,
  onBookingSuccess
}: GeneralAdmissionBookingButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });

  // Use calculated convenience fee if available, otherwise fallback to regular convenience fee
  const actualConvenienceFee = calculatedConvenienceFee !== undefined ? calculatedConvenienceFee : convenienceFee;

  const totalTicketPrice = basePrice * quantity;
  const totalConvenienceFee = actualConvenienceFee * quantity;
  const totalAmount = totalTicketPrice + totalConvenienceFee;

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= availableTickets) {
      setQuantity(newQuantity);
    }
  };

  const handleBooking = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to book tickets",
        variant: "destructive",
      });
      return;
    }

    if (!customerInfo.name || !customerInfo.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in your name and email",
        variant: "destructive",
      });
      return;
    }

    if (quantity > availableTickets) {
      toast({
        title: "Insufficient Tickets",
        description: `Only ${availableTickets} tickets available`,
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      console.log('[GeneralAdmissionBookingButton] Starting booking:', {
        eventId,
        eventOccurrenceId,
        seatCategoryId,
        quantity,
        availableTickets
      });

      // Prepare the selected tickets array
      const selectedTickets = [{
        categoryName,
        quantity,
        basePrice,
        convenienceFee: actualConvenienceFee
      }];

      // Prepare customer info
      const customerData = {
        firstName: customerInfo.name.split(' ')[0] || customerInfo.name,
        lastName: customerInfo.name.split(' ').slice(1).join(' ') || '',
        email: customerInfo.email,
        phone: customerInfo.phone
      };

      const booking = await bookGeneralAdmission(
        eventId,
        selectedTickets,
        customerData,
        totalAmount,
        totalTicketPrice,
        totalConvenienceFee,
        eventOccurrenceId,
        seatCategoryId
      );

      toast({
        title: "Booking Successful!",
        description: `Successfully booked ${quantity} ticket(s). Booking ID: ${booking.id}`,
      });

      // Reset form
      setQuantity(1);
      setCustomerInfo({ name: '', email: '', phone: '' });
      
      onBookingSuccess?.(booking.id);
    } catch (err: any) {
      console.error('[GeneralAdmissionBookingButton] Booking error:', err);
      toast({
        title: "Booking Failed",
        description: err.message || 'Failed to book tickets. Please try again.',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (availableTickets === 0) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center text-red-600 font-semibold">
            Sold Out
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          {categoryName}
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          {availableTickets} tickets available
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quantity Selection */}
        <div className="space-y-2">
          <Label htmlFor="quantity">Number of Tickets</Label>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleQuantityChange(quantity - 1)}
              disabled={quantity <= 1}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
              min={1}
              max={availableTickets}
              className="w-20 text-center"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleQuantityChange(quantity + 1)}
              disabled={quantity >= availableTickets}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Customer Information */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="customerName">Full Name *</Label>
            <Input
              id="customerName"
              value={customerInfo.name}
              onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter your full name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerEmail">Email *</Label>
            <Input
              id="customerEmail"
              type="email"
              value={customerInfo.email}
              onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerPhone">Phone Number</Label>
            <Input
              id="customerPhone"
              value={customerInfo.phone}
              onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="Enter your phone number"
            />
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between text-sm">
            <span>Ticket Price ({quantity}x ₹{basePrice})</span>
            <span>₹{totalTicketPrice}</span>
          </div>
          {actualConvenienceFee > 0 && (
            <div className="flex justify-between text-sm">
              <span>Convenience Fee ({quantity}x ₹{actualConvenienceFee})</span>
              <span>₹{totalConvenienceFee}</span>
            </div>
          )}
          <div className="border-t pt-2">
            <div className="flex justify-between font-semibold">
              <span>Total Amount</span>
              <span>₹{totalAmount}</span>
            </div>
          </div>
        </div>

        {/* Book Button */}
        <Button 
          onClick={handleBooking}
          disabled={loading || !customerInfo.name || !customerInfo.email || quantity > availableTickets}
          className="w-full"
          size="lg"
        >
          {loading ? 'Processing...' : `Book ${quantity} Ticket${quantity > 1 ? 's' : ''}`}
        </Button>
      </CardContent>
    </Card>
  );
};
