
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Calculator } from 'lucide-react';
import { calculatePricing, formatCurrency, validatePricingCategory } from '@/utils/pricingUtils';

export interface PricingCategory {
  id: string;
  name: string;
  basePrice: number;
  quantity?: number;
  convenienceFeeType: 'fixed' | 'percentage';
  convenienceFeeValue: number;
  commissionType: 'fixed' | 'percentage';
  commissionValue: number;
  isActive: boolean;
}

interface EventPricingManagerProps {
  categories: PricingCategory[];
  onCategoriesChange: (categories: PricingCategory[]) => void;
}

export const EventPricingManager: React.FC<EventPricingManagerProps> = ({
  categories,
  onCategoriesChange
}) => {
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const addCategory = () => {
    const newCategory: PricingCategory = {
      id: `temp-${Date.now()}`,
      name: '',
      basePrice: 500,
      quantity: 100,
      convenienceFeeType: 'fixed',
      convenienceFeeValue: 50,
      commissionType: 'percentage',
      commissionValue: 5,
      isActive: true
    };
    onCategoriesChange([...categories, newCategory]);
  };

  const removeCategory = (index: number) => {
    if (categories.length > 1) {
      const updatedCategories = categories.filter((_, i) => i !== index);
      onCategoriesChange(updatedCategories);
    }
  };

  const updateCategory = (index: number, field: keyof PricingCategory, value: any) => {
    const updatedCategories = [...categories];
    updatedCategories[index] = { ...updatedCategories[index], [field]: value };
    onCategoriesChange(updatedCategories);

    // Validate the updated category
    const categoryErrors = validatePricingCategory(updatedCategories[index]);
    setErrors(prev => ({
      ...prev,
      [index]: categoryErrors
    }));
  };

  const calculateCategoryPricing = (category: PricingCategory) => {
    return calculatePricing(
      category.basePrice,
      { type: category.convenienceFeeType, value: category.convenienceFeeValue },
      { type: category.commissionType, value: category.commissionValue }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Ticket Pricing Categories</h3>
          <p className="text-sm text-muted-foreground">
            Configure pricing for different ticket categories with convenience fees and commission calculations
          </p>
        </div>
        <Button onClick={addCategory} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Category
        </Button>
      </div>

      {categories.map((category, index) => {
        const pricing = calculateCategoryPricing(category);
        const categoryErrors = errors[index] || [];

        return (
          <Card key={category.id} className={`border-2 ${categoryErrors.length > 0 ? 'border-destructive' : ''}`}>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">Category {index + 1}</CardTitle>
                {categories.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeCategory(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {categoryErrors.length > 0 && (
                <div className="space-y-1">
                  {categoryErrors.map((error, errorIndex) => (
                    <p key={errorIndex} className="text-sm text-destructive">{error}</p>
                  ))}
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`name-${index}`}>Category Name *</Label>
                  <Input
                    id={`name-${index}`}
                    value={category.name}
                    onChange={(e) => updateCategory(index, 'name', e.target.value)}
                    placeholder="e.g., General, VIP, Premium"
                    className={categoryErrors.some(e => e.includes('name')) ? 'border-destructive' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor={`price-${index}`}>Base Price (₹) *</Label>
                  <Input
                    id={`price-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={category.basePrice}
                    onChange={(e) => updateCategory(index, 'basePrice', Number(e.target.value) || 0)}
                    className={categoryErrors.some(e => e.includes('Base price')) ? 'border-destructive' : ''}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`quantity-${index}`}>Available Quantity</Label>
                  <Input
                    id={`quantity-${index}`}
                    type="number"
                    min="1"
                    value={category.quantity || 100}
                    onChange={(e) => updateCategory(index, 'quantity', Number(e.target.value) || 100)}
                  />
                </div>
              </div>

              {/* Convenience Fee Section */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Convenience Fee Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor={`convenience-type-${index}`}>Fee Type</Label>
                    <Select
                      value={category.convenienceFeeType}
                      onValueChange={(value: 'fixed' | 'percentage') => 
                        updateCategory(index, 'convenienceFeeType', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`convenience-value-${index}`}>
                      Fee Value {category.convenienceFeeType === 'percentage' ? '(%)' : '(₹)'}
                    </Label>
                    <Input
                      id={`convenience-value-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={category.convenienceFeeValue}
                      onChange={(e) => updateCategory(index, 'convenienceFeeValue', Number(e.target.value) || 0)}
                      className={categoryErrors.some(e => e.includes('Convenience fee')) ? 'border-destructive' : ''}
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="text-sm">
                      <span className="font-medium">Calculated Fee:</span>
                      <div className="text-lg font-bold text-primary">
                        {formatCurrency(pricing.convenienceFee)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Commission Section */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Commission Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor={`commission-type-${index}`}>Commission Type</Label>
                    <Select
                      value={category.commissionType}
                      onValueChange={(value: 'fixed' | 'percentage') => 
                        updateCategory(index, 'commissionType', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`commission-value-${index}`}>
                      Commission Value {category.commissionType === 'percentage' ? '(%)' : '(₹)'}
                    </Label>
                    <Input
                      id={`commission-value-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={category.commissionValue}
                      onChange={(e) => updateCategory(index, 'commissionValue', Number(e.target.value) || 0)}
                      className={categoryErrors.some(e => e.includes('Commission')) ? 'border-destructive' : ''}
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="text-sm">
                      <span className="font-medium">Calculated Commission:</span>
                      <div className="text-lg font-bold text-orange-600">
                        {formatCurrency(pricing.commission)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing Summary */}
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="w-4 h-4" />
                  <h4 className="font-medium">Pricing Summary</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Base Price:</span>
                    <div className="font-bold">{formatCurrency(pricing.basePrice)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Convenience Fee:</span>
                    <div className="font-bold text-primary">{formatCurrency(pricing.convenienceFee)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Commission:</span>
                    <div className="font-bold text-orange-600">{formatCurrency(pricing.commission)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Customer Pays:</span>
                    <div className="font-bold text-lg text-green-600">{formatCurrency(pricing.totalPrice)}</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Net Revenue (after commission):</span>
                    <span className="font-bold">
                      {formatCurrency(pricing.basePrice + pricing.convenienceFee - pricing.commission)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {categories.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No ticket categories configured yet.</p>
            <Button onClick={addCategory} className="mt-2">
              Add Your First Category
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
