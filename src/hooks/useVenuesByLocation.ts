
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VenueData {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
}

export const useVenuesByLocation = () => {
  const [venues, setVenues] = useState<VenueData[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVenues = async () => {
    try {
      console.log('Fetching venues from database...');
      const { data, error } = await supabase
        .from('venues')
        .select('id, name, address, city, state')
        .order('state', { ascending: true })
        .order('city', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching venues:', error);
        throw error;
      }

      console.log('Raw venues data from database:', data);
      
      // Filter out venues with null/undefined state or city
      const validVenues = (data || []).filter(venue => 
        venue.state && venue.city && venue.state.trim() && venue.city.trim()
      );
      
      console.log('Filtered valid venues:', validVenues);
      setVenues(validVenues);
      
      // Extract unique states and cities from valid venues only
      const uniqueStates = [...new Set(validVenues.map(v => v.state).filter(Boolean))].sort();
      const uniqueCities = [...new Set(validVenues.map(v => v.city).filter(Boolean))].sort();
      
      console.log('Unique states extracted:', uniqueStates);
      console.log('Unique cities extracted:', uniqueCities);
      
      setStates(uniqueStates);
      setCities(uniqueCities);
    } catch (error) {
      console.error('Error in fetchVenues:', error);
      // Set empty arrays on error to prevent undefined issues
      setVenues([]);
      setStates([]);
      setCities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  const getVenuesByState = (state: string) => {
    if (!state) return [];
    const result = venues.filter(venue => venue.state === state);
    console.log(`Venues for state "${state}":`, result);
    return result;
  };

  const getVenuesByCity = (city: string) => {
    if (!city) return [];
    const result = venues.filter(venue => venue.city === city);
    console.log(`Venues for city "${city}":`, result);
    return result;
  };

  const getVenuesByStateAndCity = (state: string, city: string) => {
    if (!state || !city) return [];
    const result = venues.filter(venue => 
      venue.state === state && venue.city === city
    );
    console.log(`Venues for state "${state}" and city "${city}":`, result);
    return result;
  };

  const getCitiesByState = (state: string) => {
    if (!state) return [];
    const stateCities = [...new Set(
      venues
        .filter(venue => venue.state === state)
        .map(v => v.city)
        .filter(city => city && city.trim())
    )].sort();
    console.log(`Cities for state "${state}":`, stateCities);
    return stateCities;
  };

  const getVenueById = (venueId: string) => {
    if (!venueId) return null;
    const venue = venues.find(v => v.id === venueId);
    console.log(`Venue for ID "${venueId}":`, venue);
    return venue;
  };

  return {
    venues,
    states,
    cities,
    loading,
    getVenuesByState,
    getVenuesByCity,
    getVenuesByStateAndCity,
    getCitiesByState,
    getVenueById,
    refetch: fetchVenues
  };
};
