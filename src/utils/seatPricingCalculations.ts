
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
 * Get pricing for a specific seat category - Enhanced to handle category name matching
 */
export const getSeatCategoryPricing = (
  seatCategoryId: string | null,
  pricingData: SeatPricingData[]
): CalculatedSeatPricing => {
  console.log('[SeatPricing] Getting pricing for category:', seatCategoryId);
  console.log('[SeatPricing] Available pricing data:', pricingData.map(p => ({
    seat_category_id: p.seat_category_id,
    category_name: p.seat_categories?.name,
    base_price: p.base_price,
    convenience_fee_type: p.convenience_fee_type,
    convenience_fee_value: p.convenience_fee_value
  })));

  // First try to find by exact category ID match
  let categoryPricing = pricingData.find(p => p.seat_category_id === seatCategoryId);
  
  // If no exact match found and we have a seat category ID, try to match by category name
  if (!categoryPricing && seatCategoryId && pricingData.length > 0) {
    // Extract category name from the seat layout (this is a fallback approach)
    // We'll try to match based on typical category names
    const categoryNames = pricingData.map(p => p.seat_categories?.name).filter(Boolean);
    console.log('[SeatPricing] Available category names for fallback:', categoryNames);
    
    // Try to match Premium categories first
    if (categoryNames.includes('Premium')) {
      categoryPricing = pricingData.find(p => p.seat_categories?.name === 'Premium');
      console.log('[SeatPricing] Using Premium category as fallback');
    }
    // Then try General categories
    else if (categoryNames.includes('General')) {
      categoryPricing = pricingData.find(p => p.seat_categories?.name === 'General');
      console.log('[SeatPricing] Using General category as fallback');
    }
  }
  
  if (categoryPricing) {
    const basePrice = categoryPricing.base_price || 0;
    
    // Calculate convenience fee using new pricing structure
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

  // If no specific category found, use the first available pricing as fallback
  if (pricingData.length > 0) {
    const fallbackPricing = pricingData[0];
    const basePrice = fallbackPricing.base_price || 0;
    
    let convenienceFee = 0;
    if (fallbackPricing.convenience_fee_type && fallbackPricing.convenience_fee_value !== undefined) {
      convenienceFee = calculateConvenienceFee(
        basePrice,
        fallbackPricing.convenience_fee_type,
        fallbackPricing.convenience_fee_value
      );
    } else if (fallbackPricing.convenience_fee !== undefined) {
      convenienceFee = fallbackPricing.convenience_fee;
    }
    
    const commission = fallbackPricing.commission_type && fallbackPricing.commission_value !== undefined
      ? calculateCommission(basePrice, fallbackPricing.commission_type, fallbackPricing.commission_value)
      : (fallbackPricing.commission || 0);

    const result = {
      basePrice,
      convenienceFee,
      totalPrice: basePrice + convenienceFee,
      commission
    };
    
    console.log('[SeatPricing] Using fallback pricing from first available category:', result);
    return result;
  }

  // Final fallback - should rarely be used
  console.log('[SeatPricing] Using default fallback pricing - no pricing data available');
  return {
    basePrice: 100,
    convenienceFee: 10,
    totalPrice: 110,
    commission: 0
  };
};

/**
 * Get pricing for a specific seat - Enhanced to handle category ID/name mismatches
 */
export const getSeatPricing = (seat: any, pricingData: SeatPricingData[]): CalculatedSeatPricing => {
  console.log('[SeatPricing] Processing seat for pricing:', {
    seatId: seat?.id,
    seatNumber: seat?.seat_number,
    rowName: seat?.row_name,
    seatCategoryId: seat?.seat_category_id,
    seatCategories: seat?.seat_categories
  });

  // Enhanced seat category ID extraction
  let seatCategoryId = null;
  let categoryName = null;
  
  // Try different ways to get the seat category information
  if (seat?.seat_category_id) {
    seatCategoryId = seat.seat_category_id;
    categoryName = seat?.seat_categories?.name;
  } else if (seat?.seat_categories?.id) {
    seatCategoryId = seat.seat_categories.id;
    categoryName = seat.seat_categories.name;
  } else if (seat?.category) {
    seatCategoryId = seat.category;
  }

  console.log('[SeatPricing] Extracted category info:', { seatCategoryId, categoryName });

  // If we have category name but pricing doesn't match by ID, try to match by name
  if (categoryName && pricingData.length > 0) {
    const pricingByName = pricingData.find(p => p.seat_categories?.name === categoryName);
    if (pricingByName) {
      console.log('[SeatPricing] Found pricing match by category name:', categoryName);
      return getSeatCategoryPricing(pricingByName.seat_category_id, pricingData);
    }
  }

  return getSeatCategoryPricing(seatCategoryId, pricingData);
};
