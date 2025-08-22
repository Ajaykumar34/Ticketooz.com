import { supabase } from '@/integrations/supabase/client';

/**
 * Initialize general admission categories for an event
 */
export const initializeGeneralAdmissionCategories = async (eventId: string) => {
  try {
    console.log('[GeneralAdmission] Initializing categories for event:', eventId);
    
    const { error } = await supabase.rpc('initialize_general_admission_categories', {
      p_event_id: eventId
    });
    
    if (error) {
      console.error('[GeneralAdmission] Error initializing categories:', error);
      throw error;
    }
    
    console.log('[GeneralAdmission] Successfully initialized categories');
    return true;
  } catch (error) {
    console.error('[GeneralAdmission] Failed to initialize categories:', error);
    throw error;
  }
};

/**
 * Get general admission availability for an event
 */
export const getGeneralAdmissionAvailability = async (eventId: string) => {
  try {
    console.log('[GeneralAdmission] Fetching availability for event:', eventId);
    
    const { data, error } = await supabase.rpc('get_general_admission_availability', {
      p_event_id: eventId
    });
    
    if (error) {
      console.error('[GeneralAdmission] Error fetching availability:', error);
      throw error;
    }
    
    console.log('[GeneralAdmission] Fetched availability:', data);
    return data || [];
  } catch (error) {
    console.error('[GeneralAdmission] Failed to fetch availability:', error);
    throw error;
  }
};

/**
 * Update general admission category pricing
 */
export const updateGeneralAdmissionPricing = async (
  eventId: string,
  categoryId: string,
  updates: {
    base_price?: number;
    convenience_fee?: number;
    commission?: number;
    total_tickets?: number;
    available_tickets?: number;
  }
) => {
  try {
    console.log('[GeneralAdmission] Updating pricing for category:', categoryId, updates);
    
    const { error } = await supabase
      .from('event_seat_pricing')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('event_id', eventId)
      .eq('seat_category_id', categoryId);
    
    if (error) {
      console.error('[GeneralAdmission] Error updating pricing:', error);
      throw error;
    }
    
    console.log('[GeneralAdmission] Successfully updated pricing');
    return true;
  } catch (error) {
    console.error('[GeneralAdmission] Failed to update pricing:', error);
    throw error;
  }
};

/**
 * Create a new general admission category
 */
export const createGeneralAdmissionCategory = async (
  eventId: string,
  categoryData: {
    name: string;
    color?: string;
    base_price: number;
    convenience_fee?: number;
    commission?: number;
    total_tickets: number;
  }
) => {
  try {
    console.log('[GeneralAdmission] Creating new category for event:', eventId, categoryData);
    
    // First create the seat category
    const { data: seatCategory, error: categoryError } = await supabase
      .from('seat_categories')
      .insert({
        event_id: eventId,
        name: categoryData.name,
        color: categoryData.color || '#4ECDC4',
        base_price: categoryData.base_price,
        is_active: true
      })
      .select()
      .single();
    
    if (categoryError) {
      console.error('[GeneralAdmission] Error creating seat category:', categoryError);
      throw categoryError;
    }
    
    // Then create the pricing record
    const { error: pricingError } = await supabase
      .from('event_seat_pricing')
      .insert({
        event_id: eventId,
        seat_category_id: seatCategory.id,
        base_price: categoryData.base_price,
        convenience_fee: categoryData.convenience_fee || 0,
        commission: categoryData.commission || 0,
        total_tickets: categoryData.total_tickets,
        available_tickets: categoryData.total_tickets,
        is_active: true
      });
    
    if (pricingError) {
      console.error('[GeneralAdmission] Error creating pricing record:', pricingError);
      throw pricingError;
    }
    
    console.log('[GeneralAdmission] Successfully created category and pricing');
    return seatCategory;
  } catch (error) {
    console.error('[GeneralAdmission] Failed to create category:', error);
    throw error;
  }
};

/**
 * Check if an event is using general admission
 */
export const isGeneralAdmissionEvent = async (eventId: string): Promise<boolean> => {
  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('layout_type')
      .eq('id', eventId)
      .single();
    
    if (error || !event) {
      return false;
    }
    
    return event.layout_type === 'general';
  } catch (error) {
    console.error('[GeneralAdmission] Error checking event layout type:', error);
    return false;
  }
};

/**
 * Convert seat map event to general admission
 */
export const convertToGeneralAdmission = async (eventId: string) => {
  try {
    console.log('[GeneralAdmission] Converting event to general admission:', eventId);
    
    // Update event layout type
    const { error: eventError } = await supabase
      .from('events')
      .update({ layout_type: 'general' })
      .eq('id', eventId);
    
    if (eventError) {
      console.error('[GeneralAdmission] Error updating event layout type:', eventError);
      throw eventError;
    }
    
    // Initialize general admission categories
    await initializeGeneralAdmissionCategories(eventId);
    
    console.log('[GeneralAdmission] Successfully converted to general admission');
    return true;
  } catch (error) {
    console.error('[GeneralAdmission] Failed to convert to general admission:', error);
    throw error;
  }
};

/**
 * Get booking statistics for general admission event
 */
export const getGeneralAdmissionStats = async (eventId: string) => {
  try {
    const availability = await getGeneralAdmissionAvailability(eventId);
    
    const stats = availability.reduce((acc, category) => {
      acc.totalTickets += category.total_tickets;
      acc.bookedTickets += category.booked_tickets;
      acc.availableTickets += category.available_tickets;
      acc.totalRevenue += category.booked_tickets * category.base_price;
      return acc;
    }, {
      totalTickets: 0,
      bookedTickets: 0,
      availableTickets: 0,
      totalRevenue: 0,
      categories: availability.length,
      occupancyRate: 0
    });
    
    stats.occupancyRate = stats.totalTickets > 0 ? (stats.bookedTickets / stats.totalTickets) * 100 : 0;
    
    return stats;
  } catch (error) {
    console.error('[GeneralAdmission] Failed to get stats:', error);
    throw error;
  }
};