
-- Update the financial transaction calculation function to use actual pricing from event_seat_pricing
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
  v_pricing_record RECORD;
BEGIN
  -- Get actual pricing from event_seat_pricing table
  SELECT 
    COALESCE(esp.convenience_fee, 0) as convenience_fee,
    COALESCE(esp.commission, 0) as commission,
    COALESCE(esp.convenience_fee_type, 'fixed') as convenience_fee_type,
    COALESCE(esp.convenience_fee_value, 0) as convenience_fee_value,
    COALESCE(esp.commission_type, 'fixed') as commission_type,
    COALESCE(esp.commission_value, 0) as commission_value
  INTO v_pricing_record
  FROM event_seat_pricing esp
  WHERE esp.event_id = p_event_id 
    AND esp.is_active = true
  LIMIT 1;

  -- If no pricing record found, use default values
  IF NOT FOUND THEN
    -- Default convenience fee (2% of ticket price)
    v_convenience_base_fee := p_ticket_price * 0.02;
    v_convenience_fee := v_convenience_base_fee;
    
    -- Default commission (5% of ticket price)
    v_commission := p_ticket_price * 0.05;
    v_actual_commission := v_commission;
  ELSE
    -- Use actual pricing from event_seat_pricing
    -- Calculate convenience fee
    IF v_pricing_record.convenience_fee > 0 THEN
      v_convenience_fee := v_pricing_record.convenience_fee;
      v_convenience_base_fee := v_convenience_fee / 1.18; -- Remove GST to get base
    ELSE
      -- Calculate based on type and value
      IF v_pricing_record.convenience_fee_type = 'percentage' THEN
        v_convenience_base_fee := p_ticket_price * (v_pricing_record.convenience_fee_value / 100);
      ELSE
        v_convenience_base_fee := v_pricing_record.convenience_fee_value;
      END IF;
      v_convenience_fee := v_convenience_base_fee * 1.18; -- Add 18% GST
    END IF;
    
    -- Calculate commission
    IF v_pricing_record.commission > 0 THEN
      v_actual_commission := v_pricing_record.commission / 1.18; -- Remove GST to get base
      v_commission := v_pricing_record.commission;
    ELSE
      -- Calculate based on type and value
      IF v_pricing_record.commission_type = 'percentage' THEN
        v_actual_commission := p_ticket_price * (v_pricing_record.commission_value / 100);
      ELSE
        v_actual_commission := v_pricing_record.commission_value;
      END IF;
      v_commission := v_actual_commission * 1.18; -- Add 18% GST
    END IF;
  END IF;
  
  -- Calculate GST amounts
  v_gst_on_convenience_base_fee := v_convenience_base_fee * 0.18;
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

-- Recreate financial transactions for existing bookings with correct pricing
DELETE FROM financial_transactions;

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
WHERE b.status = 'Confirmed';
