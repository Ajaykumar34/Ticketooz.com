import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Minus, Plus } from 'lucide-react';
import { useSeatMap } from '@/hooks/useSeatMap';
import { useSeatPricing } from '@/hooks/useSeatPricing';
import { getSeatPricing } from '@/utils/seatPricingCalculations';
import { useBookedSeats } from '@/hooks/useBookedSeats';
import { useGeneralAdmissionAvailability } from '@/hooks/useGeneralAdmissionAvailability';
import { isSeatBooked, getSeatDisplayName, countAvailableSeats, countActualBookedSeats } from '@/utils/seatBookingUtils';
import { useToast } from '@/hooks/use-toast';
import TicketSelectionInterface from '@/components/TicketSelectionInterface';

interface SeatMapProps {
  eventId: string;
  onSeatSelect?: (seats: any[]) => void;
}

const SeatMap = ({ eventId, onSeatSelect }: SeatMapProps) => {
  const { seatLayout, loading, error } = useSeatMap(eventId);
  const { pricingData, loading: pricingLoading, error: pricingError } = useSeatPricing(eventId);
  const { bookedSeats, loading: bookedSeatsLoading, error: bookedSeatsError } = useBookedSeats(eventId);
  const { availability, loading: availabilityLoading } = useGeneralAdmissionAvailability(eventId);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [selectedTickets, setSelectedTickets] = useState<{[key: string]: number}>({});
  const [isSoldOut, setIsSoldOut] = useState(false);
  const { toast } = useToast();

  // Enhanced debugging for pricing data
  useEffect(() => {
    console.log('[SeatMap] Pricing data loading state:', { pricingLoading, pricingError });
    if (pricingData && pricingData.length > 0) {
      console.log('[SeatMap] Pricing data loaded successfully:', pricingData.map(pricing => ({
        id: pricing.id,
        seat_category_id: pricing.seat_category_id,
        base_price: pricing.base_price,
        convenience_fee: pricing.convenience_fee,
        convenience_fee_type: pricing.convenience_fee_type,
        convenience_fee_value: pricing.convenience_fee_value,
        category_name: pricing.seat_categories?.name
      })));
    } else if (!pricingLoading && pricingData.length === 0) {
      console.warn('[SeatMap] No pricing data found for event:', eventId);
    }
  }, [pricingData, pricingLoading, pricingError, eventId]);

  // Enhanced debugging for seat layout data
  useEffect(() => {
    if (seatLayout && seatLayout.seats) {
      console.log('[SeatMap] Seat layout loaded:', {
        totalSeats: seatLayout.seats.length,
        sampleSeatStructure: seatLayout.seats.slice(0, 3).map(seat => ({
          id: seat.id,
          seat_number: seat.seat_number,
          row_name: seat.row_name,
          seat_category_id: seat.seat_category_id,
          seat_categories: seat.seat_categories
        }))
      });
    }
  }, [seatLayout]);

  // Debug booked seats with enhanced logging
  useEffect(() => {
    if (bookedSeats && bookedSeats.length > 0) {
      console.log('[SeatMap] Booked seats loaded:', {
        count: bookedSeats.length,
        seats: bookedSeats.map(seat => ({
          seat_number: seat.seat_number,
          booking_id: seat.booking_id,
          status: seat.status
        }))
      });
    }
  }, [bookedSeats]);

  // FIXED: Improved sold out detection with accurate counting using new helper functions
  useEffect(() => {
    if (seatLayout && bookedSeats) {
      // FIXED: Use helper functions for accurate counting
      const totalAvailableSeats = countAvailableSeats(seatLayout);
      const actuallyBookedSeats = countActualBookedSeats(seatLayout, bookedSeats);

      console.log('[SeatMap] FIXED Sold out check with helper functions:', {
        totalAvailableSeats,
        actuallyBookedSeats,
        bookedSeatsDataLength: bookedSeats.length,
        isSoldOut: actuallyBookedSeats >= totalAvailableSeats && totalAvailableSeats > 0
      });

      // FIXED: Only mark as sold out if we actually have seats and they're all booked
      const soldOut = totalAvailableSeats > 0 && actuallyBookedSeats >= totalAvailableSeats;
      setIsSoldOut(soldOut);

      if (soldOut && selectedSeats.length > 0) {
        // Clear any selected seats if event becomes sold out
        setSelectedSeats([]);
        if (onSeatSelect) {
          onSeatSelect([]);
        }
      }
    }
  }, [seatLayout, bookedSeats, selectedSeats.length, onSeatSelect]);

  // Show error for booked seats if any
  useEffect(() => {
    if (bookedSeatsError) {
      console.error('[SeatMap] Error loading booked seats:', bookedSeatsError);
      toast({
        title: "Warning",
        description: "Unable to load current seat availability. Some seats may appear available but could be booked.",
        variant: "destructive",
      });
    }
  }, [bookedSeatsError, toast]);

  // Show error for pricing data if any
  useEffect(() => {
    if (pricingError) {
      console.error('[SeatMap] Error loading pricing data:', pricingError);
      toast({
        title: "Warning",
        description: "Unable to load seat pricing. Default pricing will be used.",
        variant: "destructive",
      });
    }
  }, [pricingError, toast]);

  // Render different UI states based on loading/error/data conditions
  if (loading || bookedSeatsLoading || availabilityLoading || pricingLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading seat map, availability, and pricing...</p>
          {pricingLoading && <p className="text-sm text-gray-500 mt-2">Loading pricing data...</p>}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-red-600 mb-4">Error loading seat map</p>
          <p className="text-gray-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // If no seat layout, show ticket selection interface with availability info
  if (!seatLayout) {
    return <TicketSelectionInterface eventId={eventId} onTicketSelect={onSeatSelect} />;
  }

  // Show sold out message if all seats are booked
  if (isSoldOut) {
    const totalAvailableSeats = countAvailableSeats(seatLayout);
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-red-600">Event Sold Out</CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
            <h3 className="text-xl font-semibold text-red-800 mb-2">This Event is Sold Out</h3>
            <p className="text-red-700 mb-4">All available seats have been booked by other users.</p>
            <p className="text-gray-600 text-sm">Please check back later for any cancellations or consider other available events.</p>
          </div>
          
          {/* Show the seat map in read-only mode for reference */}
          <div className="mt-6 opacity-60">
            <h4 className="text-sm font-medium text-gray-700 mb-4">Seat Layout (All Booked)</h4>
            <div className="text-center mb-4">
              <div className="bg-gray-800 text-white py-2 px-4 rounded-lg inline-block text-sm">
                <span className="font-semibold">STAGE</span>
              </div>
            </div>
            
            {/* Show simplified sold out seat grid */}
            <div className="flex justify-center">
              <div className="text-xs text-gray-500 bg-gray-100 p-4 rounded-lg">
                <p>All {totalAvailableSeats} seats are booked</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleSeatClick = (seatId: string) => {
    const seat = seatLayout.seats.find(s => s.id === seatId);
    
    if (!seat || !seat.is_available || seat.is_blocked || !seat.seat_number || seat.seat_number.trim() === '') {
      console.log('[SeatMap] Seat not available:', seat?.seat_number || seatId);
      return;
    }

    // CRITICAL: Check if this exact seat is already booked - prevent double booking
    const isAlreadyBooked = isSeatBooked(seat, bookedSeats);
    if (isAlreadyBooked) {
      const exactSeatName = getSeatDisplayName(seat);
      console.log('[SeatMap] Preventing selection of booked seat:', exactSeatName);
      toast({
        title: "Seat Already Booked",
        description: `Seat ${exactSeatName} is already booked by another user and cannot be selected.`,
        variant: "destructive",
      });
      return; // STOP here - do not allow selection of booked seats
    }

    // Check if seat is currently selected by this user
    let newSelectedSeats: string[];
    if (selectedSeats.includes(seatId)) {
      // Deselect the seat
      newSelectedSeats = selectedSeats.filter(id => id !== seatId);
    } else {
      // Select the seat (only if not booked)
      newSelectedSeats = [...selectedSeats, seatId];
    }

    console.log('[SeatMap] Seat selection updated:', {
      seatId,
      seatName: getSeatDisplayName(seat),
      wasSelected: selectedSeats.includes(seatId),
      newSelectionCount: newSelectedSeats.length
    });

    setSelectedSeats(newSelectedSeats);

    if (onSeatSelect) {
      const selectedSeatObjects = newSelectedSeats.map(id => {
        const seatData = seatLayout.seats.find(s => s.id === id);
        
        // Enhanced pricing calculation with better error handling
        console.log('[SeatMap] Getting pricing for seat:', {
          seatId: id,
          seatData: seatData,
          pricingDataAvailable: pricingData.length > 0
        });

        const pricing = getSeatPricing(seatData, pricingData);
        
        console.log('[SeatMap] Seat pricing calculation result:', {
          seatNumber: seatData?.seat_number,
          categoryId: seatData?.seat_category_id,
          categoryName: seatData?.seat_categories?.name,
          basePrice: pricing.basePrice,
          convenienceFee: pricing.convenienceFee,
          totalPrice: pricing.totalPrice,
          pricingDataCount: pricingData.length
        });
        
        // Return in the exact format needed for database insertion
        return {
          price: pricing.basePrice,
          quantity: "1",
          seat_number: `${seatData?.row_name || ''}${seatData?.seat_number || ''}`,
          seat_category: seatData?.seat_categories?.name || 'General',
          total_quantity: "N/A",
          available_quantity: "N/A",
          // Additional data for checkout/payment display
          id,
          row_name: seatData?.row_name || '',
          category_name: seatData?.seat_categories?.name || 'General',
          seat_categories: seatData?.seat_categories,
          convenience_fee: pricing.convenienceFee,
          total_price: pricing.totalPrice
        };
      });
      onSeatSelect(selectedSeatObjects);
    }
  };

  const getSeatButtonClass = (seat: any) => {
    const isSelected = selectedSeats.includes(seat.id);
    const isBookedSeat = isSeatBooked(seat, bookedSeats);
    
    // Handle blocked seats (invisible)
    if (seat.is_blocked) {
      return 'invisible';
    }
    
    // Handle empty/passage seats
    if (!seat.seat_number || seat.seat_number.trim() === '') {
      return 'invisible';
    }
    
    // FIXED: Only treat as unavailable if it's actually booked by a user
    // Don't treat seats that are just marked as unavailable as "booked"
    if (isBookedSeat) {
      return 'bg-red-500 text-white cursor-not-allowed border-2 border-red-700 opacity-75 pointer-events-none';
    }
    
    // FIXED: Show unavailable seats (passages, etc.) as invisible, not as booked
    if (!seat.is_available) {
      return 'invisible';
    }
    
    // Handle selected seats
    if (isSelected) {
      return 'bg-blue-600 text-white hover:bg-blue-700 border-2 border-blue-800';
    }
    
    // Available seats
    return 'text-white hover:opacity-80 border border-gray-300 cursor-pointer transform hover:scale-105 transition-all duration-200';
  };

  const getSeatBackgroundColor = (seat: any) => {
    const isSelected = selectedSeats.includes(seat.id);
    const isBookedSeat = isSeatBooked(seat, bookedSeats);
    
    if (!seat.seat_number || seat.seat_number.trim() === '') {
      return 'transparent';
    }
    
    // FIXED: Only show as booked (red) if actually booked by a user
    if (isBookedSeat) {
      return '#EF4444'; // Red for booked
    }
    
    // FIXED: Show unavailable seats as transparent, not red
    if (!seat.is_available) {
      return 'transparent';
    }
    
    if (isSelected) {
      return '#2563EB'; // Blue for selected
    }
    
    return seat.seat_categories?.color || '#4ECDC4';
  };

  // FIXED: Create proper seat grid based on actual seat positions with improved passage handling
  const createSeatGrid = () => {
    if (!seatLayout || !seatLayout.seats || seatLayout.seats.length === 0) {
      return [];
    }

    // Find the actual dimensions of the seat layout
    const maxRow = Math.max(...seatLayout.seats.map(s => s.y_position || 0));
    const maxCol = Math.max(...seatLayout.seats.map(s => s.x_position || 0));
    
    console.log('[SeatMap] Grid dimensions:', { maxRow, maxCol, totalSeats: seatLayout.seats.length });

    // Create a 2D grid structure with better passage handling
    const grid = [];
    for (let row = 0; row <= maxRow; row++) {
      const rowSeats = [];
      for (let col = 0; col <= maxCol; col++) {
        // Find seat at this position
        const seat = seatLayout.seats.find(s => s.y_position === row && s.x_position === col);
        
        // If no seat found at this position, it's either a passage or empty space
        if (!seat) {
          rowSeats.push(null);
        } else {
          rowSeats.push(seat);
        }
      }
      
      // Only add rows that have at least one actual seat (not just passages)
      const hasRealSeats = rowSeats.some(seat => 
        seat !== null && 
        seat.seat_number && 
        seat.seat_number.trim() !== '' && 
        !seat.is_blocked
      );
      
      if (hasRealSeats) {
        grid.push({
          rowIndex: row,
          seats: rowSeats
        });
      }
    }

    console.log('[SeatMap] Created grid with', grid.length, 'rows');
    return grid;
  };

  const seatGrid = createSeatGrid();

  const uniqueCategories = seatLayout && seatLayout.seats 
    ? [...new Map(
        seatLayout.seats
          .filter(seat => 
            seat.seat_categories && 
            !seat.is_blocked && 
            seat.is_available && 
            seat.seat_number && 
            seat.seat_number.trim() !== ''
          )
          .map(seat => [seat.seat_categories.id, seat.seat_categories])
      ).values()]
    : [];

  // FIXED: Count booked seats with enhanced accuracy using helper functions
  const totalAvailableSeats = countAvailableSeats(seatLayout);
  const exactlyBookedSeats = countActualBookedSeats(seatLayout, bookedSeats);

  console.log('[SeatMap] FIXED: Rendering with corrected booking prevention logic:', {
    totalSeats: seatLayout.seats.length,
    totalAvailableSeats,
    bookedSeatsData: bookedSeats.length,
    exactlyBookedSeats,
    selectedSeatsCount: selectedSeats.length,
    isSoldOut,
    pricingDataCount: pricingData.length
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Your Seats</CardTitle>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-sm text-gray-600">
          <p>Selected: {selectedSeats.length} seats</p>
          <p>Available: {totalAvailableSeats - exactlyBookedSeats} / {totalAvailableSeats} seats</p>
          <p>Booked: {exactlyBookedSeats} seats</p>
          {bookedSeatsLoading && <p className="text-orange-600">Checking availability...</p>}
          {pricingLoading && <p className="text-blue-600">Loading pricing...</p>}
          {exactlyBookedSeats >= totalAvailableSeats && totalAvailableSeats > 0 && (
            <Badge variant="destructive" className="font-semibold">SOLD OUT</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Stage */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="bg-gray-800 text-white py-2 px-4 sm:py-3 sm:px-8 rounded-lg inline-block text-sm sm:text-base">
            <span className="font-semibold">STAGE</span>
          </div>
        </div>

        {/* FIXED: Seat Grid Layout with improved passage handling */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="w-full max-w-4xl overflow-x-auto">
            <div className="space-y-2 min-w-max mx-auto">
              {seatGrid.map((gridRow) => (
                <div key={gridRow.rowIndex} className="flex justify-center items-center space-x-1">
                  {/* Seats in this row */}
                  {gridRow.seats.map((seat, colIndex) => {
                    // FIXED: Handle null seats (passages) properly
                    if (!seat) {
                      return (
                        <div 
                          key={`passage-${gridRow.rowIndex}-${colIndex}`} 
                          className="w-12 h-12"
                        />
                      );
                    }

                    // Skip blocked seats completely
                    if (seat.is_blocked) {
                      return (
                        <div 
                          key={`blocked-${seat.id || `${gridRow.rowIndex}-${colIndex}`}`} 
                          className="w-12 h-12"
                        />
                      );
                    }

                    // FIXED: Handle empty seats (passages) with proper seat number check
                    if (!seat.seat_number || seat.seat_number.trim() === '') {
                      return (
                        <div 
                          key={`empty-${seat.id || `${gridRow.rowIndex}-${colIndex}`}`} 
                          className="w-12 h-12"
                        />
                      );
                    }

                    // FIXED: Show unavailable seats as passages, not as clickable seats
                    if (!seat.is_available && !isSeatBooked(seat, bookedSeats)) {
                      return (
                        <div 
                          key={`unavailable-${seat.id || `${gridRow.rowIndex}-${colIndex}`}`} 
                          className="w-12 h-12"
                        />
                      );
                    }

                    const pricing = getSeatPricing(seat, pricingData);
                    const categoryName = seat.seat_categories?.name || 'General';
                    const isBooked = isSeatBooked(seat, bookedSeats);
                    const seatDisplayName = getSeatDisplayName(seat);
                    
                    return (
                      <div key={seat.id} className="w-12 h-12 relative">
                        <Button
                          size="sm"
                          className={`w-12 h-12 text-xs p-0 ${getSeatButtonClass(seat)}`}
                          style={{ backgroundColor: getSeatBackgroundColor(seat) }}
                          onClick={() => handleSeatClick(seat.id)}
                          title={isBooked ? `${seatDisplayName} - BOOKED - Cannot be selected` : `${seatDisplayName} - ${categoryName} - ₹${pricing.basePrice} (+ ₹${pricing.convenienceFee} convenience fee at checkout)`}
                          disabled={isBooked}
                        >
                          {isBooked ? (
                            <X className="w-3 h-3" />
                          ) : (
                            // Display row name + seat number inside the button
                            seatDisplayName
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-4">
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-300 border rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-600 border rounded"></div>
              <span>Selected</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 border rounded"></div>
              <span>Booked</span>
            </div>
          </div>

          {/* Seat Categories with Base Price */}
          {uniqueCategories.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-center mb-2">Seat Categories</h4>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                {uniqueCategories.map((category) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: category.color }}
                    />
                    <span>{category.name} - ₹{category.base_price}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing Status Indicator */}
          <div className="text-center">
            {pricingLoading && (
              <p className="text-sm text-blue-600">Loading seat pricing...</p>
            )}
            {pricingError && (
              <p className="text-sm text-red-600">Error loading pricing - using defaults</p>
            )}
            {!pricingLoading && !pricingError && pricingData.length === 0 && (
              <p className="text-sm text-yellow-600">No pricing data found - using defaults</p>
            )}
            {!pricingLoading && !pricingError && pricingData.length > 0 && (
              <p className="text-sm text-green-600">Pricing loaded from database</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SeatMap;
