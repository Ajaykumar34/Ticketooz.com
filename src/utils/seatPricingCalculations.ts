
import { SeatPricingData, CalculatedSeatPricing } from '@/types/pricing';

/**
 * Calculate convenience fee based on type and value
 */
export const calculateConvenienceFee = (
  basePrice: number,
  feeType: 'fixed' | 'percentage' = 'fixed',
  feeValue: number = 0
): number => {
  if (feeType === 'percentage') {
    return (basePrice * feeValue) / 100;
  }
  return feeValue;
};

/**
 * Calculate commission based on type and value
 */
export const calculateCommission = (
  basePrice: number,
  commissionType: 'fixed' | 'percentage' = 'fixed',
  commissionValue: number = 0
): number => {
  if (commissionType === 'percentage') {
    return (basePrice * commissionValue) / 100;
  }
  return commissionValue;
};

/**
 * Get pricing for a specific seat category
 */
export const getSeatCategoryPricing = (
  seatCategoryId: string | null,
  pricingData: SeatPricingData[]
): CalculatedSeatPricing => {
  console.log('[SeatPricing] Getting pricing for category:', seatCategoryId);
  console.log('[SeatPricing] Available pricing data:', pricingData.map(p => ({
    seat_category_id: p.seat_category_id,
    base_price: p.base_price,
    convenience_fee: p.convenience_fee,
    convenience_fee_type: p.convenience_fee_type,
    convenience_fee_value: p.convenience_fee_value
  })));

  // Find category-specific pricing
  const categoryPricing = pricingData.find(p => p.seat_category_id === seatCategoryId);
  
  if (categoryPricing) {
    const basePrice = categoryPricing.base_price || 0;
    
    // Calculate convenience fee
    let convenienceFee = 0;
    if (categoryPricing.convenience_fee_type && categoryPricing.convenience_fee_value !== undefined) {
      convenienceFee = calculateConvenienceFee(
        basePrice,
        categoryPricing.convenience_fee_type,
        categoryPricing.convenience_fee_value
      );
      console.log('[SeatPricing] Calculated convenience fee:', {
        basePrice,
        type: categoryPricing.convenience_fee_type,
        value: categoryPricing.convenience_fee_value,
        result: convenienceFee
      });
    } else if (categoryPricing.convenience_fee !== undefined) {
      convenienceFee = categoryPricing.convenience_fee;
      console.log('[SeatPricing] Using raw convenience fee:', convenienceFee);
    }
    
    // Calculate commission
    const commission = categoryPricing.commission_type && categoryPricing.commission_value !== undefined
      ? calculateCommission(basePrice, categoryPricing.commission_type, categoryPricing.commission_value)
      : (categoryPricing.commission || 0);

    const result = {
      basePrice,
      convenienceFee,
      totalPrice: basePrice + convenienceFee,
      commission
    };
    
    console.log('[SeatPricing] Final pricing for category:', seatCategoryId, result);
    return result;
  }

  // Fallback to general event pricing
  const generalPricing = pricingData.find(p => p.seat_category_id === null);
  if (generalPricing) {
    const basePrice = generalPricing.base_price || 0;
    
    let convenienceFee = 0;
    if (generalPricing.convenience_fee_type && generalPricing.convenience_fee_value !== undefined) {
      convenienceFee = calculateConvenienceFee(
        basePrice,
        generalPricing.convenience_fee_type,
        generalPricing.convenience_fee_value
      );
    } else if (generalPricing.convenience_fee !== undefined) {
      convenienceFee = generalPricing.convenience_fee;
    }
    
    const commission = generalPricing.commission_type && generalPricing.commission_value !== undefined
      ? calculateCommission(basePrice, generalPricing.commission_type, generalPricing.commission_value)
      : (generalPricing.commission || 0);

    const result = {
      basePrice,
      convenienceFee,
      totalPrice: basePrice + convenienceFee,
      commission
    };
    
    console.log('[SeatPricing] Using general pricing:', result);
    return result;
  }

  // Final fallback
  console.log('[SeatPricing] Using default fallback pricing');
  return {
    basePrice: 500,
    convenienceFee: 50,
    totalPrice: 550,
    commission: 0
  };
};

/**
 * Get pricing for a specific seat - Enhanced version with better category ID extraction
 */
export const getSeatPricing = (seat: any, pricingData: SeatPricingData[]): CalculatedSeatPricing => {
  console.log('[SeatPricing] Processing seat for pricing:', {
    seatId: seat?.id,
    seatNumber: seat?.seat_number,
    rowName: seat?.row_name,
    seatObject: seat
  });

  // Enhanced seat category ID extraction with multiple fallback options
  let seatCategoryId = null;
  
  // Try different ways to get the seat category ID
  if (seat?.seat_category_id) {
    seatCategoryId = seat.seat_category_id;
    console.log('[SeatPricing] Found seat_category_id directly:', seatCategoryId);
  } else if (seat?.seat_categories?.id) {
    seatCategoryId = seat.seat_categories.id;
    console.log('[SeatPricing] Found seat category ID from seat_categories object:', seatCategoryId);
  } else if (seat?.category) {
    seatCategoryId = seat.category;
    console.log('[SeatPricing] Found category from legacy field:', seatCategoryId);
  } else {
    console.log('[SeatPricing] No seat category ID found, will use general pricing');
  }

  console.log('[SeatPricing] Final seat category ID for pricing lookup:', seatCategoryId);
  console.log('[SeatPricing] Available pricing data count:', pricingData.length);
  
  return getSeatCategoryPricing(seatCategoryId, pricingData);
};
