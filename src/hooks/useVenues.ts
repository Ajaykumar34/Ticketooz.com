
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  latitude?: string | null;
  longitude?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const useVenues = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVenues = async () => {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .order('name');

      if (error) throw error;

      setVenues(data || []);
    } catch (error) {
      console.error('Error fetching venues:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  const refetch = () => {
    setLoading(true);
    fetchVenues();
  };

  return { venues, loading, refetch };
};
