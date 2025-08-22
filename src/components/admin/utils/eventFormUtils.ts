
import { supabase } from '@/integrations/supabase/client';

// Remove the automatic creation of default categories
export const createDefaultSeatCategories = async (eventId: string) => {
  // This function now does nothing - categories are only created when manually added
  console.log('createDefaultSeatCategories called but no default categories will be created for event:', eventId);
  return;
};

export const getInitialFormData = (event?: any) => ({
  // Store event ID for seat categories
  eventId: event?.id || null,
  
  // Basic Details
  name: '',
  description: '',
  category: '',
  subCategory: '',
  language: '',
  genres: [],
  state: '',
  city: '',
  venue: '',
  date: '',
  time: '',
  duration: '3',
  isFeatured: false,
  hasSeatMap: false,
  useSeatMap: false,
  tags: [],
  artists: [{ name: '', image: '' }],
  termsAndConditions: '',
  
  // Media
  eventLogo: '',
  eventImages: [],
  poster: '',
  
  // Ticket Details - Start with only one empty category
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
