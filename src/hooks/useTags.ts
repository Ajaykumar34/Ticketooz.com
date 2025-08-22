
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Tag {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
  updated_at?: string;
}

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name", { ascending: true });
      
      if (error) {
        console.error("Error fetching tags:", error);
      } else {
        setTags(data || []);
      }
    } catch (error) {
      console.error("Error fetching tags:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  return { tags, loading, refetch: fetchTags };
}
