
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBookedSeats } from '@/hooks/useBookedSeats';
import { useSeatPricing } from '@/hooks/useSeatPricing';
import { getSeatPricing } from '@/utils/seatPricingCalculations';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Seat {
  id: string;
  seat_number: string;
  row_name: string;
  is_available: boolean;
  is_blocked: boolean;
  seat_categories?: {
    id: string;
    name: string;
    color: string;
    price?: number;
  };
}

interface SeatSelectionProps {
  seats: Seat[];
  eventId: string;
  onSeatSelect: (selectedSeats: any[]) => void;
  maxSeats?: number;
}

const SeatSelection = ({ seats, eventId, onSeatSelect, maxSeats = 10 }: SeatSelectionProps) => {
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const { bookedSeats } = useBookedSeats(eventId);
  const { pricingData } = useSeatPricing(eventId);

  // Group seats by row for better display
  const seatsByRow = seats.reduce((acc, seat) => {
    if (!acc[seat.row_name]) {
      acc[seat.row_name] = [];
    }
    acc[seat.row_name].push(seat);
    return acc;
  }, {} as Record<string, Seat[]>);

  // Sort rows alphabetically
  const sortedRows = Object.keys(seatsByRow).sort();

  const getSeatTotalPrice = (seatCategoryId: string) => {
    const seat = { seat_category_id: seatCategoryId, seat_categories: { id: seatCategoryId } };
    const pricing = getSeatPricing(seat, pricingData);
    console.log('[SeatSelection] Getting total price for category:', seatCategoryId, 'pricing:', pricing);
    return pricing.totalPrice;
  };

  // Helper function to check if a seat is booked
  const isSeatBooked = (seatId: string) => {
    return bookedSeats.some(bookedSeat => 
      bookedSeat.seat_number === seatId || 
      bookedSeat.seat_number.includes(seatId) ||
      seatId.includes(bookedSeat.seat_number)
    );
  };

  const handleSeatClick = (seat: Seat) => {
    if (!seat.is_available || seat.is_blocked || isSeatBooked(seat.id)) {
      return;
    }

    setSelectedSeats(prev => {
      let newSelection;
      if (prev.includes(seat.id)) {
        newSelection = prev.filter(id => id !== seat.id);
      } else {
        if (prev.length >= maxSeats) {
          return prev; // Don't add more seats if limit reached
        }
        newSelection = [...prev, seat.id];
      }

      // Calculate seat details for parent component - FORMAT FOR DATABASE
      const selectedSeatDetails = newSelection.map(seatId => {
        const seatData = seats.find(s => s.id === seatId);
        if (!seatData) return null;

        const totalPrice = getSeatTotalPrice(seatData.seat_categories?.id || '');
        const seat = { seat_category_id: seatData.seat_categories?.id, seat_categories: seatData.seat_categories };
        const pricing = getSeatPricing(seat, pricingData);
        const convenienceFee = pricing.convenienceFee;
        const basePrice = pricing.basePrice;
        
        console.log('[SeatSelection] Pricing calculation for seat:', seatData.seat_number, {
          categoryId: seatData.seat_categories?.id,
          basePrice,
          convenienceFee,
          totalPrice: pricing.totalPrice
        });

        // Return in the exact format needed for database insertion
        return {
          price: basePrice,
          quantity: "1",
          seat_number: `${seatData.row_name}${seatData.seat_number}`,
          seat_category: seatData.seat_categories?.name || 'General',
          total_quantity: "N/A",
          available_quantity: "N/A",
          // Additional data for checkout/payment display
          id: seatData.id,
          row_name: seatData.row_name,
          category: seatData.seat_categories?.name || 'General',
          color: seatData.seat_categories?.color || '#6B7280',
          convenience_fee: convenienceFee,
          total_price: pricing.totalPrice
        };
      }).filter(Boolean);

      onSeatSelect(selectedSeatDetails);
      return newSelection;
    });
  };

  const getSeatStatus = (seat: Seat) => {
    if (!seat.is_available || seat.is_blocked) return 'blocked';
    if (isSeatBooked(seat.id)) return 'booked';
    if (selectedSeats.includes(seat.id)) return 'selected';
    return 'available';
  };

  const getSeatClassName = (seat: Seat) => {
    const status = getSeatStatus(seat);
    const baseClasses = "w-8 h-8 rounded-md border-2 cursor-pointer transition-all duration-200 flex items-center justify-center text-xs font-medium relative";
    
    switch (status) {
      case 'blocked':
        return cn(baseClasses, "bg-gray-300 border-gray-400 cursor-not-allowed text-gray-600");
      case 'booked':
        return cn(baseClasses, "bg-red-100 border-red-400 cursor-not-allowed text-red-600");
      case 'selected':
        return cn(baseClasses, "bg-blue-600 border-blue-700 text-white shadow-lg transform scale-105");
      case 'available':
        return cn(baseClasses, "bg-green-100 border-green-400 hover:bg-green-200 text-green-800");
      default:
        return baseClasses;
    }
  };

  // Get unique categories for legend - NO PRICING DISPLAY
  const categories = Array.from(new Set(seats.map(seat => seat.seat_categories?.name).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Legend - NO PRICING */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Seat Categories & Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {categories.map(category => {
              const sampleSeat = seats.find(s => s.seat_categories?.name === category);
              return (
                <div key={category} className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded border-2"
                    style={{ 
                      backgroundColor: sampleSeat?.seat_categories?.color || '#6B7280',
                      borderColor: sampleSeat?.seat_categories?.color || '#6B7280'
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium">{category}</p>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border-2 border-green-400 rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600 border-2 border-blue-700 rounded"></div>
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border-2 border-red-400 rounded"></div>
              <span>Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-300 border-2 border-gray-400 rounded"></div>
              <span>Blocked</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seat Map */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Your Seats</CardTitle>
          <p className="text-sm text-gray-600">Click on available seats to select them (Max: {maxSeats} seats)</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Stage/Screen indicator */}
            <div className="text-center py-4">
              <div className="inline-block bg-gray-800 text-white px-8 py-2 rounded-lg">
                STAGE / SCREEN
              </div>
            </div>

            {/* Seat rows */}
            <div className="space-y-3">
              {sortedRows.map(rowName => (
                <div key={rowName} className="flex items-center gap-2">
                  {/* Row label integrated with seats */}
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="w-8 h-8 flex items-center justify-center text-sm font-bold">
                      {rowName}
                    </Badge>
                    <div className="flex gap-1">
                      {seatsByRow[rowName]
                        .sort((a, b) => parseInt(a.seat_number) - parseInt(b.seat_number))
                        .map(seat => (
                           <div
                             key={seat.id}
                             className={getSeatClassName(seat)}
                             onClick={() => handleSeatClick(seat)}
                             title={`${rowName}${seat.seat_number} - ${seat.seat_categories?.name || 'General'}`}
                           >
                             {seat.seat_number}
                           </div>
                        ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selection Summary - NO PRICING DURING SELECTION */}
      {selectedSeats.length > 0 && (
        <Card>
          <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">{selectedSeats.length} seat(s) selected</span>
                  </div>
                </div>
              <Button 
                onClick={() => {
                  setSelectedSeats([]);
                  onSeatSelect([]);
                }}
                variant="outline"
                size="sm"
              >
                Clear Selection
              </Button>
            </div>
            
            {/* Selected seats details - SHOW ONLY SEAT NUMBERS */}
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedSeats.map(seatId => {
                const seat = seats.find(s => s.id === seatId);
                if (!seat) return null;
                return (
                  <Badge key={seatId} variant="secondary" className="text-xs">
                    {seat.row_name}{seat.seat_number}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SeatSelection;
