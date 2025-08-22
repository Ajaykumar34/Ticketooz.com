
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BookedSeat {
  seat_number: string;
  booking_id: string;
  status: string;
  row_name?: string;
}

export const useBookedSeats = (eventId: string) => {
  const [bookedSeats, setBookedSeats] = useState<BookedSeat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookedSeats = async () => {
    if (!eventId) {
      console.log('[useBookedSeats] No eventId provided');
      setBookedSeats([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('[useBookedSeats] Fetching booked seats for event:', eventId);
      
      // Fetch confirmed and pending bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, seat_numbers, status, created_at')
        .eq('event_id', eventId)
        .in('status', ['Confirmed', 'Pending'])
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.error('[useBookedSeats] Error fetching bookings:', bookingsError);
        throw bookingsError;
      }

      console.log('[useBookedSeats] Raw bookings data:', bookings);

      const bookedSeatsList: BookedSeat[] = [];

      if (bookings && bookings.length > 0) {
        console.log('[useBookedSeats] Processing bookings:', bookings.length);
        
        bookings.forEach(booking => {
          console.log('[useBookedSeats] Processing booking:', booking.id, 'seat_numbers:', booking.seat_numbers);
          
          if (booking.seat_numbers) {
            let seatNumbers = [];
            
            // Handle different seat_numbers formats with enhanced parsing
            if (typeof booking.seat_numbers === 'string') {
              try {
                // Try to parse as JSON first
                const parsed = JSON.parse(booking.seat_numbers);
                if (Array.isArray(parsed)) {
                  seatNumbers = parsed;
                } else {
                  // Single seat as string
                  seatNumbers = [parsed];
                }
              } catch {
                // If not JSON, treat as comma-separated string or single seat
                if (booking.seat_numbers.includes(',')) {
                  seatNumbers = booking.seat_numbers.split(',').map(s => s.trim()).filter(s => s.length > 0);
                } else {
                  seatNumbers = [booking.seat_numbers.trim()];
                }
              }
            } else if (Array.isArray(booking.seat_numbers)) {
              seatNumbers = booking.seat_numbers;
            } else {
              seatNumbers = [booking.seat_numbers];
            }
            
            console.log('[useBookedSeats] Processed seat numbers for booking:', booking.id, seatNumbers);
            
            // Process each individual seat with multiple format handling
            seatNumbers.forEach((seatInfo: any) => {
              let seatIdentifiers = extractSeatIdentifiers(seatInfo);
              
              // Add each seat identifier as a booked seat
              seatIdentifiers.forEach(identifier => {
                if (identifier && identifier.seatNumber) {
                  const bookedSeat = {
                    seat_number: identifier.seatNumber,
                    booking_id: booking.id,
                    status: booking.status,
                    row_name: identifier.rowName || ''
                  };
                  
                  console.log('[useBookedSeats] Adding booked seat:', bookedSeat);
                  bookedSeatsList.push(bookedSeat);
                }
              });
            });
          }
        });
      }

      // Remove duplicates based on exact seat identifier
      const uniqueBookedSeats = bookedSeatsList.filter((seat, index, self) => 
        index === self.findIndex(s => s.seat_number === seat.seat_number && s.row_name === seat.row_name)
      );

      console.log('[useBookedSeats] Final unique booked seats list:', uniqueBookedSeats);
      setBookedSeats(uniqueBookedSeats);

    } catch (err: any) {
      console.error('[useBookedSeats] Error:', err);
      setError(err.message || 'Failed to fetch booked seats');
      setBookedSeats([]);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced seat identifier extraction
  const extractSeatIdentifiers = (seatInfo: any): Array<{seatNumber: string, rowName?: string}> => {
    const identifiers: Array<{seatNumber: string, rowName?: string}> = [];
    
    if (typeof seatInfo === 'string') {
      const seatStr = seatInfo.trim();
      
      // Try to parse seat identifier patterns
      const seatMatch = seatStr.match(/^([A-Z]+)(\d+)$/);
      if (seatMatch) {
        // Format like "A1", "B5"
        identifiers.push({
          seatNumber: seatStr, // Store full identifier
          rowName: seatMatch[1]
        });
        identifiers.push({
          seatNumber: seatMatch[2], // Also store just the number for fallback matching
          rowName: seatMatch[1]
        });
      } else if (/^\d+$/.test(seatStr)) {
        // Just a number like "1", "2"
        identifiers.push({
          seatNumber: seatStr,
          rowName: ''
        });
      } else {
        // Any other format
        identifiers.push({
          seatNumber: seatStr,
          rowName: ''
        });
      }
    } else if (typeof seatInfo === 'object' && seatInfo !== null) {
      // Handle object format
      if (seatInfo.id) {
        identifiers.push({
          seatNumber: seatInfo.id,
          rowName: seatInfo.row_name || seatInfo.row || ''
        });
      }
      
      if (seatInfo.seat_number && seatInfo.row_name) {
        // Full seat identifier
        identifiers.push({
          seatNumber: `${seatInfo.row_name}${seatInfo.seat_number}`,
          rowName: seatInfo.row_name
        });
        // Also store just the seat number
        identifiers.push({
          seatNumber: seatInfo.seat_number,
          rowName: seatInfo.row_name
        });
      } else if (seatInfo.seat_number) {
        identifiers.push({
          seatNumber: seatInfo.seat_number,
          rowName: ''
        });
      }
    }
    
    return identifiers;
  };

  useEffect(() => {
    fetchBookedSeats();

    // Enhanced realtime subscription with better error handling and retry logic
    let channel: any = null;
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds

    const setupRealtimeSubscription = () => {
      console.log('[useBookedSeats] Setting up realtime subscription, attempt:', retryCount + 1);
      
      channel = supabase
        .channel(`bookings-realtime-${eventId}-${Date.now()}`) // Add timestamp to make channel unique
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookings',
            filter: `event_id=eq.${eventId}`
          },
          (payload) => {
            console.log('[useBookedSeats] Realtime booking update:', payload);
            // Immediately refresh booked seats when any booking changes
            setTimeout(() => {
              fetchBookedSeats();
            }, 100); // Small delay to ensure database consistency
          }
        )
        .subscribe((status) => {
          console.log('[useBookedSeats] Realtime subscription status:', status);
          
          if (status === 'SUBSCRIBED') {
            console.log('[useBookedSeats] Successfully subscribed to realtime updates');
            retryCount = 0; // Reset retry count on successful subscription
          } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn('[useBookedSeats] Realtime subscription failed with status:', status);
            
            // Retry logic for failed subscriptions
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`[useBookedSeats] Retrying subscription in ${retryDelay}ms (attempt ${retryCount}/${maxRetries})`);
              
              setTimeout(() => {
                if (channel) {
                  supabase.removeChannel(channel);
                }
                setupRealtimeSubscription();
              }, retryDelay);
            } else {
              console.error('[useBookedSeats] Max retry attempts reached, giving up on realtime subscription');
              // Fallback to polling every 30 seconds if realtime fails completely
              const pollInterval = setInterval(() => {
                console.log('[useBookedSeats] Polling for updates (realtime failed)');
                fetchBookedSeats();
              }, 30000);

              // Clean up polling on unmount
              return () => {
                clearInterval(pollInterval);
              };
            }
          }
        });
    };

    setupRealtimeSubscription();

    return () => {
      console.log('[useBookedSeats] Cleaning up realtime subscription');
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [eventId]);

  return { bookedSeats, loading, error, refetch: fetchBookedSeats };
};
