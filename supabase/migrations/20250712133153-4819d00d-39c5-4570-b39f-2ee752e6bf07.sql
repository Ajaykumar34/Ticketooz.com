
-- Create event_occurrences table for recurring events
CREATE TABLE public.event_occurrences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  occurrence_date DATE NOT NULL,
  occurrence_time TIME NOT NULL,
  total_tickets INTEGER NOT NULL DEFAULT 0,
  available_tickets INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.event_occurrences ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Allow public read access to event_occurrences" 
  ON public.event_occurrences 
  FOR SELECT 
  USING (true);

-- Create policy for admin access
CREATE POLICY "Admin full access on event_occurrences" 
  ON public.event_occurrences 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_event_occurrences_event_id ON public.event_occurrences(event_id);
CREATE INDEX idx_event_occurrences_date ON public.event_occurrences(occurrence_date);
