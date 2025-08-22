
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SeatData {
  id: string;
  seat_number: string;
  row_name: string;
  x_position: number;
  y_position: number;
  is_available: boolean;
  is_blocked: boolean;
  seat_category_id: string;
  seat_categories?: {
    id: string;
    name: string;
    color: string;
    base_price: number;
  } | null;
}

interface SeatLayoutData {
  id: string;
  name: string;
  rows: number;
  columns: number;
  layout_data: any;
  seats: SeatData[];
}

// Type guard to check if layout_data has the expected structure
interface LayoutDataStructure {
  seats?: Array<{
    id?: string;
    number?: string;
    row?: string;
    x?: number;
    y?: number;
    isBlocked?: boolean;
    isPassage?: boolean;
    categoryId?: string;
  }>;
  rows?: number;
  columns?: number;
}

function isValidLayoutData(data: any): data is LayoutDataStructure {
  return data && typeof data === 'object' && Array.isArray(data.seats);
}

export const useSeatMap = (eventId: string) => {
  const [seatLayout, setSeatLayout] = useState<SeatLayoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSeatMap = async () => {
      if (!eventId) {
        console.log('useSeatMap - No eventId provided');
        setLoading(false);
        return;
      }

      try {
        console.log('useSeatMap - Fetching seat layout for event:', eventId);
        setLoading(true);
        setError(null);
        
        // Fetch seat layouts - get the most recent active one
        const { data: layoutsData, error: layoutError } = await supabase
          .from('seat_layouts')
          .select('*')
          .eq('event_id', eventId)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (layoutError) {
          console.error('useSeatMap - Error fetching seat layout:', layoutError);
          setSeatLayout(null);
          setError(null);
          setLoading(false);
          return;
        }

        if (!layoutsData || layoutsData.length === 0) {
          console.log('useSeatMap - No seat layout found for event');
          setSeatLayout(null);
          setError(null);
          setLoading(false);
          return;
        }

        // Use the most recent layout (first in the ordered results)
        const layoutData = layoutsData[0];
        console.log('useSeatMap - Layout data found:', layoutData);

        // First try to fetch individual seat records
        const { data: seatsData, error: seatsError } = await supabase
          .from('seats')
          .select(`
            *,
            seat_categories:seat_category_id (
              id,
              name,
              color,
              base_price
            )
          `)
          .eq('seat_layout_id', layoutData.id);

        if (seatsError) {
          console.error('useSeatMap - Error fetching seats:', seatsError);
        }

        console.log('useSeatMap - Individual seats found:', seatsData?.length || 0);

        let enrichedSeats: SeatData[] = [];

        // If we have individual seat records, use them
        if (seatsData && seatsData.length > 0) {
          enrichedSeats = seatsData.map(seat => ({
            id: seat.id,
            seat_number: seat.seat_number,
            row_name: seat.row_name,
            x_position: seat.x_position,
            y_position: seat.y_position,
            is_available: seat.is_available,
            is_blocked: seat.is_blocked,
            seat_category_id: seat.seat_category_id,
            seat_categories: seat.seat_categories || null
          }));
        } else {
          // If no individual seats, generate from layout_data
          console.log('useSeatMap - No individual seats found, generating from layout_data');
          
          // Type check and cast the layout_data
          const parsedLayoutData = isValidLayoutData(layoutData.layout_data) 
            ? layoutData.layout_data 
            : null;

          if (parsedLayoutData && parsedLayoutData.seats) {
            // Fetch seat categories to map category IDs to full objects
            const { data: categoriesData } = await supabase
              .from('seat_categories')
              .select('*')
              .eq('event_id', eventId);

            const categoriesMap = new Map();
            if (categoriesData) {
              categoriesData.forEach(cat => {
                categoriesMap.set(cat.id, cat);
              });
            }

            enrichedSeats = parsedLayoutData.seats.map((seat: any) => ({
              id: seat.id || `temp-${seat.y}-${seat.x}`,
              seat_number: seat.number || '',
              row_name: seat.row || '',
              x_position: seat.x || 0,
              y_position: seat.y || 0,
              is_available: !seat.isBlocked && !seat.isPassage,
              is_blocked: seat.isBlocked || false,
              seat_category_id: seat.categoryId || '',
              seat_categories: categoriesMap.get(seat.categoryId) || null
            }));
          }
        }

        const seatLayoutWithSeats: SeatLayoutData = {
          id: layoutData.id,
          name: layoutData.name,
          rows: layoutData.rows || 10,
          columns: layoutData.columns || 10,
          layout_data: layoutData.layout_data,
          seats: enrichedSeats
        };

        console.log('useSeatMap - Final seat layout:', {
          id: seatLayoutWithSeats.id,
          name: seatLayoutWithSeats.name,
          rows: seatLayoutWithSeats.rows,
          columns: seatLayoutWithSeats.columns,
          seatCount: seatLayoutWithSeats.seats.length
        });

        setSeatLayout(seatLayoutWithSeats);
        setError(null);

      } catch (err: any) {
        console.error('useSeatMap - Error in fetchSeatMap:', err);
        setError(err.message || 'Failed to load seat map');
        setSeatLayout(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSeatMap();
  }, [eventId]);

  return { seatLayout, loading, error };
};
