
-- Create RLS policies for admin_users table to fix user management permissions
CREATE POLICY "Admins can view all admin users" 
ON public.admin_users 
FOR SELECT 
USING (true);

CREATE POLICY "Super admins can manage all admin users" 
ON public.admin_users 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Admins can update their own record" 
ON public.admin_users 
FOR UPDATE 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

-- Enable RLS on admin_users table
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create enhanced financial reporting table for better analytics
CREATE TABLE IF NOT EXISTS public.financial_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_name TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('overall', 'event_wise', 'state_wise', 'gst_summary')),
  date_range_start TIMESTAMP WITH TIME ZONE NOT NULL,
  date_range_end TIMESTAMP WITH TIME ZONE NOT NULL,
  report_data JSONB NOT NULL,
  filters_applied JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for financial_reports
ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage financial reports" 
ON public.financial_reports 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create function to calculate percentage-based fees correctly
CREATE OR REPLACE FUNCTION calculate_percentage_fee(base_amount NUMERIC, percentage_value NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
BEGIN
  -- If percentage_value is between 0 and 1, treat it as decimal (e.g., 0.10 for 10%)
  -- If percentage_value is greater than 1, treat it as percentage (e.g., 10 for 10%)
  IF percentage_value <= 1 THEN
    RETURN base_amount * percentage_value;
  ELSE
    RETURN base_amount * (percentage_value / 100);
  END IF;
END;
$$;

-- Create function to update event seat pricing with calculated percentage fees
CREATE OR REPLACE FUNCTION update_event_pricing_with_percentages()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Calculate convenience fee if it's a percentage
  IF NEW.convenience_fee > 1 AND NEW.convenience_fee <= 100 THEN
    NEW.convenience_fee := calculate_percentage_fee(NEW.base_price, NEW.convenience_fee);
  END IF;
  
  -- Calculate commission if it's a percentage  
  IF NEW.commission > 1 AND NEW.commission <= 100 THEN
    NEW.commission := calculate_percentage_fee(NEW.base_price, NEW.commission);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for event_seat_pricing to auto-calculate percentage fees
DROP TRIGGER IF EXISTS trigger_calculate_percentage_fees ON public.event_seat_pricing;
CREATE TRIGGER trigger_calculate_percentage_fees
  BEFORE INSERT OR UPDATE ON public.event_seat_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_event_pricing_with_percentages();

-- Create materialized view for real-time financial analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS public.financial_analytics_summary AS
SELECT 
  DATE_TRUNC('day', ft.created_at) as transaction_date,
  COUNT(*) as transaction_count,
  SUM(ft.ticket_price) as total_ticket_sales,
  SUM(ft.convenience_fee) as total_convenience_fees,
  SUM(ft.commission) as total_commission,
  SUM(ft.actual_commission) as total_actual_commission,
  SUM(ft.gst_on_actual_commission) as total_gst_commission,
  SUM(ft.gst_on_convenience_base_fee) as total_gst_convenience,
  ft.customer_state,
  ft.event_state,
  CASE 
    WHEN ft.customer_state = 'West Bengal' THEN 'WB'
    ELSE 'Other'
  END as customer_gst_category,
  CASE 
    WHEN ft.event_state = 'West Bengal' THEN 'WB' 
    ELSE 'Other'
  END as event_gst_category
FROM public.financial_transactions ft
GROUP BY 
  DATE_TRUNC('day', ft.created_at),
  ft.customer_state,
  ft.event_state;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_financial_analytics_date ON public.financial_analytics_summary(transaction_date);
CREATE INDEX IF NOT EXISTS idx_financial_analytics_state ON public.financial_analytics_summary(customer_state, event_state);

-- Function to refresh financial analytics
CREATE OR REPLACE FUNCTION refresh_financial_analytics()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.financial_analytics_summary;
END;
$$;
