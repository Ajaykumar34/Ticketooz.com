
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useSeatCategories = (eventId: string | null | undefined) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadCategories = async () => {
    if (!eventId || eventId === 'new-event' || eventId === 'new') {
      console.log('useSeatCategories - No valid eventId provided or new event');
      setCategories([]);
      setLoading(false);
      return;
    }

    try {
      console.log('useSeatCategories - Loading categories for event:', eventId);
      setLoading(true);
      
      const { data, error } = await supabase
        .from('seat_categories')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('useSeatCategories - Error:', error);
        throw error;
      }
      
      console.log('useSeatCategories - Categories loaded:', data);
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading seat categories:', error);
      toast({
        title: "Error",
        description: "Failed to load seat categories",
        variant: "destructive",
      });
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const ensureCategoriesExist = async () => {
    if (!eventId || eventId === 'new-event' || eventId === 'new') {
      console.log('useSeatCategories - Cannot ensure categories without valid eventId');
      return [];
    }
    
    try {
      const { data, error } = await supabase
        .from('seat_categories')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true);

      if (error) throw error;

      // Return existing categories only - don't create any defaults
      return data || [];
    } catch (error) {
      console.error('Error ensuring categories exist:', error);
      return [];
    }
  };

  useEffect(() => {
    loadCategories();
  }, [eventId]);

  const createCategory = async (categoryData) => {
    if (!eventId || eventId === 'new-event' || eventId === 'new') {
      toast({
        title: "Error",
        description: "Cannot create category without a valid event ID",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('useSeatCategories - Creating category:', categoryData);
      const { data, error } = await supabase
        .from('seat_categories')
        .insert([{
          ...categoryData,
          event_id: eventId
        }])
        .select()
        .single();

      if (error) throw error;
      console.log('useSeatCategories - Category created:', data);
      await loadCategories();
      return data;
    } catch (error) {
      console.error('Error creating seat category:', error);
      throw error;
    }
  };

  const updateCategory = async (categoryId, categoryData) => {
    try {
      console.log('useSeatCategories - Updating category:', categoryId, categoryData);
      const { data, error } = await supabase
        .from('seat_categories')
        .update(categoryData)
        .eq('id', categoryId)
        .select()
        .single();

      if (error) throw error;
      console.log('useSeatCategories - Category updated:', data);
      await loadCategories();
      return data;
    } catch (error) {
      console.error('Error updating seat category:', error);
      throw error;
    }
  };

  const deleteCategory = async (categoryId) => {
    try {
      console.log('useSeatCategories - Deleting category:', categoryId);
      const { error } = await supabase
        .from('seat_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      console.log('useSeatCategories - Category deleted');
      await loadCategories();
    } catch (error) {
      console.error('Error deleting seat category:', error);
      throw error;
    }
  };

  const saveEventSeatPricing = async (ticketCategories) => {
    if (!eventId || eventId === 'new-event' || eventId === 'new') {
      console.log('useSeatCategories - Cannot save pricing without valid eventId');
      return;
    }

    try {
      console.log('useSeatCategories - Saving event seat pricing:', ticketCategories);
      
      // First, remove existing pricing for this event
      await supabase
        .from('event_seat_pricing')
        .delete()
        .eq('event_id', eventId);

      // Only process categories that have valid data and are not empty
      const validCategories = ticketCategories.filter(cat => 
        cat.name && cat.name.trim() !== '' && 
        cat.price && parseFloat(cat.price) > 0 &&
        cat.quantity && parseInt(cat.quantity) > 0
      );

      if (validCategories.length === 0) {
        console.log('useSeatCategories - No valid categories to save');
        return;
      }

      // DO NOT automatically create seat categories - they should be created manually in event creation form
      // Only save pricing data for existing seat categories that match the ticket category names
      const { data: existingSeatCategories, error: fetchError } = await supabase
        .from('seat_categories')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true);

      if (fetchError) {
        console.error('Error fetching existing seat categories:', fetchError);
        throw fetchError;
      }

      // Create pricing data only for categories that have corresponding seat categories
      const pricingData = [];
      for (const cat of validCategories) {
        const matchingSeatCategory = existingSeatCategories?.find(sc => 
          sc.name.toLowerCase().trim() === cat.name.toLowerCase().trim()
        );

        if (matchingSeatCategory) {
          pricingData.push({
            event_id: eventId,
            seat_category_id: matchingSeatCategory.id,
            base_price: parseFloat(cat.price) || 0,
            convenience_fee: parseFloat(cat.convenienceFee) || 0,
            commission: parseFloat(cat.commission) || 0,
            total_tickets: parseInt(cat.quantity) || 0,
            available_tickets: parseInt(cat.quantity) || 0,
            is_active: true
          });
        } else {
          console.warn(`No matching seat category found for ticket category: ${cat.name}`);
        }
      }

      if (pricingData.length > 0) {
        const { error: pricingError } = await supabase
          .from('event_seat_pricing')
          .insert(pricingData);

        if (pricingError) {
          console.error('Error creating event seat pricing:', pricingError);
          throw pricingError;
        }

        console.log('useSeatCategories - Event seat pricing saved successfully for', pricingData.length, 'categories');
      } else {
        console.log('useSeatCategories - No pricing data to save (no matching seat categories found)');
      }

      await loadCategories();
    } catch (error) {
      console.error('Error saving event seat pricing:', error);
      throw error;
    }
  };

  return {
    categories,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
    refetch: loadCategories,
    ensureCategoriesExist,
    saveEventSeatPricing
  };
};
