
-- Add layout_type column to events table
ALTER TABLE public.events 
ADD COLUMN layout_type text CHECK (layout_type IN ('general', 'seatmap'));

-- Add comment to describe the column
COMMENT ON COLUMN public.events.layout_type IS 'Layout type selected by admin: general for general admission, seatmap for seat map layout';
