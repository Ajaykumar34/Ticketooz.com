
-- Create a more robust seat layout system
CREATE TABLE IF NOT EXISTS public.seat_layouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rows INTEGER NOT NULL DEFAULT 10,
  columns INTEGER NOT NULL DEFAULT 10,
  layout_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create individual seats table for better management
CREATE TABLE IF NOT EXISTS public.seats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seat_layout_id UUID REFERENCES public.seat_layouts(id) ON DELETE CASCADE,
  seat_number TEXT NOT NULL,
  row_label TEXT NOT NULL,
  column_position INTEGER NOT NULL,
  row_position INTEGER NOT NULL,
  seat_category_id UUID REFERENCES public.seat_categories(id),
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  is_passage BOOLEAN NOT NULL DEFAULT false,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event-specific seat pricing
CREATE TABLE IF NOT EXISTS public.event_seat_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  seat_category_id UUID REFERENCES public.seat_categories(id),
  base_price NUMERIC NOT NULL,
  convenience_fee NUMERIC DEFAULT 0,
  commission NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create seat bookings for tracking individual seat reservations
CREATE TABLE IF NOT EXISTS public.seat_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  seat_id UUID REFERENCES public.seats(id),
  event_id UUID REFERENCES public.events(id),
  seat_number TEXT NOT NULL,
  seat_category TEXT,
  price_paid NUMERIC NOT NULL,
  status TEXT DEFAULT 'booked',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_seats_layout_id ON public.seats(seat_layout_id);
CREATE INDEX IF NOT EXISTS idx_seats_category_id ON public.seats(seat_category_id);
CREATE INDEX IF NOT EXISTS idx_event_seat_pricing_event_id ON public.event_seat_pricing(event_id);
CREATE INDEX IF NOT EXISTS idx_seat_bookings_event_id ON public.seat_bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_seat_bookings_booking_id ON public.seat_bookings(booking_id);

-- Add unique constraints
ALTER TABLE public.seats ADD CONSTRAINT unique_seat_position UNIQUE (seat_layout_id, row_position, column_position);
ALTER TABLE public.event_seat_pricing ADD CONSTRAINT unique_event_category_pricing UNIQUE (event_id, seat_category_id);
