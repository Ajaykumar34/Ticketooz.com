
-- Create payments table to track PhonePe transactions
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  merchant_transaction_id TEXT UNIQUE NOT NULL,
  phonepe_transaction_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'PENDING',
  payment_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  response_data JSONB,
  callback_data JSONB
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create policies for payments
CREATE POLICY "Users can view their own payments" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b 
      WHERE b.id = payments.booking_id 
      AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all payments" ON public.payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert payments" ON public.payments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update payments" ON public.payments
  FOR UPDATE USING (true);

-- Add updated_at trigger
CREATE TRIGGER payments_updated_at 
  BEFORE UPDATE ON public.payments 
  FOR EACH ROW 
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX idx_payments_merchant_transaction_id ON public.payments(merchant_transaction_id);
CREATE INDEX idx_payments_status ON public.payments(status);
