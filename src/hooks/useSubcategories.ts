
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Subcategory {
  id: string;
  name: string;
  description?: string;
  category_id: string;
  is_active: boolean;
}

export function useSubcategories(categoryName?: string) {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubcategories = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('subcategories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      // If categoryName is provided, filter by category
      if (categoryName) {
        // First get the category ID
        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('id')
          .eq('name', categoryName)
          .eq('is_active', true)
          .single();

        if (categoryError || !categoryData) {
          setSubcategories([]);
          setLoading(false);
          return;
        }

        query = query.eq('category_id', categoryData.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching subcategories:', error);
        setSubcategories([]);
      } else {
        setSubcategories(data || []);
      }
    } catch (err) {
      console.error('Unexpected error fetching subcategories:', err);
      setSubcategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubcategories();
  }, [categoryName]);

  return { subcategories, loading, refetch: fetchSubcategories };
}
