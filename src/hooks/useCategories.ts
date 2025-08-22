
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Category {
  id: string;
  name: string;
  description?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      console.log('useCategories - Fetching categories...');
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });
      
      if (error) {
        console.error("useCategories - Error fetching categories:", error);
      } else {
        console.log("useCategories - Categories fetched:", data);
        setCategories(data || []);
      }
    } catch (error) {
      console.error("useCategories - Error in fetchCategories:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return { categories, loading, refetch: fetchCategories };
}
