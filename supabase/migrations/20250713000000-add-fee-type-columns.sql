
-- Add columns to store fee types and original values in event_seat_pricing table
ALTER TABLE public.event_seat_pricing 
ADD COLUMN IF NOT EXISTS convenience_fee_type text DEFAULT 'fixed',
ADD COLUMN IF NOT EXISTS convenience_fee_value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_type text DEFAULT 'fixed', 
ADD COLUMN IF NOT EXISTS commission_value numeric DEFAULT 0;

-- Add check constraints for fee types
ALTER TABLE public.event_seat_pricing 
DROP CONSTRAINT IF EXISTS check_convenience_fee_type,
ADD CONSTRAINT check_convenience_fee_type 
CHECK (convenience_fee_type IN ('fixed', 'percentage'));

ALTER TABLE public.event_seat_pricing 
DROP CONSTRAINT IF EXISTS check_commission_type,
ADD CONSTRAINT check_commission_type 
CHECK (commission_type IN ('fixed', 'percentage'));

-- Add comments for clarity
COMMENT ON COLUMN public.event_seat_pricing.convenience_fee_type IS 'Type of convenience fee: fixed (amount) or percentage';
COMMENT ON COLUMN public.event_seat_pricing.convenience_fee_value IS 'Original convenience fee value (before calculation)';
COMMENT ON COLUMN public.event_seat_pricing.commission_type IS 'Type of commission: fixed (amount) or percentage';
COMMENT ON COLUMN public.event_seat_pricing.commission_value IS 'Original commission value (before calculation)';
