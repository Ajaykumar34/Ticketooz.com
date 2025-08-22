export interface SeatPricingData {
  id: string;
  event_id: string;
  seat_category_id: string | null;
  base_price: number;
  convenience_fee?: number;
  commission?: number;
  convenience_fee_type?: 'fixed' | 'percentage';
  convenience_fee_value?: number;
  commission_type?: 'fixed' | 'percentage';
  commission_value?: number;
  is_active: boolean;
  calculated_convenience_fee?: number;
  total_price?: number;
  available_tickets?: number;
  total_tickets?: number;
  seat_categories?: {
    id: string;
    name: string;
    color: string;
    base_price?: number;
  };
}

export interface CalculatedSeatPricing {
  basePrice: number;
  convenienceFee: number;
  totalPrice: number;
  commission: number;
}

export interface SeatPricingResult {
  price: number;
  convenience_fee: number;
  total_price: number;
  category: string;
  seat_number: string;
  quantity: string;
  seat_category: string;
  total_quantity: string;
  available_quantity: string;
  // Additional display data
  id?: string;
  row_name?: string;
  category_name?: string;
  seat_categories?: any;
  color?: string;
}