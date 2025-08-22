
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Helper function to parse duration text into hours
const parseDurationToHours = (durationText: string): number => {
  if (!durationText || typeof durationText !== 'string') {
    return 3; // Default 3 hours
  }
  
  const text = durationText.toLowerCase().trim();
  
  // Try to extract numbers from the text
  const numberMatch = text.match(/(\d+(?:\.\d+)?)/);
  if (!numberMatch) {
    return 3; // Default if no number found
  }
  
  const number = parseFloat(numberMatch[1]);
  
  // Determine if it's minutes or hours
  if (text.includes('minute') || text.includes('min')) {
    return number / 60; // Convert minutes to hours
  } else {
    return number; // Assume hours
  }
};

export const saveEventForm = async (
  formData: any, 
  event?: any, 
  onClose?: () => void
) => {
  try {
    let eventDates = [];
    
    // Handle different event types
    if (formData.isRecurring) {
      // For recurring events, use startDate (or fallback to date)
      const startDate = formData.startDate || formData.date;
      if (startDate) {
        eventDates = [startDate];
      } else {
        toast.error('Please specify start date for recurring event');
        return false;
      }
    } else if (formData.isRegular) {
      if (formData.regularEventDates && formData.regularEventDates.length > 0) {
        eventDates = formData.regularEventDates;
      } else if (formData.date && formData.regularEventEndDate) {
        const startDate = new Date(formData.date);
        const endDate = new Date(formData.regularEventEndDate);
        const dates = [];
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 7)) {
          dates.push(d.toISOString().split('T')[0]);
        }
        eventDates = dates;
      } else {
        toast.error('Please specify dates for regular event');
        return false;
      }
    } else {
      if (formData.date) {
        eventDates = [formData.date];
      } else {
        toast.error('Please specify event date');
        return false;
      }
    }

    // Extract exact venue details using venue ID
    let venueState = '';
    let venueCity = '';
    let venueName = '';
    if (formData.venue) {
      console.log('Extracting venue data for venue ID:', formData.venue);
      const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .select('state, city, name')
        .eq('id', formData.venue)
        .single();
      
      if (venueError) {
        console.error('Error fetching venue details:', venueError);
        toast.error('Failed to fetch venue details');
        return false;
      } else if (venueData) {
        venueState = venueData.state || '';
        venueCity = venueData.city || '';
        venueName = venueData.name || '';
        console.log('Extracted venue data:', { venueState, venueCity, venueName });
      }
    }

    // Process tags - ensure they exist in the tags table
    let processedTags = [];
    if (formData.tags && formData.tags.length > 0) {
      console.log('Processing tags:', formData.tags);
      
      for (const tagName of formData.tags) {
        const { data: existingTag, error: tagCheckError } = await supabase
          .from('tags')
          .select('id, name')
          .eq('name', tagName)
          .single();

        if (tagCheckError && tagCheckError.code !== 'PGRST116') {
          console.error('Error checking tag:', tagCheckError);
          continue;
        }

        if (existingTag) {
          processedTags.push(tagName);
        } else {
          const tagSlug = tagName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          const { data: newTag, error: createTagError } = await supabase
            .from('tags')
            .insert({
              name: tagName,
              slug: tagSlug
            })
            .select('name')
            .single();

          if (createTagError) {
            console.error('Error creating tag:', createTagError);
            toast.error(`Failed to create tag: ${tagName}`);
          } else {
            processedTags.push(newTag.name);
            console.log('Created new tag:', newTag.name);
          }
        }
      }
    }

    const createdEvents = [];

    for (const eventDate of eventDates) {
      // For recurring events, use eventTime (or fallback to time)
      const eventTime = formData.isRecurring ? (formData.eventTime || formData.time) : formData.time;
      const startDateTime = new Date(`${eventDate}T${eventTime}`);
      
      // Parse duration from text field - handle text input like "2 hours", "90 minutes", etc.
      const durationHours = parseDurationToHours(formData.duration);
      const endDateTime = new Date(startDateTime.getTime() + (durationHours * 60 * 60 * 1000));
      
      const saleStart = formData.ticketSaleStartDate && formData.ticketSaleStartTime 
        ? new Date(`${formData.ticketSaleStartDate}T${formData.ticketSaleStartTime}`)
        : new Date(startDateTime.getTime() - (30 * 24 * 60 * 60 * 1000));
      
      const saleEnd = formData.ticketSaleEndDate && formData.ticketSaleEndTime
        ? new Date(`${formData.ticketSaleEndDate}T${formData.ticketSaleEndTime}`)
        : new Date(startDateTime.getTime() - (60 * 60 * 1000));
      
      const genresJson = formData.genres && formData.genres.length > 0 ? JSON.stringify(formData.genres) : null;
      const tagsJson = processedTags.length > 0 ? JSON.stringify(processedTags) : null;
      
      // Ensure artists array is properly handled and not removed
      const artistsArray = Array.isArray(formData.artists) && formData.artists.length > 0 
        ? formData.artists.filter(artist => artist.name && artist.name.trim() !== '')
        : [{ name: '', image: '' }];
      const artistsJson = artistsArray.length > 0 ? JSON.stringify(artistsArray) : null;
      
      const eventData = {
        name: formData.name + (eventDates.length > 1 ? ` - ${eventDate}` : ''),
        description: formData.description,
        category: formData.category,
        sub_category: formData.subCategory,
        language: formData.language,
        genre: formData.genre || (formData.genres && formData.genres.length > 0 ? formData.genres[0] : null),
        genres: genresJson,
        start_datetime: startDateTime.toISOString(),
        end_datetime: endDateTime.toISOString(),
        duration: durationHours,
        venue_id: formData.venue,
        state: venueState,
        city: venueCity,
        venue: venueName,
        sale_start: saleStart.toISOString(),
        sale_end: saleEnd.toISOString(),
        is_featured: formData.isFeatured,
        is_regular: formData.isRegular,
        poster: formData.poster,
        artist_name: artistsArray[0]?.name || '',
        artist_image: artistsArray[0]?.image || '',
        artists: artistsJson,
        event_tags: tagsJson,
        tags: tagsJson,
        terms_and_conditions: formData.termsAndConditions,
        layout_type: formData.layoutType,
        status: 'active',
        is_recurring: formData.isRecurring || false,
        recurrence_type: formData.isRecurring ? formData.recurrenceType : null,
        recurrence_end_date: formData.isRecurring ? (formData.endDate || formData.recurrenceEndDate) : null,
        event_expiry_minutes: formData.isRecurring ? formData.eventExpiryMinutes : null,
        event_logo: formData.eventLogo || null,
        event_images: formData.eventImages && formData.eventImages.length > 0 ? JSON.stringify(formData.eventImages) : null,
        // FIXED: Add the missing recurring event fields
        start_date: formData.isRecurring ? (formData.startDate || formData.date) : null,
        event_time: formData.isRecurring ? (formData.eventTime || formData.time) : null,
        end_date: formData.isRecurring ? (formData.endDate || formData.recurrenceEndDate) : null,
      };

      console.log('Saving event with complete data:', eventData);

      let result;
      let eventId;
      
      if (event && eventDates.length === 1) {
        result = await supabase
          .from('events')
          .update(eventData)
          .eq('id', event.id)
          .select();
        eventId = event.id;
      } else {
        result = await supabase
          .from('events')
          .insert(eventData)
          .select();
        eventId = result.data?.[0]?.id;
        
        // Seat categories will be created later when pricing data is saved
      }

      if (result.error) {
        throw result.error;
      }

      console.log('Event saved successfully with ID:', eventId);
      createdEvents.push({ eventId, eventDate });

      // Clean up automatically created default seat categories (created by database trigger)
      // We only want the categories that admin explicitly defines
      if (eventId) {
        console.log('Cleaning up automatically created default seat categories for event:', eventId);
        const { error: cleanupError } = await supabase
          .from('seat_categories')
          .delete()
          .eq('event_id', eventId);
        
        if (cleanupError) {
          console.error('Error cleaning up default seat categories:', cleanupError);
        } else {
          console.log('Successfully cleaned up automatic seat categories');
        }
      }

      // Save seat layout if selected
      if (eventId && formData.layoutType === 'seatmap' && formData.seatLayout) {
        const layoutData = {
          event_id: eventId,
          name: `${formData.name} Layout - ${eventDate}`,
          layout_data: formData.seatLayout,
          is_active: true,
          updated_at: new Date().toISOString()
        };

        const { error: layoutError } = await supabase
          .from('seat_layouts')
          .upsert(layoutData);

        if (layoutError) {
          console.error('Error saving seat layout:', layoutError);
        }
      }

      // Save pricing data with correct fee calculations
      if (eventId && formData.ticketCategories.length > 0) {
        console.log('Saving pricing data for event:', eventId);
        console.log('Ticket categories from form:', formData.ticketCategories);

        try {
          // Delete existing pricing for this event first
          const deleteResult = await supabase
            .from('event_seat_pricing')
            .delete()
            .eq('event_id', eventId);

          if (deleteResult.error) {
            console.error('Error deleting existing pricing:', deleteResult.error);
          }

          // First create seat categories for valid ticket categories
          const validCategories = formData.ticketCategories.filter(cat => 
            cat.name && cat.name.trim() !== '' && 
            cat.price && parseFloat(cat.price) > 0 &&
            cat.quantity && parseInt(cat.quantity) > 0
          );

          // Create seat categories only for the valid ticket categories defined by admin
          const seatCategoryInserts = validCategories.map(cat => ({
            event_id: eventId,
            name: cat.name.trim(),
            color: '#4ECDC4', // Default color
            base_price: parseFloat(cat.price) || 0,
            is_active: true
          }));

          let seatCategories = [];
          if (seatCategoryInserts.length > 0) {
            console.log('Creating seat categories for valid ticket categories:', seatCategoryInserts);
            const { data: createdSeatCategories, error: seatCatError } = await supabase
              .from('seat_categories')
              .insert(seatCategoryInserts)
              .select('id, name');

            if (seatCatError) {
              console.error('Error creating seat categories:', seatCatError);
              throw seatCatError;
            }

            seatCategories = createdSeatCategories || [];
            console.log('Created seat categories:', seatCategories);
          }

          // Only create pricing for valid categories that have corresponding seat categories
          const pricingData = [];
          
          for (const category of validCategories) {
            // Find matching seat category by name (case-insensitive)
            const matchingSeatCategory = seatCategories.find(sc => 
              sc.name.toLowerCase().trim() === category.name.toLowerCase().trim()
            );

            if (!matchingSeatCategory) {
              console.error('Could not find matching seat category for:', category.name);
              continue;
            }

            console.log('Found matching seat category:', matchingSeatCategory);

            // Calculate actual fee values based on type
            const basePrice = parseFloat(category.price);
            let calculatedConvenienceFee = 0;
            let calculatedCommission = 0;
            
            if (category.convenienceFeeType === 'percentage') {
              calculatedConvenienceFee = (basePrice * parseFloat(category.convenienceFee || '0')) / 100;
            } else {
              calculatedConvenienceFee = parseFloat(category.convenienceFee || '0');
            }
            
            if (category.commissionType === 'percentage') {
              calculatedCommission = (basePrice * parseFloat(category.commission || '0')) / 100;
            } else {
              calculatedCommission = parseFloat(category.commission || '0');
            }

            const pricingEntry = {
              event_id: eventId,
              seat_category_id: matchingSeatCategory.id,
              base_price: basePrice,
              convenience_fee: calculatedConvenienceFee,
              commission: calculatedCommission,
              convenience_fee_type: category.convenienceFeeType || 'fixed',
              convenience_fee_value: parseFloat(category.convenienceFee || '0'),
              commission_type: category.commissionType || 'fixed',
              commission_value: parseFloat(category.commission || '0'),
              available_tickets: parseInt(category.quantity) || 100,
              total_tickets: parseInt(category.quantity) || 100,
              is_active: true
            };

            pricingData.push(pricingEntry);
          }

          console.log('Final pricing data to insert:', pricingData);

          if (pricingData.length > 0) {
            const pricingResult = await supabase
              .from('event_seat_pricing')
              .insert(pricingData);

            if (pricingResult.error) {
              console.error('Pricing save error details:', pricingResult.error);
              toast.error(`Failed to save pricing data: ${pricingResult.error.message}`);
              return false;
            } else {
              console.log('Successfully saved pricing for', pricingData.length, 'categories');
            }
          } else {
            console.log('No valid pricing data to save');
          }
        } catch (pricingError) {
          console.error('Exception while saving pricing data:', pricingError);
          toast.error(`Failed to save pricing data: ${pricingError.message}`);
          return false;
        }
      }

      // For recurring events, generate occurrences after the first event is saved
      if (formData.isRecurring && eventId) {
        console.log('Generating occurrences for recurring event:', eventId);
        
        // Calculate total capacity from ticket categories
        const totalCapacity = formData.ticketCategories && formData.ticketCategories.length > 0
          ? formData.ticketCategories.reduce((total, category) => {
              return total + (parseInt(category.quantity) || 100);
            }, 0)
          : 100; // Default capacity if no categories

        console.log('Total calculated capacity:', totalCapacity);
        
        try {
          const { error: sqlError } = await supabase
            .rpc('generate_event_occurrences' as any, {
              p_event_id: eventId,
              p_start_date: formData.startDate || formData.date,
              p_end_date: formData.endDate || formData.recurrenceEndDate,
              p_start_time: formData.eventTime || formData.time,
              p_end_time: formData.eventTime || formData.time,
              p_pattern: formData.recurrenceType?.toUpperCase() || 'DAILY',
              p_total_tickets: totalCapacity
            });
          
          if (sqlError) {
            console.error('Error generating occurrences:', sqlError);
            console.log('Event saved but occurrences generation failed. This might be handled by database triggers.');
          } else {
            console.log('Successfully generated recurring occurrences with capacity:', totalCapacity);
          }
        } catch (rpcErr) {
          console.error('RPC call failed:', rpcErr);
          console.log('Event saved but occurrences generation failed. This might be handled by database triggers.');
        }
      }
    }
    
    const message = event ? 'Event updated successfully' : 'Event created successfully';
    
    if (formData.isRecurring) {
      toast.success(`${message}. Recurring occurrences will be generated automatically.`);
    } else {
      toast.success(message);
    }
    
    if (onClose) onClose();
    return true;
  } catch (error) {
    console.error('Save error:', error);
    toast.error(`Failed to save event: ${error.message}`);
    return false;
  }
};
