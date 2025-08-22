import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import EventFormBasicDetails from './EventFormBasicDetails';
import { EventFormTicketDetails } from './EventFormTicketDetails';
import EventFormSeatLayout from './EventFormSeatLayout';
import { useCategories } from '@/hooks/useCategories';
import { useVenues } from '@/hooks/useVenues';
import { useSeatCategories } from '@/hooks/useSeatCategories';
import { saveEventForm } from './utils/eventFormSave';

interface EventFormProps {
  event?: any;
  copyFromEvent?: any;
  onClose: () => void;
}

const EventFormRefactored = ({ event, copyFromEvent, onClose }: EventFormProps) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [saving, setSaving] = useState(false);
  const [venues, setVenues] = useState([]);
  const [categories, setCategories] = useState([]);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [formData, setFormData] = useState({
    // Set proper event ID from the start
    eventId: event?.id || null,
    
    name: '',
    description: '',
    category: '',
    subCategory: '',
    genre: '',
    language: '',
    state: '',
    city: '',
    venue: '',
    date: '',
    time: '',
    duration: '',
    isFeatured: false,
    isRegular: false,
    regularEventDates: [],
    regularEventEndDate: '',
    hasSeatMap: false,
    useSeatMap: false,
    tags: [],
    genres: [], // Initialize genres as array
    artists: [{ name: '', image: '' }],
    termsAndConditions: '',
    
    // Recurring event fields - properly initialize
    isRecurring: false,
    recurrenceType: 'daily',
    recurrenceEndDate: '',
    eventExpiryMinutes: 60,
    
    // Media
    eventLogo: '',
    eventImages: [],
    poster: '',
    
    // Ticket Details - Initialize with one empty category
    ticketCategories: [{
      name: '',
      price: '',
      quantity: '',
      convenienceFeeType: 'fixed',
      convenienceFee: '',
      commissionType: 'fixed',
      commission: '',
      seatCategoryId: '',
      multiplier: '1'
    }],
    ticketSaleStartDate: '',
    ticketSaleStartTime: '',
    ticketSaleEndDate: '',
    ticketSaleEndTime: '',
    
    // Layout options
    layoutType: 'general', // 'general' or 'seatmap'
    seatLayout: null
  });

  // Load venues and categories directly
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load venues
        setVenuesLoading(true);
        const { data: venuesData, error: venuesError } = await supabase
          .from('venues')
          .select('*')
          .order('name', { ascending: true });

        if (venuesError) {
          console.error('Error loading venues:', venuesError);
        } else {
          setVenues(venuesData || []);
        }

        // Load categories
        setCategoriesLoading(true);
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (categoriesError) {
          console.error('Error loading categories:', categoriesError);
        } else {
          setCategories(categoriesData || []);
        }
      } catch (error) {
        console.error('Error loading form data:', error);
      } finally {
        setVenuesLoading(false);
        setCategoriesLoading(false);
      }
    };

    loadData();
  }, []);

  const dataLoading = categoriesLoading || venuesLoading;

  // Get seat categories for selected venue
  const selectedVenue = venues.find(v => v.id === formData.venue);
  const { categories: seatCategories } = useSeatCategories(selectedVenue?.id);

  // Load event data when venues are available
  useEffect(() => {
    if (event && venues.length > 0) {
      // Editing existing event
      const eventDate = new Date(event.start_datetime);
      const saleStartDate = new Date(event.sale_start);
      const saleEndDate = new Date(event.sale_end);
      
      // Get venue details to set state and city
      const eventVenue = venues.find(v => v.id === event.venue_id);
      
      // Check if event has seat layouts
      const checkSeatLayouts = async () => {
        const { data: layouts } = await supabase
          .from('seat_layouts')
          .select('*')
          .eq('event_id', event.id)
          .eq('is_active', true);
        
        const hasLayouts = layouts && layouts.length > 0;
        
        // Parse genres - handle both JSON string and direct array
        let genresArray = [];
        if (event.genres) {
          if (typeof event.genres === 'string') {
            try {
              genresArray = JSON.parse(event.genres);
            } catch {
              genresArray = [event.genres];
            }
          } else if (Array.isArray(event.genres)) {
            genresArray = event.genres;
          }
        } else if (event.genre) {
          genresArray = [event.genre];
        }
        
        // Parse tags - handle both event_tags and tags fields
        let tagsArray = [];
        const tagsSource = event.event_tags || event.tags;
        if (tagsSource) {
          if (typeof tagsSource === 'string') {
            try {
              tagsArray = JSON.parse(tagsSource);
            } catch {
              // If it's not JSON, split by comma
              tagsArray = tagsSource.split(',').map(tag => tag.trim()).filter(tag => tag);
            }
          } else if (Array.isArray(tagsSource)) {
            tagsArray = tagsSource;
          }
        }
        
        // Parse event images if they exist
        let imagesArray = [];
        if (event.event_images) {
          if (typeof event.event_images === 'string') {
            try {
              imagesArray = JSON.parse(event.event_images);
            } catch {
              imagesArray = event.event_images.split(',').map(img => img.trim()).filter(img => img);
            }
          } else if (Array.isArray(event.event_images)) {
            imagesArray = event.event_images;
          }
        }
        
        // FIXED: Parse artists data properly from the database
        let artistsArray = [{ name: '', image: '' }]; // Default fallback
        
        // First try to parse from the artists JSON field
        if (event.artists) {
          if (typeof event.artists === 'string') {
            try {
              const parsedArtists = JSON.parse(event.artists);
              if (Array.isArray(parsedArtists) && parsedArtists.length > 0) {
                artistsArray = parsedArtists.filter(artist => artist.name && artist.name.trim() !== '');
              }
            } catch (e) {
              console.error('Error parsing artists JSON:', e);
            }
          } else if (Array.isArray(event.artists)) {
            artistsArray = event.artists.filter(artist => artist.name && artist.name.trim() !== '');
          }
        }
        
        // If no valid artists from JSON, fall back to individual artist fields
        if (artistsArray.length === 0 || (artistsArray.length === 1 && !artistsArray[0].name)) {
          if (event.artist_name) {
            artistsArray = [{ 
              name: event.artist_name || '', 
              image: event.artist_image || '' 
            }];
          }
        }
        
        // Ensure we always have at least one artist entry for the form
        if (artistsArray.length === 0) {
          artistsArray = [{ name: '', image: '' }];
        }
        
        console.log('Loaded artists for editing:', artistsArray);
        
        setFormData(prev => ({
          ...prev,
          eventId: event.id, 
          name: event.name || '',
          description: event.description || '',
          category: event.category || '',
          subCategory: event.sub_category || '',
          genre: event.genre || '',
          genres: genresArray, 
          tags: tagsArray, // Set parsed tags
          date: eventDate.toISOString().split('T')[0],
          time: eventDate.toTimeString().slice(0, 5),
          venue: event.venue_id || '',
          // Use state and city from event table first, then fallback to venue
          state: event.state || eventVenue?.state || '',
          city: event.city || eventVenue?.city || '',
          isFeatured: event.is_featured || false,
          isRegular: event.is_regular || false,
          // Add recurring event fields
          isRecurring: event.is_recurring || false,
          recurrenceType: event.recurrence_type || 'daily',
          recurrenceEndDate: event.recurrence_end_date || '',
          eventExpiryMinutes: event.event_expiry_minutes || 60,
          poster: event.poster || '',
          eventLogo: event.event_logo || '',
          eventImages: imagesArray,
          artists: artistsArray, // Use the properly parsed artists array
          termsAndConditions: event.terms_and_conditions || '',
          ticketSaleStartDate: saleStartDate.toISOString().split('T')[0],
          ticketSaleStartTime: saleStartDate.toTimeString().slice(0, 5),
          ticketSaleEndDate: saleEndDate.toISOString().split('T')[0],
          ticketSaleEndTime: saleEndDate.toTimeString().slice(0, 5),
          layoutType: event.layout_type || (hasLayouts ? 'seatmap' : 'general'),
          language: event.language || '',
          duration: event.duration ? event.duration.toString() : ''
        }));
      };

      checkSeatLayouts();
      
      // FIXED: Properly load existing pricing data with better error handling
      const fetchExistingPricing = async () => {
        try {
          console.log('Loading existing pricing data for event:', event.id);

          // Load pricing data with full columns
          const { data: pricingData, error: pricingError } = await supabase
            .from('event_seat_pricing')
            .select(`
              *,
              seat_categories (
                id,
                name,
                color,
                base_price
              )
            `)
            .eq('event_id', event.id);

          if (pricingError) {
            console.error('Error fetching pricing data:', pricingError);
            return;
          }

          console.log('Loaded existing pricing data:', pricingData);

          // FIXED: Create ticket categories based on existing pricing data with proper handling of all fee types
          if (pricingData && pricingData.length > 0) {
            const ticketCategories = pricingData.map((pricing: any) => {
              // Use the new columns if they exist, otherwise fall back to calculated values
              const convenienceFeeValue = pricing.convenience_fee_value !== undefined ? pricing.convenience_fee_value : pricing.convenience_fee || 0;
              const convenienceFeeType = pricing.convenience_fee_type || 'fixed';
              const commissionValue = pricing.commission_value !== undefined ? pricing.commission_value : pricing.commission || 0;
              const commissionType = pricing.commission_type || 'fixed';
              
              console.log('Processing pricing entry:', {
                categoryName: pricing.seat_categories?.name,
                basePrice: pricing.base_price,
                convenienceFeeValue,
                convenienceFeeType,
                commissionValue,
                commissionType
              });
              
              return {
                name: pricing.seat_categories?.name || '',
                price: pricing.base_price?.toString() || '0',
                quantity: '100', // Default quantity since it's not stored in pricing table
                convenienceFeeType: convenienceFeeType,
                convenienceFee: convenienceFeeValue.toString(),
                commissionType: commissionType,
                commission: commissionValue.toString(),
                seatCategoryId: pricing.seat_category_id || '',
                multiplier: '1'
              };
            });

            console.log('Converted to ticket categories:', ticketCategories);

            setFormData(prev => ({
              ...prev,
              ticketCategories
            }));
          } else {
            console.log('No existing pricing data found, using default category');
          }
        } catch (err) {
          console.error('Exception while fetching existing pricing:', err);
        }
      };

      fetchExistingPricing();
    } else if (copyFromEvent && venues.length > 0) {
      // Copying from existing event
      const eventDate = new Date(copyFromEvent.start_datetime);
      const saleStartDate = new Date(copyFromEvent.sale_start);
      const saleEndDate = new Date(copyFromEvent.sale_end);
      
      // Get venue details to set state and city
      const eventVenue = venues.find(v => v.id === copyFromEvent.venue_id);
      
      // Parse genres - convert from string to array if needed
      let genresArray = [];
      if (copyFromEvent.genre) {
        genresArray = typeof copyFromEvent.genre === 'string' ? [copyFromEvent.genre] : copyFromEvent.genre;
      }
      
      // Parse tags from copyFromEvent
      let tagsArray = [];
      const tagsSource = copyFromEvent.event_tags || copyFromEvent.tags;
      if (tagsSource) {
        if (typeof tagsSource === 'string') {
          try {
            tagsArray = JSON.parse(tagsSource);
          } catch {
            tagsArray = tagsSource.split(',').map(tag => tag.trim()).filter(tag => tag);
          }
        } else if (Array.isArray(tagsSource)) {
          tagsArray = tagsSource;
        }
      }
      
      // FIXED: Parse artists data properly when copying
      let artistsArray = [{ name: '', image: '' }]; // Default fallback
      
      // First try to parse from the artists JSON field
      if (copyFromEvent.artists) {
        if (typeof copyFromEvent.artists === 'string') {
          try {
            const parsedArtists = JSON.parse(copyFromEvent.artists);
            if (Array.isArray(parsedArtists) && parsedArtists.length > 0) {
              artistsArray = parsedArtists.filter(artist => artist.name && artist.name.trim() !== '');
            }
          } catch (e) {
            console.error('Error parsing artists JSON when copying:', e);
          }
        } else if (Array.isArray(copyFromEvent.artists)) {
          artistsArray = copyFromEvent.artists.filter(artist => artist.name && artist.name.trim() !== '');
        }
      }
      
      // If no valid artists from JSON, fall back to individual artist fields
      if (artistsArray.length === 0 || (artistsArray.length === 1 && !artistsArray[0].name)) {
        if (copyFromEvent.artist_name) {
          artistsArray = [{ 
            name: copyFromEvent.artist_name || '', 
            image: copyFromEvent.artist_image || '' 
          }];
        }
      }
      
      // Ensure we always have at least one artist entry for the form
      if (artistsArray.length === 0) {
        artistsArray = [{ name: '', image: '' }];
      }
      
      console.log('Loaded artists for copying:', artistsArray);
      
      setFormData(prev => ({
        ...prev,
        eventId: null, // This is a copy, so it gets a new ID when saved
        name: `${copyFromEvent.name} (Copy)`,
        description: copyFromEvent.description || '',
        category: copyFromEvent.category || '',
        subCategory: copyFromEvent.sub_category || '',
        genre: copyFromEvent.genre || '',
        genres: genresArray, // Set genres array
        tags: tagsArray, // Set copied tags
        date: eventDate.toISOString().split('T')[0],
        time: eventDate.toTimeString().slice(0, 5),
        venue: copyFromEvent.venue_id || '',
        // Use state and city from event table first, then fallback to venue
        state: copyFromEvent.state || eventVenue?.state || '',
        city: copyFromEvent.city || eventVenue?.city || '',
        isFeatured: copyFromEvent.is_featured || false,
        isRegular: copyFromEvent.is_regular || false,
        poster: copyFromEvent.poster || '',
        eventLogo: copyFromEvent.event_logo || '',
        eventImages: copyFromEvent.event_images ? (typeof copyFromEvent.event_images === 'string' ? copyFromEvent.event_images.split(',') : copyFromEvent.event_images) : [],
        artists: artistsArray, // Use the properly parsed artists array
        termsAndConditions: copyFromEvent.terms_and_conditions || '',
        ticketSaleStartDate: saleStartDate.toISOString().split('T')[0],
        ticketSaleStartTime: saleStartDate.toTimeString().slice(0, 5),
        ticketSaleEndDate: saleEndDate.toISOString().split('T')[0],
        ticketSaleEndTime: saleEndDate.toTimeString().slice(0, 5),
        layoutType: copyFromEvent.layout_type || 'general', // Copy layout type
        language: copyFromEvent.language || '',
        duration: copyFromEvent.duration ? copyFromEvent.duration.toString() : ''
      }));
    }
  }, [event, copyFromEvent, venues]);

  const handleCategoryChange = (categoryName: string) => {
    setFormData(prev => ({ ...prev, category: categoryName }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Event name is required');
      return false;
    }
    if (!formData.category) {
      toast.error('Event category is required');
      return false;
    }
    if (!formData.venue) {
      toast.error('Venue is required');
      return false;
    }
    
    // Fixed validation for recurring vs regular vs single events
    if (formData.isRecurring) {
      // For recurring events, check required fields
      if (!formData.date) {
        toast.error('Start date is required for recurring events');
        return false;
      }
      if (!formData.recurrenceEndDate) {
        toast.error('End date is required for recurring events');
        return false;
      }
      if (!formData.recurrenceType) {
        toast.error('Recurrence pattern is required for recurring events');
        return false;
      }
    } else if (formData.isRegular) {
      // For regular events, check if either specific dates or end date is provided
      if (formData.regularEventDates.length === 0 && !formData.regularEventEndDate) {
        toast.error('Regular event requires either specific dates or an end date');
        return false;
      }
      // If using end date but no specific dates, require a start date
      if (formData.regularEventEndDate && formData.regularEventDates.length === 0 && !formData.date) {
        toast.error('Start date is required for regular events with end date');
        return false;
      }
    } else {
      // For single events, date is required
      if (!formData.date) {
        toast.error('Event date is required');
        return false;
      }
    }
    
    if (!formData.time) {
      toast.error('Event time is required');
      return false;
    }
    if (!formData.ticketSaleStartDate || !formData.ticketSaleStartTime) {
      toast.error('Ticket sale start date and time are required');
      return false;
    }
    if (!formData.ticketSaleEndDate || !formData.ticketSaleEndTime) {
      toast.error('Ticket sale end date and time are required');
      return false;
    }
    
    // Validate ticket categories
    for (let i = 0; i < formData.ticketCategories.length; i++) {
      const category = formData.ticketCategories[i];
      if (!category.name.trim()) {
        toast.error(`Ticket category ${i + 1} name is required`);
        return false;
      }
      if (!category.price || parseFloat(category.price) <= 0) {
        toast.error(`Ticket category ${i + 1} price is required and must be greater than 0`);
        return false;
      }
      if (!category.quantity || parseInt(category.quantity) <= 0) {
        toast.error(`Ticket category ${i + 1} quantity is required and must be greater than 0`);
        return false;
      }
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    
    try {
      // Use the refactored save function which handles all the missing fields
      const success = await saveEventForm(formData, event, onClose);
      
      if (!success) {
        setSaving(false);
        return;
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error(`Failed to save event: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-8">Loading form data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Button>
          <h1 className="text-3xl font-bold">
            {event ? 'Edit Event' : copyFromEvent ? 'Copy Event' : 'Create Event'}
          </h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Event'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
        </CardHeader>
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Details</TabsTrigger>
              <TabsTrigger value="tickets">Ticket Details</TabsTrigger>
              <TabsTrigger value="seatlayout">Seat Layout</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="mt-6">
              <EventFormBasicDetails
                formData={formData}
                setFormData={setFormData}
                venues={venues}
                categories={categories}
                loading={dataLoading}
                onCategoryChange={handleCategoryChange}
              />
            </TabsContent>
            
            <TabsContent value="tickets" className="mt-6">
              <EventFormTicketDetails
                formData={formData}
                setFormData={setFormData}
              />
            </TabsContent>
            
            <TabsContent value="seatlayout" className="mt-6">
              <EventFormSeatLayout
                formData={formData}
                setFormData={setFormData}
                seatCategories={seatCategories}
              />
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>
  );
};

export default EventFormRefactored;
