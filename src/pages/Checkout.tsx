
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar, MapPin, IndianRupee, CreditCard, Ticket } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, isValid } from 'date-fns';

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Extract data from location state
  const { 
    event, 
    selectedSeats, 
    selectedGeneralTickets, 
    quantity, 
    basePrice, 
    convenienceFee, 
    totalPrice, 
    eventDate, 
    eventOccurrenceId 
  } = location.state || {};
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    address: '',
    state: ''
  });
  const [loadingUserData, setLoadingUserData] = useState(true);

  // Indian states list
  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
    'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 
    'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 
    'Lakshadweep', 'Puducherry'
  ];

  // Fetch user profile data from database and set event state as default
  useEffect(() => {
    const fetchUserProfileAndEventState = async () => {
      if (!user?.id) {
        setLoadingUserData(false);
        return;
      }

      try {
        // First, get the event's venue state
        let eventState = '';
        if (event?.venue_id) {
          const { data: venueData, error: venueError } = await supabase
            .from('venues')
            .select('state')
            .eq('id', event.venue_id)
            .single();

          if (!venueError && venueData?.state) {
            eventState = venueData.state;
            console.log('[Checkout] Event venue state:', eventState);
          }
        }

        // Then fetch user profile
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('first_name, last_name, phone, address, state')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching user profile:', error);
        }

        // Set form data with priority: event state > user profile state > empty
        const defaultState = eventState || profile?.state || '';
        
        setFormData(prev => ({
          ...prev,
          firstName: profile?.first_name || '',
          lastName: profile?.last_name || '',
          phone: profile?.phone || '',
          address: profile?.address || '',
          state: defaultState
        }));

        console.log('[Checkout] Set default state:', defaultState, {
          eventState,
          userProfileState: profile?.state,
          finalState: defaultState
        });

      } catch (err) {
        console.error('Unexpected error fetching profile:', err);
      } finally {
        setLoadingUserData(false);
      }
    };

    fetchUserProfileAndEventState();
  }, [user?.id, event?.venue_id]);

  if (!event) {
    navigate('/events');
    return null;
  }

  // FIXED: Extract actual quantity from seat_number (e.g., "General x4" -> 4)
  const getActualQuantityFromSeat = (seat: any) => {
    if (seat.seat_number && typeof seat.seat_number === 'string') {
      const match = seat.seat_number.match(/x(\d+)$/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    return 1; // fallback to 1 if no quantity found
  };

  // FIXED: Calculate correct pricing from actual seat/ticket data
  const calculatePricingFromData = () => {
    let calculatedBasePrice = 0;
    let calculatedConvenienceFee = 0;
    let calculatedTotalPrice = 0;
    let actualTicketCount = 0;

    // Handle selected general tickets (recurring events)
    if (selectedGeneralTickets && selectedGeneralTickets.length > 0) {
      selectedGeneralTickets.forEach((ticket: any) => {
        const ticketBasePrice = ticket.basePrice * ticket.quantity;
        const ticketConvenienceFee = ticket.convenienceFee * ticket.quantity;
        
        calculatedBasePrice += ticketBasePrice;
        calculatedConvenienceFee += ticketConvenienceFee;
        actualTicketCount += ticket.quantity;
      });
      calculatedTotalPrice = calculatedBasePrice + calculatedConvenienceFee;
    }
    // Handle selected seats
    else if (selectedSeats && selectedSeats.length > 0) {
      selectedSeats.forEach((seat: any) => {
        const seatQuantity = getActualQuantityFromSeat(seat);
        actualTicketCount += seatQuantity;
        
        // Use total_price if available, otherwise calculate from individual components
        if (seat.total_price) {
          calculatedTotalPrice += seat.total_price;
          // Try to extract base price and convenience fee from total
          const seatBasePrice = seat.price || seat.seat_categories?.base_price || 0;
          const seatConvenienceFee = seat.convenience_fee || 0;
          
          calculatedBasePrice += seatBasePrice * seatQuantity;
          calculatedConvenienceFee += seatConvenienceFee * seatQuantity;
        } else {
          // Calculate from individual components
          const seatBasePrice = seat.price || seat.seat_categories?.base_price || 0;
          const seatConvenienceFee = seat.convenience_fee || 0;
          
          calculatedBasePrice += seatBasePrice * seatQuantity;
          calculatedConvenienceFee += seatConvenienceFee * seatQuantity;
        }
      });
      
      // If total wasn't calculated from seat.total_price, calculate it now
      if (calculatedTotalPrice === 0) {
        calculatedTotalPrice = calculatedBasePrice + calculatedConvenienceFee;
      }
    }
    // Fallback to passed values
    else {
      actualTicketCount = quantity || 1;
      calculatedBasePrice = basePrice || 0;
      calculatedConvenienceFee = convenienceFee || 0;
      calculatedTotalPrice = totalPrice || calculatedBasePrice + calculatedConvenienceFee;
    }

    return {
      basePrice: calculatedBasePrice,
      convenienceFee: calculatedConvenienceFee,
      totalPrice: calculatedTotalPrice,
      ticketCount: actualTicketCount
    };
  };

  const pricingData = calculatePricingFromData();

  console.log('[Checkout] FIXED Pricing calculation:', {
    isRecurring: event.is_recurring,
    originalQuantity: quantity,
    calculatedTicketCount: pricingData.ticketCount,
    originalBasePrice: basePrice,
    originalConvenienceFee: convenienceFee,
    originalTotalPrice: totalPrice,
    calculatedBasePrice: pricingData.basePrice,
    calculatedConvenienceFee: pricingData.convenienceFee,
    calculatedTotalPrice: pricingData.totalPrice,
    selectedGeneralTickets: selectedGeneralTickets?.length || 0,
    selectedSeats: selectedSeats?.length || 0,
    dataSource: selectedGeneralTickets?.length > 0 ? 'selectedGeneralTickets' : 
                selectedSeats?.length > 0 ? 'selectedSeats' : 'fallback'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleStateChange = (state: string) => {
    setFormData({
      ...formData,
      state: state
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.firstName || !formData.email || !formData.phone) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields (First Name, Email, and Phone)",
        variant: "destructive",
      });
      return;
    }

    console.log('[Checkout] Navigating to payment with FIXED values:', {
      eventDate: eventDate,
      eventOccurrenceId: eventOccurrenceId,
      event: event.name,
      quantity: pricingData.ticketCount,
      basePrice: pricingData.basePrice,
      convenienceFee: pricingData.convenienceFee,
      totalPrice: pricingData.totalPrice
    });

    // Navigate to payment page with corrected pricing information
    navigate('/payment', {
      state: {
        event,
        selectedSeats,
        selectedGeneralTickets,
        quantity: pricingData.ticketCount,
        basePrice: pricingData.basePrice,
        convenienceFee: pricingData.convenienceFee,
        totalPrice: pricingData.totalPrice,
        customerInfo: formData,
        eventDate: eventDate,
        eventOccurrenceId: eventOccurrenceId
      }
    });
  };

  // Get display date and time for the event - FIXED FOR RECURRING EVENTS
  const getDisplayDateTime = () => {
    console.log('[Checkout] getDisplayDateTime - event data:', {
      isRecurring: event.is_recurring,
      eventTime: event.event_time,
      startDatetime: event.start_datetime,
      eventDate: eventDate
    });

    if (event.is_recurring && eventDate && event.event_time) {
      // For recurring events: ALWAYS use occurrence date + main event's event_time
      const dateStr = typeof eventDate === 'string' ? eventDate : format(eventDate, 'yyyy-MM-dd');
      const combinedDateTime = new Date(`${dateStr}T${event.event_time}`);
      console.log('[Checkout] Recurring event combined datetime:', combinedDateTime);
      
      // Validate the combined datetime
      if (isValid(combinedDateTime)) {
        return combinedDateTime;
      } else {
        console.warn('[Checkout] Invalid combined datetime, falling back to eventDate only');
        return new Date(eventDate);
      }
    } else if (eventDate) {
      // Use passed eventDate for non-recurring events
      const eventDateTime = new Date(eventDate);
      return isValid(eventDateTime) ? eventDateTime : new Date();
    } else if (event.start_datetime) {
      // Fallback to event start_datetime
      const startDateTime = new Date(event.start_datetime);
      return isValid(startDateTime) ? startDateTime : new Date();
    } else {
      // Final fallback
      return new Date();
    }
  };

  const displayDateTime = getDisplayDateTime();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Logo */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <img 
                src="/lovable-uploads/749dfa90-a1d6-4cd0-87ad-4fec3daeb6d2.png"
                alt="Ticketooz"
                className="h-10 w-auto"
                style={{ maxHeight: 48, maxWidth: 180 }}
              />
              <h1 className="sr-only">Ticketooz Events</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="text-gray-600 mt-2">Complete your booking details</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Booking Information</CardTitle>
                <CardDescription>
                  {loadingUserData ? 'Loading your details...' : 'Please review and update your details to complete the booking'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">First Name *</label>
                      <Input
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="Enter first name"
                        disabled={loadingUserData}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Last Name</label>
                      <Input
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Enter last name (optional)"
                        disabled={loadingUserData}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <Input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter email address"
                      disabled={loadingUserData}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Phone Number *</label>
                    <Input
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                      disabled={loadingUserData}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      State 
                      {event?.venues?.name && (
                        <span className="text-xs text-blue-600 ml-1">
                          (Event Location State pre-selected)
                        </span>
                      )}
                    </label>
                    <Select value={formData.state} onValueChange={handleStateChange} disabled={loadingUserData}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your state" />
                      </SelectTrigger>
                      <SelectContent>
                        {indianStates.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Address</label>
                    <Input
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Enter your address"
                      disabled={loadingUserData}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    disabled={loadingUserData}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {loadingUserData ? 'Loading...' : 'Proceed to Payment'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Event Details */}
                  <div>
                    <h3 className="font-semibold text-lg">{event.name}</h3>
                    <div className="space-y-2 mt-2 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {isValid(displayDateTime) ? (
                            <>
                              {format(displayDateTime, 'PPP')} at {format(displayDateTime, 'p')}
                              {event.is_recurring && event.event_time && (
                                <span className="text-xs text-blue-600 ml-1">(Main Event Time)</span>
                              )}
                            </>
                          ) : (
                            'Date & Time TBD'
                          )}
                        </span>
                      </div>
                      {event.is_recurring && eventOccurrenceId && (
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs">
                            Recurring Event - Selected Date
                          </Badge>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4" />
                        <span>{event.venues?.name || 'Venue TBD'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Selected Tickets Section */}
                  {selectedGeneralTickets && selectedGeneralTickets.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Ticket className="w-4 h-4" />
                        Selected Tickets
                      </h4>
                      <div className="space-y-3">
                        {selectedGeneralTickets.map((ticket: any, index: number) => {
                          const totalTicketPrice = ticket.basePrice * ticket.quantity;
                          const totalConvenienceFee = ticket.convenienceFee * ticket.quantity;
                          const totalCategoryPrice = totalTicketPrice + totalConvenienceFee;
                          
                          return (
                            <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="w-3 h-3 rounded bg-green-500 flex-shrink-0" />
                                    <span className="font-medium text-base text-green-800">{ticket.categoryName}</span>
                                  </div>
                                  <div className="text-sm text-gray-600 space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span>Quantity:</span>
                                      <span className="font-medium">{ticket.quantity}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span>Base Price:</span>
                                      <span>₹{ticket.basePrice} × {ticket.quantity} = ₹{totalTicketPrice}</span>
                                    </div>
                                    {ticket.convenienceFee > 0 && (
                                      <div className="flex items-center justify-between">
                                        <span>Convenience fee:</span>
                                        <span>₹{ticket.convenienceFee} × {ticket.quantity} = ₹{totalConvenienceFee}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="border-t border-green-300 pt-2 mt-2">
                                <div className="flex justify-between items-center font-medium">
                                  <span>Category Total:</span>
                                  <span className="text-green-600">₹{totalCategoryPrice}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Enhanced Selected Seats Display with correct pricing */}
                  {selectedSeats && selectedSeats.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Ticket className="w-4 h-4" />
                        Selected Seats
                      </h4>
                      <div className="space-y-2">
                         {selectedSeats.map((seat: any, index: number) => {
                           const actualQuantity = getActualQuantityFromSeat(seat);
                           const seatDisplay = seat.seat_number || seat.id;
                           const category = seat.seat_categories?.name || seat.category_name || seat.category || 'General';
                           
                           // Use the seat's actual pricing data
                           const seatBasePrice = seat.price || seat.seat_categories?.base_price || 0;
                           const seatConvenienceFee = seat.convenience_fee || 0;
                           const seatTotalPrice = seat.total_price || ((seatBasePrice + seatConvenienceFee) * actualQuantity);
                           
                            return (
                              <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center space-x-2 flex-1">
                                    <div className="w-3 h-3 rounded bg-blue-500 flex-shrink-0" />
                                    <div className="flex-1">
                                      <div className="font-medium text-blue-800">{category}</div>
                                      <div className="text-gray-600 text-xs space-y-1">
                                        <div>Seat: {seatDisplay} • Quantity: {actualQuantity}</div>
                                        <div>Base: ₹{seatBasePrice} × {actualQuantity} = ₹{seatBasePrice * actualQuantity}</div>
                                        {seatConvenienceFee > 0 && (
                                          <div>Convenience: ₹{seatConvenienceFee} × {actualQuantity} = ₹{seatConvenienceFee * actualQuantity}</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium text-blue-600">₹{seatTotalPrice}</p>
                                  </div>
                                </div>
                              </div>
                            );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Show correct ticket count */}
                  <div className="flex justify-between items-center">
                    <span>Total Tickets</span>
                    <span className="font-medium">{pricingData.ticketCount}</span>
                  </div>

                  {/* Price Breakdown */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span>Base Price</span>
                      <span>₹{pricingData.basePrice.toFixed(2)}</span>
                    </div>
                    {pricingData.convenienceFee > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span>Convenience Fee (incl. GST)</span>
                        <span>₹{pricingData.convenienceFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t pt-2">
                      <div className="flex justify-between items-center text-lg font-semibold">
                        <span>Total Amount</span>
                        <div className="flex items-center space-x-1">
                          <IndianRupee className="w-5 h-5 text-green-600" />
                          <span className="text-green-600">₹{pricingData.totalPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
