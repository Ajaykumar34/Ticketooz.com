
-- Add convenience_fee column to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS convenience_fee DECIMAL(10,2) DEFAULT 0;

-- Add comment to document the column purpose
COMMENT ON COLUMN public.bookings.convenience_fee IS 'Convenience fee charged for the booking (includes GST)';

-- Update existing bookings to have a default convenience fee of 0 if null
UPDATE public.bookings 
SET convenience_fee = 0 
WHERE convenience_fee IS NULL;
