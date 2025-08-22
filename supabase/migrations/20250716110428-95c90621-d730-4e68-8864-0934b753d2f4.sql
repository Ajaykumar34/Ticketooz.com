
-- Create a new table for subcategories
CREATE TABLE public.subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(category_id, name)
);

-- Enable RLS on subcategories table
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- Create policies for subcategories
CREATE POLICY "Admin full access on subcategories" 
  ON public.subcategories 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow public read access to subcategories" 
  ON public.subcategories 
  FOR SELECT 
  USING (true);

-- Create function to get subcategories by category
CREATE OR REPLACE FUNCTION public.get_subcategories_by_category(category_name TEXT)
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.description,
    s.is_active
  FROM subcategories s
  JOIN categories c ON s.category_id = c.id
  WHERE c.name = category_name
    AND s.is_active = true
    AND c.is_active = true
  ORDER BY s.name;
END;
$$;
