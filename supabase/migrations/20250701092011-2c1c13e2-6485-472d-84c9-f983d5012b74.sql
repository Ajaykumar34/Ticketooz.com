
-- Create a function to calculate financial metrics from booking data
CREATE OR REPLACE FUNCTION calculate_financial_transaction_data(
  p_booking_id UUID,
  p_event_id UUID,
  p_ticket_price NUMERIC,
  p_quantity INTEGER,
  p_customer_state TEXT DEFAULT 'Unknown',
  p_event_state TEXT DEFAULT 'Unknown'
) RETURNS TABLE (
  convenience_fee NUMERIC,
  convenience_base_fee NUMERIC,
  commission NUMERIC,
  actual_commission NUMERIC,
  gst_on_actual_commission NUMERIC,
  gst_on_convenience_base_fee NUMERIC,
  reimbursable_ticket_price NUMERIC
) AS $$
DECLARE
  v_convenience_fee NUMERIC := 0;
  v_convenience_base_fee NUMERIC := 0;
  v_commission NUMERIC := 0;
  v_actual_commission NUMERIC := 0;
  v_gst_on_actual_commission NUMERIC := 0;
  v_gst_on_convenience_base_fee NUMERIC := 0;
  v_reimbursable_ticket_price NUMERIC := 0;
  v_is_wb_event BOOLEAN := FALSE;
  v_is_wb_customer BOOLEAN := FALSE;
BEGIN
  -- Determine if WB event/customer
  v_is_wb_event := (p_event_state = 'West Bengal');
  v_is_wb_customer := (p_customer_state = 'West Bengal');
  
  -- Calculate convenience fee (2% of ticket price)
  v_convenience_base_fee := p_ticket_price * 0.02;
  v_convenience_fee := v_convenience_base_fee;
  
  -- Add GST on convenience fee (18%)
  v_gst_on_convenience_base_fee := v_convenience_base_fee * 0.18;
  v_convenience_fee := v_convenience_base_fee + v_gst_on_convenience_base_fee;
  
  -- Calculate commission (5% of ticket price)
  v_commission := p_ticket_price * 0.05;
  v_actual_commission := v_commission;
  
  -- Add GST on commission (18%)
  v_gst_on_actual_commission := v_actual_commission * 0.18;
  
  -- Calculate reimbursable ticket price (ticket price minus commission)
  v_reimbursable_ticket_price := p_ticket_price - v_actual_commission;
  
  RETURN QUERY SELECT 
    v_convenience_fee,
    v_convenience_base_fee,
    v_commission,
    v_actual_commission,
    v_gst_on_actual_commission,
    v_gst_on_convenience_base_fee,
    v_reimbursable_ticket_price;
END;
$$ LANGUAGE plpgsql;

-- Create a function to generate financial transactions from bookings
CREATE OR REPLACE FUNCTION create_financial_transaction_from_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_event_state TEXT := 'Unknown';
  v_customer_state TEXT := 'Unknown';
  v_financial_data RECORD;
BEGIN
  -- Only process confirmed bookings
  IF NEW.status != 'Confirmed' THEN
    RETURN NEW;
  END IF;
  
  -- Get event state from venue
  SELECT COALESCE(v.state, 'Unknown') INTO v_event_state
  FROM events e
  LEFT JOIN venues v ON e.venue_id = v.id
  WHERE e.id = NEW.event_id;
  
  -- Get customer state from profile
  SELECT COALESCE(p.state, 'Unknown') INTO v_customer_state
  FROM profiles p
  WHERE p.id = NEW.user_id;
  
  -- Calculate financial data
  SELECT * INTO v_financial_data
  FROM calculate_financial_transaction_data(
    NEW.id,
    NEW.event_id,
    (NEW.total_price / NEW.quantity), -- Average ticket price
    NEW.quantity,
    v_customer_state,
    v_event_state
  );
  
  -- Insert financial transaction record
  INSERT INTO financial_transactions (
    booking_id,
    event_id,
    ticket_price,
    convenience_fee,
    convenience_base_fee,
    commission,
    actual_commission,
    gst_on_actual_commission,
    gst_on_convenience_base_fee,
    reimbursable_ticket_price,
    is_wb_customer,
    is_wb_event,
    customer_state,
    event_state,
    created_at
  ) VALUES (
    NEW.id,
    NEW.event_id,
    (NEW.total_price / NEW.quantity),
    v_financial_data.convenience_fee,
    v_financial_data.convenience_base_fee,
    v_financial_data.commission,
    v_financial_data.actual_commission,
    v_financial_data.gst_on_actual_commission,
    v_financial_data.gst_on_convenience_base_fee,
    v_financial_data.reimbursable_ticket_price,
    (v_customer_state = 'West Bengal'),
    (v_event_state = 'West Bengal'),
    v_customer_state,
    v_event_state,
    NEW.created_at
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically generate financial transactions
DROP TRIGGER IF EXISTS trigger_create_financial_transaction ON bookings;
CREATE TRIGGER trigger_create_financial_transaction
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_financial_transaction_from_booking();

-- Generate financial transactions for existing confirmed bookings
INSERT INTO financial_transactions (
  booking_id,
  event_id,
  ticket_price,
  convenience_fee,
  convenience_base_fee,
  commission,
  actual_commission,
  gst_on_actual_commission,
  gst_on_convenience_base_fee,
  reimbursable_ticket_price,
  is_wb_customer,
  is_wb_event,
  customer_state,
  event_state,
  created_at
)
SELECT 
  b.id,
  b.event_id,
  (b.total_price / b.quantity) as ticket_price,
  ft.convenience_fee,
  ft.convenience_base_fee,
  ft.commission,
  ft.actual_commission,
  ft.gst_on_actual_commission,
  ft.gst_on_convenience_base_fee,
  ft.reimbursable_ticket_price,
  (COALESCE(p.state, 'Unknown') = 'West Bengal') as is_wb_customer,
  (COALESCE(v.state, 'Unknown') = 'West Bengal') as is_wb_event,
  COALESCE(p.state, 'Unknown') as customer_state,
  COALESCE(v.state, 'Unknown') as event_state,
  b.created_at
FROM bookings b
LEFT JOIN profiles p ON b.user_id = p.id
LEFT JOIN events e ON b.event_id = e.id
LEFT JOIN venues v ON e.venue_id = v.id
CROSS JOIN LATERAL calculate_financial_transaction_data(
  b.id,
  b.event_id,
  (b.total_price / b.quantity),
  b.quantity,
  COALESCE(p.state, 'Unknown'),
  COALESCE(v.state, 'Unknown')
) ft
WHERE b.status = 'Confirmed'
  AND NOT EXISTS (
    SELECT 1 FROM financial_transactions ft2 
    WHERE ft2.booking_id = b.id
  );
