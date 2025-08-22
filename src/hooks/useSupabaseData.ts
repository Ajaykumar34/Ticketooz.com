import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useCarouselSlides = (city?: string) => {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSlides = async () => {
      try {
        // Get user's selected city from localStorage if not provided
        const selectedCity = city || localStorage.getItem('selectedCity') || 'All Cities';
        
        let query = supabase
          .from('carousel_slides')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        // Filter by city - show "All Cities" slides plus city-specific slides
        if (selectedCity !== 'All Cities') {
          query = query.in('city', ['All Cities', selectedCity]);
        } else {
          query = query.eq('city', 'All Cities');
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error loading carousel slides:', error);
          setSlides([]);
        } else {
          setSlides(data || []);
        }
      } catch (error) {
        console.error('Error in loadSlides:', error);
        setSlides([]);
      } finally {
        setLoading(false);
      }
    };

    loadSlides();
  }, [city]);

  return { slides, loading };
};
