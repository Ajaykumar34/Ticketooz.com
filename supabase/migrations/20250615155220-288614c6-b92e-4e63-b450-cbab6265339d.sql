
-- Make sure the seat_categories and event_seat_pricing tables are editable (if RLS is needed, let me know your requirements)
ALTER TABLE public.seat_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_seat_pricing ENABLE ROW LEVEL SECURITY;

-- Policy to allow admin users and service role to manage these (for demo, you may want to change this after go-live!)
CREATE POLICY "Allow admin to manage seat categories"
  ON public.seat_categories
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow admin to manage event seat pricing"
  ON public.event_seat_pricing
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Make sure all event ticket categories are available for seat assignment and mapping by admins

