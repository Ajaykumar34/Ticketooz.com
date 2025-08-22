export interface PricingCalculation {
  basePrice: number;
  convenienceFee: number;
  commission: number;
  totalPrice: number;
}

export interface FeeConfig {
  type: 'fixed' | 'percentage';
  value: number;
}

export const calculateFee = (basePrice: number, config: FeeConfig): number => {
  if (config.type === 'percentage') {
    return (basePrice * config.value) / 100;
  }
  return config.value;
};

export const calculatePricing = (
  basePrice: number,
  convenienceFeeConfig: FeeConfig,
  commissionConfig: FeeConfig
): PricingCalculation => {
  const convenienceFee = calculateFee(basePrice, convenienceFeeConfig);
  const commission = calculateFee(basePrice, commissionConfig);
  const totalPrice = basePrice + convenienceFee;

  return {
    basePrice,
    convenienceFee,
    commission,
    totalPrice
  };
};

export const formatCurrency = (amount: number): string => {
  return `₹${amount.toFixed(2)}`;
};

export const validatePricingCategory = (category: {
  name: string;
  basePrice: number;
  convenienceFeeValue: number;
  commissionValue: number;
}): string[] => {
  const errors: string[] = [];

  if (!category.name.trim()) {
    errors.push('Category name is required');
  }

  if (category.basePrice <= 0) {
    errors.push('Base price must be greater than 0');
  }

  if (category.convenienceFeeValue < 0) {
    errors.push('Convenience fee cannot be negative');
  }

  if (category.commissionValue < 0) {
    errors.push('Commission cannot be negative');
  }

  return errors;
};