
-- Remove the trigger that automatically calculates percentage fees to prevent double calculation
DROP TRIGGER IF EXISTS trigger_calculate_percentage_fees ON public.event_seat_pricing;
DROP FUNCTION IF EXISTS update_event_pricing_with_percentages();

-- Remove the helper function as we're now calculating fees in the application layer
DROP FUNCTION IF EXISTS calculate_percentage_fee(NUMERIC, NUMERIC);

-- Add a comment to clarify the purpose of the new columns
COMMENT ON COLUMN public.event_seat_pricing.convenience_fee IS 'Calculated convenience fee amount (final value to be charged)';
COMMENT ON COLUMN public.event_seat_pricing.commission IS 'Calculated commission amount (final value to be charged)';
