
-- Create global seat categories table for venue management
CREATE TABLE public.global_seat_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#4ECDC4',
  base_price NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default global seat categories
INSERT INTO public.global_seat_categories (name, color, base_price, description) VALUES
('General', '#4ECDC4', 0, 'Standard seating area'),
('VIP', '#FFD700', 0, 'Premium seating with exclusive amenities'),
('Premium', '#FF6B6B', 0, 'Enhanced seating experience'),
('Balcony', '#45B7D1', 0, 'Upper level seating'),
('Box', '#96CEB4', 0, 'Private box seating'),
('Orchestra', '#FFEAA7', 0, 'Front section seating'),
('Mezzanine', '#DDA0DD', 0, 'Mid-level seating'),
('Economy', '#98D8C8', 0, 'Budget-friendly seating');

-- Update carousel_slides table to include city field
ALTER TABLE public.carousel_slides 
ADD COLUMN city TEXT;

-- Create index for city-based carousel queries
CREATE INDEX idx_carousel_slides_city ON public.carousel_slides(city, is_active, sort_order);

-- Update existing carousel slides to have a default city
UPDATE public.carousel_slides SET city = 'All Cities' WHERE city IS NULL;
