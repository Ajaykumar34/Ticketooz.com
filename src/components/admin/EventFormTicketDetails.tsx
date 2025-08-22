
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';

interface TicketCategory {
  name: string;
  price: string;
  convenienceFeeType: string;
  convenienceFee: string;
  commissionType: string;
  commission: string;
  quantity: string;
  seatCategoryId: string;
  multiplier: string;
}

interface EventFormTicketDetailsProps {
  formData: {
    ticketCategories: TicketCategory[];
    [key: string]: any;
  };
  setFormData: (updater: (prev: any) => any) => void;
}

export const EventFormTicketDetails: React.FC<EventFormTicketDetailsProps> = ({
  formData,
  setFormData
}) => {
  const addTicketCategory = () => {
    const newCategory: TicketCategory = {
      name: '',
      price: '',
      convenienceFeeType: 'fixed',
      convenienceFee: '',
      commissionType: 'fixed',
      commission: '',
      quantity: '',
      seatCategoryId: '',
      multiplier: '1'
    };
    
    setFormData(prev => ({
      ...prev,
      ticketCategories: [...prev.ticketCategories, newCategory]
    }));
  };

  const removeTicketCategory = (index: number) => {
    if (formData.ticketCategories.length > 1) {
      setFormData(prev => ({
        ...prev,
        ticketCategories: prev.ticketCategories.filter((_, i) => i !== index)
      }));
    }
  };

  const updateTicketCategory = (index: number, field: keyof TicketCategory, value: string) => {
    setFormData(prev => ({
      ...prev,
      ticketCategories: prev.ticketCategories.map((category, i) => 
        i === index ? { ...category, [field]: value } : category
      )
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Ticket Categories</h3>
          <p className="text-sm text-muted-foreground">
            Create and configure individual ticket categories for your event
          </p>
        </div>
        <Button onClick={addTicketCategory} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Category
        </Button>
      </div>

      {formData.ticketCategories.map((category, index) => (
        <Card key={index} className="border-2">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">Category {index + 1}</CardTitle>
              {formData.ticketCategories.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeTicketCategory(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`name-${index}`}>Category Name *</Label>
                <Input
                  id={`name-${index}`}
                  value={category.name}
                  onChange={(e) => updateTicketCategory(index, 'name', e.target.value)}
                  placeholder="e.g., General, VIP, Premium"
                  required
                />
              </div>
              <div>
                <Label htmlFor={`price-${index}`}>Price (₹) *</Label>
                <Input
                  id={`price-${index}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={category.price}
                  onChange={(e) => updateTicketCategory(index, 'price', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`quantity-${index}`}>Available Quantity *</Label>
                <Input
                  id={`quantity-${index}`}
                  type="number"
                  min="1"
                  value={category.quantity}
                  onChange={(e) => updateTicketCategory(index, 'quantity', e.target.value)}
                  placeholder="100"
                  required
                />
              </div>
            </div>

            {/* Convenience Fee Section */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Convenience Fee Configuration</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`convenience-type-${index}`}>Fee Type</Label>
                  <Select
                    value={category.convenienceFeeType}
                    onValueChange={(value) => updateTicketCategory(index, 'convenienceFeeType', value)}
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
                  <Label htmlFor={`convenience-fee-${index}`}>
                    Fee Value {category.convenienceFeeType === 'percentage' ? '(%)' : '(₹)'}
                  </Label>
                  <Input
                    id={`convenience-fee-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={category.convenienceFee}
                    onChange={(e) => updateTicketCategory(index, 'convenienceFee', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Commission Section */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Commission Configuration</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`commission-type-${index}`}>Commission Type</Label>
                  <Select
                    value={category.commissionType}
                    onValueChange={(value) => updateTicketCategory(index, 'commissionType', value)}
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
                  <Label htmlFor={`commission-${index}`}>
                    Commission Value {category.commissionType === 'percentage' ? '(%)' : '(₹)'}
                  </Label>
                  <Input
                    id={`commission-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={category.commission}
                    onChange={(e) => updateTicketCategory(index, 'commission', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Pricing Summary */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <h4 className="font-medium mb-3">Pricing Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Base Price:</span>
                  <div className="font-bold">₹{category.price || '0'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Convenience Fee:</span>
                  <div className="font-bold text-primary">
                    ₹{category.convenienceFee || '0'}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Commission:</span>
                  <div className="font-bold text-orange-600">
                    ₹{category.commission || '0'}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Price:</span>
                  <div className="font-bold text-lg text-green-600">
                    ₹{(parseFloat(category.price || '0') + parseFloat(category.convenienceFee || '0')).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {formData.ticketCategories.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No ticket categories configured yet.</p>
            <Button onClick={addTicketCategory} className="mt-2">
              Add Your First Category
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
