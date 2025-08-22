import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Lock, IndianRupee, Smartphone, Wallet, TestTube } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { validateSeatBookingData } from '@/utils/seatBookingUtils';
import { bookGeneralAdmission } from '@/lib/bookGeneralAdmission';
import { checkAndUpdateSeatMapSoldOutStatus } from '@/utils/seatMapSoldOutUtils';

// Declare Razorpay on window object
declare global {
  interface Window {
    Razorpay: any;
  }
}

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Extract eventDate and eventOccurrenceId from state
  const { 
    event, 
    selectedSeats, 
    selectedGeneralTickets,
    quantity, 
    totalPrice, 
    basePrice, 
    convenienceFee, 
    customerInfo, 
    eventDate, 
    eventOccurrenceId 
  } = location.state || {};
  
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'demo'>('razorpay');
  const [paymentSummary, setPaymentSummary] = useState<any>(null);

  // Prevent access if not coming from booking flow
  if (!event || !customerInfo) {
    navigate('/events');
    return null;
  }

  // CORRECTED: Fixed ticket count calculation with proper quantity parsing
  const calculateActualTicketCount = () => {
    console.log('=== FIXED TICKET COUNT CALCULATION ===');
    console.log('selectedGeneralTickets:', selectedGeneralTickets);
    console.log('selectedSeats:', selectedSeats);
    console.log('quantity:', quantity);
    
    // For general admission tickets, sum up all quantities across all categories
    if (selectedGeneralTickets && selectedGeneralTickets.length > 0) {
      console.log('Processing general admission tickets...');
      
      let totalQuantity = 0;
      selectedGeneralTickets.forEach((ticket, index) => {
        console.log(`Ticket ${index}:`, ticket);
        console.log(`  - categoryName: ${ticket.categoryName}`);
        console.log(`  - quantity (raw): ${ticket.quantity}`);
        console.log(`  - quantity type: ${typeof ticket.quantity}`);
        
        // FIXED: More robust quantity parsing
        let parsedQuantity = 0;
        
        if (typeof ticket.quantity === 'string') {
          // Remove any non-numeric characters and parse
          const cleanQuantity = ticket.quantity.replace(/[^0-9]/g, '');
          parsedQuantity = parseInt(cleanQuantity, 10);
          console.log(`  - cleaned string "${ticket.quantity}" -> "${cleanQuantity}" -> ${parsedQuantity}`);
        } else if (typeof ticket.quantity === 'number') {
          parsedQuantity = ticket.quantity;
          console.log(`  - already number: ${parsedQuantity}`);
        }
        
        // Ensure we have a valid number
        if (isNaN(parsedQuantity) || parsedQuantity < 0) {
          parsedQuantity = 0;
          console.log(`  - invalid quantity, using 0`);
        }
        
        console.log(`  - final parsed quantity: ${parsedQuantity}`);
        totalQuantity += parsedQuantity;
        console.log(`  - running total: ${totalQuantity}`);
      });
      
      console.log(`CORRECTED: Final total quantity from selectedGeneralTickets: ${totalQuantity}`);
      return totalQuantity;
    }
    
    // For selected seats, count the actual quantity from seat data
    if (selectedSeats && selectedSeats.length > 0) {
      let totalSeatQuantity = 0;
      selectedSeats.forEach((seat, index) => {
        // Extract quantity from seat data - could be in seat.quantity, or parsed from seat_number
        let seatQuantity = 1; // default to 1 seat
        
        if (seat.quantity && typeof seat.quantity === 'number') {
          seatQuantity = seat.quantity;
        } else if (seat.quantity && typeof seat.quantity === 'string') {
          const parsedQty = parseInt(seat.quantity, 10);
          if (!isNaN(parsedQty) && parsedQty > 0) {
            seatQuantity = parsedQty;
          }
        } else if (seat.seat_number && typeof seat.seat_number === 'string') {
          // Try to extract quantity from seat_number like "General x4"
          const match = seat.seat_number.match(/x(\d+)$/);
          if (match) {
            const extractedQty = parseInt(match[1], 10);
            if (!isNaN(extractedQty) && extractedQty > 0) {
              seatQuantity = extractedQty;
            }
          }
        }
        
        totalSeatQuantity += seatQuantity;
        console.log(`Seat ${index}: quantity = ${seatQuantity}, running total = ${totalSeatQuantity}`);
      });
      
      console.log(`Selected seats total quantity: ${totalSeatQuantity}`);
      return totalSeatQuantity;
    }
    
    // Fallback to passed quantity
    const fallbackQuantity = parseInt(quantity) || 1;
    console.log(`Using fallback quantity: ${fallbackQuantity}`);
    return fallbackQuantity;
  };

  const actualTicketCount = calculateActualTicketCount();
  console.log('=== CORRECTED FINAL TICKET COUNT ===', actualTicketCount);

  // Enhanced payment summary calculation for recurring events
  useEffect(() => {
    const calculatePaymentSummary = async () => {
      if (!event || !eventOccurrenceId) return;

      try {
        // For recurring events with selectedGeneralTickets, fetch accurate pricing
        if (selectedGeneralTickets && selectedGeneralTickets.length > 0) {
          const categoryBreakdown = await Promise.all(
            selectedGeneralTickets.map(async (ticket: any) => {
              // Get occurrence category data for accurate pricing
              const { data: occurrenceCategory } = await supabase
                .from('occurrence_ticket_categories')
                .select('*')
                .eq('occurrence_id', eventOccurrenceId)
                .eq('category_name', ticket.categoryName)
                .single();

              const categoryPrice = occurrenceCategory?.base_price || ticket.basePrice;
              const categoryConvenienceFee = occurrenceCategory?.convenience_fee || ticket.convenienceFee;
              
              // FIXED: Consistent quantity parsing
              let parsedQuantity = 0;
              if (typeof ticket.quantity === 'string') {
                const cleanQuantity = ticket.quantity.replace(/[^0-9]/g, '');
                parsedQuantity = parseInt(cleanQuantity, 10);
              } else if (typeof ticket.quantity === 'number') {
                parsedQuantity = ticket.quantity;
              }
              
              if (isNaN(parsedQuantity) || parsedQuantity < 0) {
                parsedQuantity = 0;
              }
              
              const categoryTotal = (categoryPrice + categoryConvenienceFee) * parsedQuantity;

              return {
                categoryName: ticket.categoryName,
                quantity: parsedQuantity,
                basePrice: categoryPrice,
                convenienceFee: categoryConvenienceFee,
                totalPrice: categoryTotal
              };
            })
          );

          const summaryTotalBase = categoryBreakdown.reduce((sum, cat) => sum + (cat.basePrice * cat.quantity), 0);
          const summaryTotalConvenience = categoryBreakdown.reduce((sum, cat) => sum + (cat.convenienceFee * cat.quantity), 0);
          const summaryTotalAmount = summaryTotalBase + summaryTotalConvenience;

          setPaymentSummary({
            categoryBreakdown,
            totalBasePrice: summaryTotalBase,
            totalConvenienceFee: summaryTotalConvenience,
            totalAmount: summaryTotalAmount,
            totalTickets: categoryBreakdown.reduce((sum, cat) => sum + cat.quantity, 0),
            isRecurring: true
          });
        } else {
          // For regular events or seat-based events
          setPaymentSummary({
            totalBasePrice: basePrice || 0,
            totalConvenienceFee: convenienceFee || 0,
            totalAmount: totalPrice || (basePrice || 0) + (convenienceFee || 0),
            totalTickets: actualTicketCount,
            isRecurring: false
          });
        }
      } catch (error) {
        console.error('Error calculating payment summary:', error);
        // Fallback to passed values
        setPaymentSummary({
          totalBasePrice: basePrice || 0,
          totalConvenienceFee: convenienceFee || 0,
          totalAmount: totalPrice || (basePrice || 0) + (convenienceFee || 0),
          totalTickets: actualTicketCount,
          isRecurring: false
        });
      }
    };

    calculatePaymentSummary();
  }, [event, eventOccurrenceId, selectedGeneralTickets, basePrice, convenienceFee, totalPrice]);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleDemoPayment = async () => {
    setProcessing(true);

    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update user profile with customer information if user is logged in
      if (user?.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            first_name: customerInfo.firstName,
            last_name: customerInfo.lastName,
            phone: customerInfo.phone,
            state: customerInfo.state,
            address: customerInfo.address,
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }

      // CRITICAL FIX: Use eventDate for recurring events, event.start_datetime for regular events
      const bookingEventDate = eventDate || event.start_datetime;
      console.log('[Payment] Demo - Using booking date:', bookingEventDate);

      // For general admission events, use the bookGeneralAdmission function
      if (selectedGeneralTickets && selectedGeneralTickets.length > 0) {
        console.log('[Payment] Demo - Using bookGeneralAdmission function for general admission');
        
        try {
          const { bookGeneralAdmission } = await import('@/lib/bookGeneralAdmission');
          
          // Convert selectedGeneralTickets format to bookGeneralAdmission format with FIXED quantity parsing
          const ticketsForBooking = selectedGeneralTickets.map((ticket: any) => {
            let parsedQuantity = 0;
            if (typeof ticket.quantity === 'string') {
              const cleanQuantity = ticket.quantity.replace(/[^0-9]/g, '');
              parsedQuantity = parseInt(cleanQuantity, 10);
            } else if (typeof ticket.quantity === 'number') {
              parsedQuantity = ticket.quantity;
            }
            
            if (isNaN(parsedQuantity) || parsedQuantity < 0) {
              parsedQuantity = 0;
            }
            
            return {
              categoryName: ticket.categoryName,
              quantity: parsedQuantity,
              basePrice: ticket.basePrice,
              convenienceFee: ticket.convenienceFee
            };
          });

          const customerData = {
            firstName: customerInfo.firstName,
            lastName: customerInfo.lastName,
            email: customerInfo.email,
            phone: customerInfo.phone,
            address: customerInfo.address || '',
            state: customerInfo.state || ''
          };

          console.log('[Payment] Demo - Calling bookGeneralAdmission with:', {
            eventId: event.id,
            tickets: ticketsForBooking,
            customer: customerData,
            totalPrice,
            basePrice,
            convenienceFee,
            eventOccurrenceId
          });

          // Use the dedicated function for general admission booking
          const booking = await bookGeneralAdmission(
            event.id,
            ticketsForBooking,
            customerData,
            totalPrice,
            basePrice,
            convenienceFee || 0,
            eventOccurrenceId
          );

          console.log('[Payment] Demo - General admission booking created:', booking);

          toast({
            title: "Demo Payment Successful!",
            description: "Your test booking has been confirmed. This was a demo transaction.",
          });

          // Fetch occurrence details for recurring events if needed
          let occurrenceData = null;
          if (eventOccurrenceId && event.is_recurring) {
            try {
              const { data: occurrence } = await supabase
                .from('event_occurrences')
                .select('occurrence_date, occurrence_time')
                .eq('id', eventOccurrenceId)
                .single();
              occurrenceData = occurrence;
            } catch (error) {
              console.error('Error fetching occurrence data:', error);
            }
          }

          // Navigate to success page
          navigate('/booking-success', {
            state: {
              booking,
              event,
              selectedSeats,
              selectedGeneralTickets,
              customerInfo,
              totalPrice,
              basePrice,
              convenienceFee: convenienceFee || 0,
              payment: {
                id: 'demo_payment_' + Date.now(),
                method: 'demo',
                amount: totalPrice,
              },
              eventDate: bookingEventDate,
              eventOccurrenceId: eventOccurrenceId,
              occurrenceDate: occurrenceData?.occurrence_date,
              occurrenceTime: occurrenceData?.occurrence_time
            }
          });

        } catch (bookingError) {
          console.error('[Payment] Demo - Booking creation failed:', bookingError);
          throw new Error(`Booking creation failed: ${bookingError.message}`);
        }

      } else {
        // Handle regular seat-based events
        console.log('[Payment] Demo - Creating regular seat-based booking');
        
        const bookingData = {
          event_id: event.id,
          event_occurrence_id: eventOccurrenceId || null,
          quantity: actualTicketCount,
          total_price: totalPrice,
          convenience_fee: convenienceFee || 0,
          customer_name: `${customerInfo.firstName} ${customerInfo.lastName}`,
          customer_email: customerInfo.email,
          customer_phone: customerInfo.phone,
          customer_state: customerInfo.state || '',
          customer_address: customerInfo.address || '',
          seat_numbers: selectedSeats || [],
          user_id: user?.id || null,
          status: "Confirmed" as const,
          booking_date: new Date(bookingEventDate).toISOString(),
        };

        console.log('[Payment] Demo - Creating regular booking:', bookingData);

        const { data: booking, error: bookingError } = await supabase
          .from("bookings")
          .insert(bookingData)
          .select()
          .single();

        if (bookingError) {
          console.error("Error creating demo booking:", bookingError);
          throw new Error(`Failed to create demo booking: ${bookingError.message}`);
        }

        console.log('[Payment] Demo - Regular booking created successfully:', booking);

        // Check and update sold-out status for seat map events
        if (event.layout_type === 'seatmap') {
          try {
            await checkAndUpdateSeatMapSoldOutStatus(event.id);
          } catch (error) {
            console.error('[Payment] Error checking sold-out status:', error);
          }
        }

        toast({
          title: "Demo Payment Successful!",
          description: "Your test booking has been confirmed. This was a demo transaction.",
        });

        // Fetch occurrence details for recurring events if needed
        let occurrenceData = null;
        if (eventOccurrenceId && event.is_recurring) {
          try {
            const { data: occurrence } = await supabase
              .from('event_occurrences')
              .select('occurrence_date, occurrence_time')
              .eq('id', eventOccurrenceId)
              .single();
            occurrenceData = occurrence;
          } catch (error) {
            console.error('Error fetching occurrence data:', error);
          }
        }

        // Navigate to success page
        navigate('/booking-success', {
          state: {
            booking,
            event,
            selectedSeats,
            selectedGeneralTickets,
            customerInfo,
            totalPrice,
            basePrice,
            convenienceFee: convenienceFee || 0,
            payment: {
              id: 'demo_payment_' + Date.now(),
              method: 'demo',
              amount: totalPrice,
            },
            eventDate: bookingEventDate,
            eventOccurrenceId: eventOccurrenceId,
            occurrenceDate: occurrenceData?.occurrence_date,
            occurrenceTime: occurrenceData?.occurrence_time
          }
        });
      }

    } catch (error: any) {
      console.error('Demo payment error:', error);
      toast({
        title: "Demo Payment Failed",
        description: error.message || "Unable to process demo payment",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRazorpayPayment = async () => {
    setProcessing(true);

    try {
      // First, update the user's profile with the customer information
      if (user?.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            first_name: customerInfo.firstName,
            last_name: customerInfo.lastName,
            phone: customerInfo.phone,
            state: customerInfo.state,
            address: customerInfo.address,
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }

      // Create payment order
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-payment-order', {
        body: {
          amount: totalPrice,
          currency: 'INR',
          eventId: event.id,
          customerInfo,
        }
      });

      if (orderError) {
        throw new Error(orderError.message || 'Failed to create payment order');
      }

      // CRITICAL FIX: Use eventDate for recurring events, event.start_datetime for regular events
      const bookingEventDate = eventDate || event.start_datetime;
      console.log('[Payment] Razorpay - Using booking date:', bookingEventDate);

      // For general admission events, use the bookGeneralAdmission function
      if (selectedGeneralTickets && selectedGeneralTickets.length > 0) {
        console.log('[Payment] Razorpay - Using bookGeneralAdmission function for general admission');
        
        const { bookGeneralAdmission } = await import('@/lib/bookGeneralAdmission');
        
        // Convert selectedGeneralTickets format to bookGeneralAdmission format with FIXED quantity parsing
        const ticketsForBooking = selectedGeneralTickets.map((ticket: any) => {
          let parsedQuantity = 0;
          if (typeof ticket.quantity === 'string') {
            const cleanQuantity = ticket.quantity.replace(/[^0-9]/g, '');
            parsedQuantity = parseInt(cleanQuantity, 10);
          } else if (typeof ticket.quantity === 'number') {
            parsedQuantity = ticket.quantity;
          }
          
          if (isNaN(parsedQuantity) || parsedQuantity < 0) {
            parsedQuantity = 0;
          }
          
          return {
            categoryName: ticket.categoryName,
            quantity: parsedQuantity,
            basePrice: ticket.basePrice,
            convenienceFee: ticket.convenienceFee
          };
        });

        const customerData = {
          firstName: customerInfo.firstName,
          lastName: customerInfo.lastName,
          email: customerInfo.email,
          phone: customerInfo.phone,
          address: customerInfo.address || '',
          state: customerInfo.state || ''
        };

        // Initialize Razorpay
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'Ticketooz Events',
          description: `Booking for ${event.name}`,
          order_id: orderData.orderId,
          prefill: {
            name: `${customerInfo.firstName} ${customerInfo.lastName}`,
            email: customerInfo.email,
            contact: customerInfo.phone,
          },
          theme: {
            color: '#3B82F6',
          },
          handler: async function (response: any) {
            try {
              // Use the dedicated function for general admission booking
              const booking = await bookGeneralAdmission(
                event.id,
                ticketsForBooking,
                customerData,
                totalPrice,
                basePrice,
                convenienceFee || 0,
                eventOccurrenceId
              );

              console.log('[Payment] Razorpay - General admission booking created:', booking);

              toast({
                title: "Payment Successful!",
                description: "Your booking has been confirmed. Check your email for tickets.",
              });

              // Fetch occurrence details for recurring events if needed
              let occurrenceData = null;
              if (eventOccurrenceId && event.is_recurring) {
                try {
                  const { data: occurrence } = await supabase
                    .from('event_occurrences')
                    .select('occurrence_date, occurrence_time')
                    .eq('id', eventOccurrenceId)
                    .single();
                  occurrenceData = occurrence;
                } catch (error) {
                  console.error('Error fetching occurrence data:', error);
                }
              }

              // Navigate to success page
              navigate('/booking-success', {
                state: {
                  booking,
                  event,
                  selectedSeats,
                  selectedGeneralTickets,
                  customerInfo,
                  totalPrice,
                  basePrice,
                  convenienceFee: convenienceFee || 0,
                  payment: {
                    id: response.razorpay_payment_id,
                    method: 'razorpay',
                    amount: totalPrice,
                  },
                  eventDate: bookingEventDate,
                  eventOccurrenceId: eventOccurrenceId,
                  occurrenceDate: occurrenceData?.occurrence_date,
                  occurrenceTime: occurrenceData?.occurrence_time
                }
              });
            } catch (error: any) {
              console.error('Payment error:', error);
              toast({
                title: "Payment Failed",
                description: error.message || "Unable to process payment",
                variant: "destructive",
              });
            }
          },
          onDismiss: function (response: any) {
            console.log('Payment cancelled by user');
            setProcessing(false);
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Handle regular seat-based events with existing logic
        const bookingDataArray = [{
          event_id: event.id,
          event_occurrence_id: eventOccurrenceId || null,
          quantity: actualTicketCount,
          total_price: totalPrice,
          convenience_fee: convenienceFee || 0,
          customer_name: `${customerInfo.firstName} ${customerInfo.lastName}`,
          customer_email: customerInfo.email,
          customer_phone: customerInfo.phone,
          customer_state: customerInfo.state || '',
          customer_address: customerInfo.address || '',
          seat_numbers: selectedSeats || [],
          booking_date: new Date(bookingEventDate).toISOString(),
        }];

        // Initialize Razorpay for seat-based events
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'Ticketooz Events',
          description: `Booking for ${event.name}`,
          order_id: orderData.orderId,
          prefill: {
            name: `${customerInfo.firstName} ${customerInfo.lastName}`,
            email: customerInfo.email,
            contact: customerInfo.phone,
          },
          theme: {
            color: '#3B82F6',
          },
          handler: async function (response: any) {
            try {
              const bookingPromises = bookingDataArray.map(async (bookingData) => {
                const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-payment', {
                  body: {
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    bookingData: bookingData,
                  }
                });

                if (verifyError) {
                  throw new Error(verifyError.message || 'Payment verification failed');
                }
                
                return verifyData.booking;
              });
              
              const allBookings = await Promise.all(bookingPromises);

              // Check and update sold-out status for seat map events
              if (event.layout_type === 'seatmap') {
                try {
                  await checkAndUpdateSeatMapSoldOutStatus(event.id);
                } catch (error) {
                  console.error('[Payment] Error checking sold-out status:', error);
                }
              }

              toast({
                title: "Payment Successful!",
                description: "Your booking has been confirmed. Check your email for tickets.",
              });

              // Fetch occurrence details for recurring events if needed
              let occurrenceData = null;
              if (eventOccurrenceId && event.is_recurring) {
                try {
                  const { data: occurrence } = await supabase
                    .from('event_occurrences')
                    .select('occurrence_date, occurrence_time')
                    .eq('id', eventOccurrenceId)
                    .single();
                  occurrenceData = occurrence;
                } catch (error) {
                  console.error('Error fetching occurrence data:', error);
                }
              }

              // Navigate to success page
              navigate('/booking-success', {
                state: {
                  bookings: allBookings,
                  event,
                  selectedSeats,
                  selectedGeneralTickets,
                  customerInfo,
                  totalPrice,
                  basePrice,
                  convenienceFee: convenienceFee || 0,
                  payment: {
                    id: response.razorpay_payment_id,
                    method: 'razorpay',
                    amount: totalPrice,
                  },
                  eventDate: bookingEventDate,
                  eventOccurrenceId: eventOccurrenceId,
                  occurrenceDate: occurrenceData?.occurrence_date,
                  occurrenceTime: occurrenceData?.occurrence_time
                }
              });
            } catch (error: any) {
              console.error('Payment verification error:', error);
              toast({
                title: "Payment Verification Failed",
                description: error.message || "Unable to verify payment",
                variant: "destructive",
              });
            }
          },
          onDismiss: function (response: any) {
            console.log('Payment cancelled by user');
            setProcessing(false);
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }

    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "Unable to process payment",
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  // Get display date and time for the event
  const getDisplayDateTime = () => {
    if (event.is_recurring && eventDate && event.event_time) {
      // For recurring events: Use occurrence date + main event time  
      const dateStr = typeof eventDate === 'string' ? eventDate : format(eventDate, 'yyyy-MM-dd');
      return new Date(`${dateStr}T${event.event_time}`);
    } else if (eventDate) {
      // Use passed eventDate
      return new Date(eventDate);
    } else {
      // Fallback to event start_datetime
      return new Date(event.start_datetime);
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
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payment</h1>
          <p className="text-gray-600 mt-2">Secure payment for your booking</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Payment Methods */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="w-5 h-5" />
                  <span>Secure Payment</span>
                </CardTitle>
                <CardDescription>Choose your preferred payment method</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Payment Method Selection */}
                <div className="space-y-4">
                  <h3 className="font-medium">Payment Options</h3>
                  
                  {/* Demo Payment Option */}
                  <div 
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      paymentMethod === 'demo' 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setPaymentMethod('demo')}
                  >
                    <div className="flex items-center space-x-3">
                      <input 
                        type="radio" 
                        checked={paymentMethod === 'demo'} 
                        onChange={() => setPaymentMethod('demo')}
                        className="text-orange-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <TestTube className="w-5 h-5 text-orange-600" />
                          <span className="font-medium">Demo Payment</span>
                          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">Test Mode</Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Test the booking flow without real payment processing
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-orange-600">
                          <span>No Real Charges</span>
                          <span>Instant Confirmation</span>
                          <span>Testing Only</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Razorpay Option */}
                  <div 
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      paymentMethod === 'razorpay' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setPaymentMethod('razorpay')}
                  >
                    <div className="flex items-center space-x-3">
                      <input 
                        type="radio" 
                        checked={paymentMethod === 'razorpay'} 
                        onChange={() => setPaymentMethod('razorpay')}
                        className="text-blue-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Smartphone className="w-5 h-5 text-blue-600" />
                          <span className="font-medium">UPI / Cards / Wallets</span>
                          <Badge variant="secondary" className="text-xs">Live Payment</Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Pay with UPI, Debit/Credit Cards, Net Banking, or Digital Wallets
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center"><Wallet className="w-3 h-3 mr-1" />UPI</span>
                          <span>Cards</span>
                          <span>Net Banking</span>
                          <span>Wallets</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Button */}
                <div className="pt-4">
                  <Button 
                    onClick={paymentMethod === 'demo' ? handleDemoPayment : handleRazorpayPayment}
                    className={`w-full h-12 ${
                      paymentMethod === 'demo' 
                        ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700' 
                        : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700'
                    }`}
                    disabled={processing}
                  >
                    {paymentMethod === 'demo' ? (
                      <>
                        <TestTube className="w-4 h-4 mr-2" />
                        {processing ? 'Processing Demo...' : `Demo Pay ₹${totalPrice}`}
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-4 h-4 mr-2" />
                        {processing ? 'Processing...' : `Pay ₹${totalPrice} via UPI/Cards`}
                      </>
                    )}
                  </Button>
                </div>

                {/* Security Info */}
                <div className="text-center pt-4 border-t">
                  <p className="text-sm text-gray-500 flex items-center justify-center">
                    <Lock className="w-4 h-4 mr-1" />
                    {paymentMethod === 'demo' ? 'Demo Mode - No Real Transactions' : 'Secured by 256-bit SSL encryption'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{event.name}</h3>
                    <p className="text-sm text-gray-600">{format(displayDateTime, 'PPP')} at {format(displayDateTime, 'p')}</p>
                    <p className="text-sm text-gray-600">{event.venues?.name || 'Venue TBD'}</p>
                    {event.is_recurring && eventOccurrenceId && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        Recurring Event - Selected Date: {format(displayDateTime, 'PPP')}
                      </Badge>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Customer Information</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>{customerInfo.firstName} {customerInfo.lastName}</p>
                      <p>{customerInfo.email}</p>
                      <p>{customerInfo.phone}</p>
                      {customerInfo.state && <p>{customerInfo.state}</p>}
                      {customerInfo.address && <p>{customerInfo.address}</p>}
                    </div>
                  </div>

                  {/* CORRECTED: Enhanced Selected Seats Display */}
                  {selectedSeats && selectedSeats.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Selected Seats</h4>
                      <div className="space-y-2">
                        {selectedSeats.map((seat: any, index: number) => {
                          const seatDisplay = seat.seat_number || `${seat.row_name || ''}${seat.seat_number || seat.id}`;
                          const categoryName = seat.seat_categories?.name || seat.seat_category_name || seat.category_name || seat.category || 'General';
                          
                          // Extract quantity from seat data
                          let seatQuantity = 1; // default to 1 seat
                          
                          if (seat.quantity && typeof seat.quantity === 'number') {
                            seatQuantity = seat.quantity;
                          } else if (seat.quantity && typeof seat.quantity === 'string') {
                            const parsedQty = parseInt(seat.quantity, 10);
                            if (!isNaN(parsedQty) && parsedQty > 0) {
                              seatQuantity = parsedQty;
                            }
                          } else if (seat.seat_number && typeof seat.seat_number === 'string') {
                            // Try to extract quantity from seat_number like "General x4"
                            const match = seat.seat_number.match(/x(\d+)$/);
                            if (match) {
                              const extractedQty = parseInt(match[1], 10);
                              if (!isNaN(extractedQty) && extractedQty > 0) {
                                seatQuantity = extractedQty;
                              }
                            }
                          }
                          
                          const seatPrice = seat.price || basePrice || 0;
                          const totalSeatPrice = seatPrice * seatQuantity;
                          
                          return (
                            <div key={index} className="flex justify-between items-center text-sm p-3 bg-blue-50 border border-blue-200 rounded">
                              <div className="flex-1">
                                <div className="font-medium text-blue-800">{categoryName}</div>
                                <div className="text-gray-600 text-xs">
                                  Seat: {seatDisplay} • Quantity: {seatQuantity}
                                  {seatQuantity > 1 && (
                                    <span> • ₹{seatPrice} × {seatQuantity} = ₹{totalSeatPrice}</span>
                                  )}
                                </div>
                              </div>
                              <span className="font-medium text-blue-600">₹{totalSeatPrice}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* CORRECTED: Enhanced Selected General Tickets Display */}
                  {selectedGeneralTickets && selectedGeneralTickets.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Selected Tickets</h4>
                      <div className="space-y-2">
                        {paymentSummary && paymentSummary.categoryBreakdown ? (
                          // Use payment summary data for accurate pricing
                          paymentSummary.categoryBreakdown.map((category: any, index: number) => (
                            <div key={index} className="flex justify-between items-center text-sm p-3 bg-green-50 border border-green-200 rounded">
                              <div className="flex-1">
                                <div className="font-medium text-green-800">{category.categoryName}</div>
                                <div className="text-gray-600 text-xs">
                                  Quantity: {category.quantity} • Base: ₹{category.basePrice} × {category.quantity} = ₹{category.basePrice * category.quantity}
                                  {category.convenienceFee > 0 && (
                                    <span> • Conv: ₹{category.convenienceFee} × {category.quantity} = ₹{category.convenienceFee * category.quantity}</span>
                                  )}
                                </div>
                              </div>
                              <span className="font-medium text-green-600">₹{category.totalPrice}</span>
                            </div>
                          ))
                        ) : (
                          // Fallback to original selectedGeneralTickets display with CORRECTED quantity parsing
                          selectedGeneralTickets.map((ticket: any, index: number) => {
                            console.log(`Rendering ticket ${index}:`, ticket);
                            
                            // CORRECTED: More robust quantity parsing
                            let parsedQuantity = 0;
                            if (typeof ticket.quantity === 'string') {
                              const cleanQuantity = ticket.quantity.replace(/[^0-9]/g, '');
                              parsedQuantity = parseInt(cleanQuantity, 10);
                              console.log(`Parsed string quantity "${ticket.quantity}" -> "${cleanQuantity}" -> ${parsedQuantity}`);
                            } else if (typeof ticket.quantity === 'number') {
                              parsedQuantity = ticket.quantity;
                              console.log(`Using number quantity ${parsedQuantity}`);
                            }
                            
                            if (isNaN(parsedQuantity) || parsedQuantity < 0) {
                              parsedQuantity = 0;
                              console.log(`Invalid quantity, using 0`);
                            }
                            
                            const totalTicketPrice = ticket.basePrice * parsedQuantity;
                            const totalConvenienceFee = ticket.convenienceFee * parsedQuantity;
                            const totalCategoryPrice = totalTicketPrice + totalConvenienceFee;
                            
                            return (
                              <div key={index} className="flex justify-between items-center text-sm p-3 bg-green-50 border border-green-200 rounded">
                                <div className="flex-1">
                                  <div className="font-medium text-green-800">{ticket.categoryName}</div>
                                  <div className="text-gray-600 text-xs">
                                    Quantity: {parsedQuantity} • Base: ₹{ticket.basePrice} × {parsedQuantity} = ₹{totalTicketPrice}
                                    {ticket.convenienceFee > 0 && (
                                      <span> • Conv: ₹{ticket.convenienceFee} × {parsedQuantity} = ₹{totalConvenienceFee}</span>
                                    )}
                                  </div>
                                </div>
                                <span className="font-medium text-green-600">₹{totalCategoryPrice}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-4 space-y-2">
                    {/* Enhanced payment summary display */}
                    {paymentSummary ? (
                      <>
                        <div className="flex justify-between items-center text-sm">
                          <span>Base Amount</span>
                          <span>₹{paymentSummary.totalBasePrice}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span>Convenience Fee</span>
                          <span>₹{paymentSummary.totalConvenienceFee}</span>
                        </div>
                        <div className="border-t pt-2">
                          <div className="flex justify-between items-center text-lg font-semibold">
                            <span>Total Amount</span>
                            <div className="flex items-center space-x-1">
                              <IndianRupee className="w-5 h-5 text-green-600" />
                              <span className="text-green-600">₹{paymentSummary.totalAmount}</span>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      // Fallback to original pricing display
                      basePrice && !isNaN(basePrice) && convenienceFee !== undefined && !isNaN(convenienceFee) ? (
                        <>
                          <div className="flex justify-between items-center text-sm">
                            <span>Base Amount</span>
                            <span>₹{basePrice}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span>Convenience Fee</span>
                            <span>₹{convenienceFee || 0}</span>
                          </div>
                          <div className="border-t pt-2">
                            <div className="flex justify-between items-center text-lg font-semibold">
                              <span>Total Amount</span>
                              <div className="flex items-center space-x-1">
                                <IndianRupee className="w-5 h-5 text-green-600" />
                                <span className="text-green-600">₹{totalPrice}</span>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between items-center text-lg font-semibold">
                          <span>Total Amount</span>
                          <div className="flex items-center space-x-1">
                            <IndianRupee className="w-5 h-5 text-green-600" />
                            <span className="text-green-600">₹{totalPrice || 'N/A'}</span>
                          </div>
                        </div>
                      )
                    )}
                    
                    {/* CORRECTED: Fixed ticket quantity information */}
                    <div className="text-sm text-gray-500 mt-2">
                      <div className="font-medium">Total Tickets: {paymentSummary?.totalTickets || actualTicketCount}</div>
                      {selectedGeneralTickets && selectedGeneralTickets.length > 0 && (
                        <div className="mt-2 text-xs space-y-1">
                          <div className="font-medium">Category Breakdown:</div>
                          {selectedGeneralTickets.map((ticket: any, index: number) => {
                            // CORRECTED: Consistent quantity parsing
                            let parsedQuantity = 0;
                            if (typeof ticket.quantity === 'string') {
                              const cleanQuantity = ticket.quantity.replace(/[^0-9]/g, '');
                              parsedQuantity = parseInt(cleanQuantity, 10);
                            } else if (typeof ticket.quantity === 'number') {
                              parsedQuantity = ticket.quantity;
                            }
                            
                            if (isNaN(parsedQuantity) || parsedQuantity < 0) {
                              parsedQuantity = 0;
                            }
                            
                            return (
                              <div key={index} className="flex justify-between">
                                <span>{ticket.categoryName}:</span>
                                <span>{parsedQuantity} tickets</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
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

export default Payment;
