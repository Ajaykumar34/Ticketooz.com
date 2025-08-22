
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VenueWithFilters {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  created_at?: string;
  updated_at?: string;
  seat_categories?: Array<{
    id: string;
    name: string;
    color: string;
    base_price: number;
  }>;
}

export function useVenuesWithFilters(stateFilter?: string, cityFilter?: string) {
  const [venues, setVenues] = useState<VenueWithFilters[]>([]);
  const [loading, setLoading] = useState(true);
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);

  const fetchVenues = async () => {
    try {
      setLoading(true);
      console.log('Fetching venues with filters:', { stateFilter, cityFilter });
      
      // Build query with filters
      let query = supabase
        .from('venues')
        .select('*')
        .order('created_at', { ascending: false });

      if (stateFilter) {
        query = query.eq('state', stateFilter);
      }
      
      if (cityFilter) {
        query = query.eq('city', cityFilter);
      }

      const { data: venuesData, error: venuesError } = await query;

      if (venuesError) {
        console.error('Error fetching venues:', venuesError);
        throw venuesError;
      }

      // Note: Since seat categories are now linked to events, not venues,
      // we won't fetch seat categories for venues anymore
      const venuesWithCategories: VenueWithFilters[] = venuesData?.map(venue => ({
        ...venue,
        seat_categories: [] // Empty array since categories are now event-specific
      })) || [];

      console.log('Fetched venues:', venuesWithCategories);
      setVenues(venuesWithCategories);

      // Extract unique states and cities for filter options
      const uniqueStates = [...new Set(venuesData?.map(v => v.state).filter(Boolean) || [])];
      const uniqueCities = [...new Set(venuesData?.map(v => v.city).filter(Boolean) || [])];
      
      setStates(uniqueStates.sort());
      setCities(uniqueCities.sort());

    } catch (error: any) {
      console.error('Error in fetchVenues:', error);
      setVenues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, [stateFilter, cityFilter]);

  return { venues, loading, refetch: fetchVenues, states, cities };
}
