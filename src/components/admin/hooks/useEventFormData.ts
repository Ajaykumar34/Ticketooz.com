
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getInitialFormData } from '../utils/eventFormUtils';

export const useEventFormData = (event?: any, copyFromEvent?: any) => {
  const [formData, setFormData] = useState(getInitialFormData(event));

  useEffect(() => {
    if (event) {
      // Editing existing event
      const eventDate = new Date(event.start_datetime);
      const saleStartDate = new Date(event.sale_start);
      const saleEndDate = new Date(event.sale_end);
      
      const checkSeatLayouts = async () => {
        const { data: layouts } = await supabase
          .from('seat_layouts')
          .select('*')
          .eq('event_id', event.id)
          .eq('is_active', true);
        
        const hasLayouts = layouts && layouts.length > 0;
        
        // FIXED: Parse artists data properly from the database
        let artistsData = [{ name: '', image: '' }]; // Default fallback
        
        // First try to parse from the artists JSON field
        if (event.artists) {
          if (typeof event.artists === 'string') {
            try {
              const parsedArtists = JSON.parse(event.artists);
              if (Array.isArray(parsedArtists) && parsedArtists.length > 0) {
                artistsData = parsedArtists.filter(artist => artist.name && artist.name.trim() !== '');
              }
            } catch (e) {
              console.error('Error parsing artists JSON in useEventFormData:', e);
            }
          } else if (Array.isArray(event.artists)) {
            artistsData = event.artists.filter(artist => artist.name && artist.name.trim() !== '');
          }
        }
        
        // If no valid artists from JSON, fall back to individual artist fields
        if (artistsData.length === 0 || (artistsData.length === 1 && !artistsData[0].name)) {
          if (event.artist_name) {
            artistsData = [{ 
              name: event.artist_name || '', 
              image: event.artist_image || '' 
            }];
          }
        }
        
        // Ensure we always have at least one artist entry for the form
        if (artistsData.length === 0) {
          artistsData = [{ name: '', image: '' }];
        }

        // Parse genres data
        let genresData: string[] = [];
        if (event.genres) {
          if (typeof event.genres === 'string') {
            try {
              genresData = JSON.parse(event.genres);
            } catch {
              genresData = event.genres.split(',').map((g: string) => g.trim());
            }
          } else if (Array.isArray(event.genres)) {
            genresData = event.genres;
          }
        }
        
        console.log('useEventFormData - Loaded artists for editing:', artistsData);
        
        setFormData(prev => ({
          ...prev,
          eventId: event.id,
          name: event.name || '',
          description: event.description || '',
          category: event.category || '',
          subCategory: event.sub_category || '',
          language: event.language || '',
          genres: genresData,
          date: eventDate.toISOString().split('T')[0],
          time: eventDate.toTimeString().slice(0, 5),
          duration: event.duration ? event.duration.toString() : '3',
          venue: event.venue_id || '',
          isFeatured: event.is_featured || false,
          poster: event.poster || '',
          eventLogo: event.event_logo || '',
          eventImages: event.event_images ? (typeof event.event_images === 'string' ? event.event_images.split(',') : event.event_images) : [],
          artists: artistsData, // Use the properly parsed artists array
          termsAndConditions: event.terms_and_conditions || '',
          ticketSaleStartDate: saleStartDate.toISOString().split('T')[0],
          ticketSaleStartTime: saleStartDate.toTimeString().slice(0, 5),
          ticketSaleEndDate: saleEndDate.toISOString().split('T')[0],
          ticketSaleEndTime: saleEndDate.toTimeString().slice(0, 5),
          layoutType: hasLayouts ? 'seatmap' : 'general'
        }));
      };

      checkSeatLayouts();
      
      const fetchExistingPricing = async () => {
        try {
          const { data: pricingData, error } = await supabase
            .from('event_seat_pricing')
            .select('*')
            .eq('event_id', event.id);

          if (error) {
            console.error('Error fetching pricing data:', error);
            return;
          }

          if (pricingData && pricingData.length > 0) {
            const categoryIds = pricingData.map(p => p.seat_category_id);
            const { data: categoriesData } = await supabase
              .from('seat_categories')
              .select('id, name')
              .in('id', categoryIds);

            const ticketCategories = pricingData.map(pricing => {
              const category = categoriesData?.find(cat => cat.id === pricing.seat_category_id);
              return {
                name: category?.name || 'General',
                price: pricing.base_price.toString(),
                quantity: '100',
                convenienceFeeType: 'fixed',
                convenienceFee: pricing.convenience_fee?.toString() || '0',
                commissionType: 'fixed',
                commission: pricing.commission?.toString() || '0',
                seatCategoryId: pricing.seat_category_id || '',
                multiplier: '1'
              };
            });

            setFormData(prev => ({
              ...prev,
              ticketCategories
            }));
          }
        } catch (err) {
          console.error('Error fetching existing pricing:', err);
        }
      };

      fetchExistingPricing();
    } else if (copyFromEvent) {
      // Copying from existing event
      const eventDate = new Date(copyFromEvent.start_datetime);
      const saleStartDate = new Date(copyFromEvent.sale_start);
      const saleEndDate = new Date(copyFromEvent.sale_end);
      
      // FIXED: Parse artists data properly when copying
      let artistsData = [{ name: '', image: '' }]; // Default fallback
      
      // First try to parse from the artists JSON field
      if (copyFromEvent.artists) {
        if (typeof copyFromEvent.artists === 'string') {
          try {
            const parsedArtists = JSON.parse(copyFromEvent.artists);
            if (Array.isArray(parsedArtists) && parsedArtists.length > 0) {
              artistsData = parsedArtists.filter(artist => artist.name && artist.name.trim() !== '');
            }
          } catch (e) {
            console.error('Error parsing artists JSON when copying in useEventFormData:', e);
          }
        } else if (Array.isArray(copyFromEvent.artists)) {
          artistsData = copyFromEvent.artists.filter(artist => artist.name && artist.name.trim() !== '');
        }
      }
      
      // If no valid artists from JSON, fall back to individual artist fields
      if (artistsData.length === 0 || (artistsData.length === 1 && !artistsData[0].name)) {
        if (copyFromEvent.artist_name) {
          artistsData = [{ 
            name: copyFromEvent.artist_name || '', 
            image: copyFromEvent.artist_image || '' 
          }];
        }
      }
      
      // Ensure we always have at least one artist entry for the form
      if (artistsData.length === 0) {
        artistsData = [{ name: '', image: '' }];
      }

      // Parse genres data
      let genresData: string[] = [];
      if (copyFromEvent.genres) {
        if (typeof copyFromEvent.genres === 'string') {
          try {
            genresData = JSON.parse(copyFromEvent.genres);
          } catch {
            genresData = copyFromEvent.genres.split(',').map((g: string) => g.trim());
          }
        } else if (Array.isArray(copyFromEvent.genres)) {
          genresData = copyFromEvent.genres;
        }
      }
      
      console.log('useEventFormData - Loaded artists for copying:', artistsData);
      
      setFormData(prev => ({
        ...prev,
        eventId: null, // New event, no ID yet
        name: `${copyFromEvent.name} (Copy)`,
        description: copyFromEvent.description || '',
        category: copyFromEvent.category || '',
        subCategory: copyFromEvent.sub_category || '',
        language: copyFromEvent.language || '',
        genres: genresData,
        date: eventDate.toISOString().split('T')[0],
        time: eventDate.toTimeString().slice(0, 5),
        duration: copyFromEvent.duration ? copyFromEvent.duration.toString() : '3',
        venue: copyFromEvent.venue_id || '',
        isFeatured: copyFromEvent.is_featured || false,
        poster: copyFromEvent.poster || '',
        eventLogo: copyFromEvent.event_logo || '',
        eventImages: copyFromEvent.event_images ? (typeof copyFromEvent.event_images === 'string' ? copyFromEvent.event_images.split(',') : copyFromEvent.event_images) : [],
        artists: artistsData, // Use the properly parsed artists array
        termsAndConditions: copyFromEvent.terms_and_conditions || '',
        ticketSaleStartDate: saleStartDate.toISOString().split('T')[0],
        ticketSaleStartTime: saleStartDate.toTimeString().slice(0, 5),
        ticketSaleEndDate: saleEndDate.toISOString().split('T')[0],
        ticketSaleEndTime: saleEndDate.toTimeString().slice(0, 5),
        layoutType: 'general'
      }));
    }
  }, [event, copyFromEvent]);

  return { formData, setFormData };
};
