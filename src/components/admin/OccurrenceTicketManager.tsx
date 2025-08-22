import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Save, RefreshCw, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface OccurrenceTicketCategory {
  id?: string;
  category_name: string;
  base_price: number;
  convenience_fee: number;
  commission: number;
  available_quantity: number;
  total_quantity: number;
  is_active: boolean;
}

interface EventOccurrence {
  id: string;
  occurrence_date: string;
  occurrence_time: string;
  total_tickets: number;
  available_tickets: number;
}

interface OccurrenceTicketManagerProps {
  eventId: string;
  onClose: () => void;
}

export const OccurrenceTicketManager: React.FC<OccurrenceTicketManagerProps> = ({
  eventId,
  onClose
}) => {
  const [occurrences, setOccurrences] = useState<EventOccurrence[]>([]);
  const [selectedOccurrence, setSelectedOccurrence] = useState<EventOccurrence | null>(null);
  const [categories, setCategories] = useState<OccurrenceTicketCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingEventPricing, setLoadingEventPricing] = useState(false);
  const [applyingToAll, setApplyingToAll] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchOccurrences();
  }, [eventId]);

  useEffect(() => {
    if (selectedOccurrence) {
      fetchOccurrenceCategories(selectedOccurrence.id);
    }
  }, [selectedOccurrence]);

  const fetchOccurrences = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('event_occurrences')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .gte('occurrence_date', new Date().toISOString().split('T')[0])
        .order('occurrence_date', { ascending: true });

      if (error) throw error;
      setOccurrences(data || []);
    } catch (error) {
      console.error('Error fetching occurrences:', error);
      toast({
        title: "Error",
        description: "Failed to load event occurrences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOccurrenceCategories = async (occurrenceId: string) => {
    try {
      console.log('Fetching categories for occurrence:', occurrenceId);
      
      const { data, error } = await supabase
        .from('occurrence_ticket_categories')
        .select('*')
        .eq('occurrence_id', occurrenceId)
        .eq('is_active', true)
        .order('category_name');

      if (error) throw error;
      
      console.log('Categories data:', data);
      
      if (data && data.length > 0) {
        setCategories(data.map(cat => ({
          id: cat.id,
          category_name: cat.category_name,
          base_price: Number(cat.base_price),
          convenience_fee: Number(cat.convenience_fee),
          commission: Number(cat.commission),
          available_quantity: cat.available_quantity,
          total_quantity: cat.total_quantity,
          is_active: cat.is_active
        })));
      } else {
        // If no categories exist for this occurrence, load from event pricing
        await loadFromEventPricing();
      }
    } catch (error) {
      console.error('Error fetching occurrence categories:', error);
      toast({
        title: "Error",
        description: "Failed to load ticket categories",
        variant: "destructive",
      });
    }
  };

  const loadFromEventPricing = async () => {
    setLoadingEventPricing(true);
    try {
      console.log('Loading pricing data from event:', eventId);

      // Fetch event seat pricing data
      const { data: pricingData, error: pricingError } = await supabase
        .from('event_seat_pricing')
        .select(`
          *,
          seat_categories (
            id,
            name,
            color
          )
        `)
        .eq('event_id', eventId)
        .eq('is_active', true)
        .order('base_price');

      if (pricingError) {
        console.error('Error fetching event pricing:', pricingError);
        throw pricingError;
      }

      console.log('Event pricing data:', pricingData);

      if (pricingData && pricingData.length > 0) {
        // Convert event pricing to occurrence categories format
        const eventCategories = pricingData.map(pricing => ({
          category_name: pricing.seat_categories?.name || 'General',
          base_price: Number(pricing.base_price) || 0,
          convenience_fee: Number(pricing.convenience_fee) || 0,
          commission: Number(pricing.commission) || 0,
          available_quantity: Number(pricing.available_tickets) || 100,
          total_quantity: Number(pricing.available_tickets) || 100,
          is_active: true
        }));

        console.log('Converted event categories:', eventCategories);
        setCategories(eventCategories);

        toast({
          title: "Success",
          description: "Loaded ticket categories from event pricing",
        });
      } else {
        // Fallback to default category
        setCategories([{
          category_name: 'General',
          base_price: 500,
          convenience_fee: 50,
          commission: 25,
          available_quantity: 100,
          total_quantity: 100,
          is_active: true
        }]);

        toast({
          title: "Info",
          description: "No pricing data found. Using default category.",
        });
      }
    } catch (error) {
      console.error('Error loading event pricing:', error);
      toast({
        title: "Error",
        description: "Failed to load event pricing data",
        variant: "destructive",
      });
    } finally {
      setLoadingEventPricing(false);
    }
  };

  const applyEventPricingToAllOccurrences = async () => {
    setApplyingToAll(true);
    try {
      console.log('Applying event pricing to all occurrences');

      // First, fetch event pricing data
      const { data: pricingData, error: pricingError } = await supabase
        .from('event_seat_pricing')
        .select(`
          *,
          seat_categories (
            id,
            name,
            color
          )
        `)
        .eq('event_id', eventId)
        .eq('is_active', true)
        .order('base_price');

      if (pricingError) throw pricingError;

      if (!pricingData || pricingData.length === 0) {
        toast({
          title: "Error",
          description: "No event pricing data found to apply",
          variant: "destructive",
        });
        return;
      }

      // Convert to occurrence categories format
      const eventCategories = pricingData.map(pricing => ({
        category_name: pricing.seat_categories?.name || 'General',
        base_price: Number(pricing.base_price) || 0,
        convenience_fee: Number(pricing.convenience_fee) || 0,
        commission: Number(pricing.commission) || 0,
        available_quantity: Number(pricing.available_tickets) || 100,
        total_quantity: Number(pricing.available_tickets) || 100,
        is_active: true
      }));

      console.log('Categories to apply to all occurrences:', eventCategories);

      // Apply to all occurrences
      for (const occurrence of occurrences) {
        console.log(`Applying pricing to occurrence: ${occurrence.id}`);

        // Delete existing categories for this occurrence
        const { error: deleteError } = await supabase
          .from('occurrence_ticket_categories')
          .delete()
          .eq('occurrence_id', occurrence.id);

        if (deleteError) {
          console.error(`Delete error for occurrence ${occurrence.id}:`, deleteError);
          continue; // Skip this occurrence but continue with others
        }

        // Insert new categories
        const categoryData = eventCategories.map(cat => ({
          occurrence_id: occurrence.id,
          category_name: cat.category_name.trim(),
          base_price: cat.base_price,
          convenience_fee: cat.convenience_fee,
          commission: cat.commission,
          available_quantity: cat.available_quantity,
          total_quantity: cat.total_quantity,
          is_active: true
        }));

        const { error: insertError } = await supabase
          .from('occurrence_ticket_categories')
          .insert(categoryData);

        if (insertError) {
          console.error(`Insert error for occurrence ${occurrence.id}:`, insertError);
          continue;
        }
      }

      toast({
        title: "Success",
        description: `Event pricing applied to all ${occurrences.length} occurrences`,
      });

      // Refresh data for currently selected occurrence
      if (selectedOccurrence) {
        await fetchOccurrenceCategories(selectedOccurrence.id);
      }

    } catch (error) {
      console.error('Error applying event pricing to all occurrences:', error);
      toast({
        title: "Error",
        description: "Failed to apply event pricing to all occurrences",
        variant: "destructive",
      });
    } finally {
      setApplyingToAll(false);
    }
  };

  const addCategory = () => {
    setCategories([...categories, {
      category_name: '',
      base_price: 500,
      convenience_fee: 50,
      commission: 25,
      available_quantity: 100,
      total_quantity: 100,
      is_active: true
    }]);
  };

  const removeCategory = (index: number) => {
    if (categories.length > 1) {
      const updatedCategories = categories.filter((_, i) => i !== index);
      setCategories(updatedCategories);
    }
  };

  const updateCategory = (index: number, field: keyof OccurrenceTicketCategory, value: any) => {
    const updatedCategories = [...categories];
    
    // Ensure numeric fields are properly handled
    if (field === 'base_price' || field === 'convenience_fee' || field === 'commission') {
      value = Math.max(0, Number(value) || 0);
    } else if (field === 'available_quantity' || field === 'total_quantity') {
      value = Math.max(0, Math.floor(Number(value) || 0));
    }
    
    updatedCategories[index] = { ...updatedCategories[index], [field]: value };
    
    // Ensure available_quantity doesn't exceed total_quantity
    if (field === 'available_quantity' && value > updatedCategories[index].total_quantity) {
      updatedCategories[index].total_quantity = value;
    } else if (field === 'total_quantity' && value < updatedCategories[index].available_quantity) {
      updatedCategories[index].available_quantity = value;
    }
    
    setCategories(updatedCategories);
  };

  const saveCategories = async () => {
    if (!selectedOccurrence) {
      toast({
        title: "Error",
        description: "Please select an occurrence first",
        variant: "destructive",
      });
      return;
    }

    // Validate categories
    const validCategories = categories.filter(cat => 
      cat.category_name && cat.category_name.trim() !== '' && 
      cat.base_price >= 0 && 
      cat.available_quantity >= 0 && 
      cat.total_quantity >= 0
    );
    
    if (validCategories.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one valid category with a name and valid prices",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      console.log('Saving categories for occurrence:', selectedOccurrence.id);
      console.log('Categories to save:', validCategories);

      // Delete existing categories for this occurrence
      const { error: deleteError } = await supabase
        .from('occurrence_ticket_categories')
        .delete()
        .eq('occurrence_id', selectedOccurrence.id);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw deleteError;
      }

      // Insert new categories with proper validation
      const categoryData = validCategories.map(cat => ({
        occurrence_id: selectedOccurrence.id,
        category_name: cat.category_name.trim(),
        base_price: Math.max(0, Number(cat.base_price) || 0),
        convenience_fee: Math.max(0, Number(cat.convenience_fee) || 0),
        commission: Math.max(0, Number(cat.commission) || 0),
        available_quantity: Math.max(0, Number(cat.available_quantity) || 0),
        total_quantity: Math.max(0, Number(cat.total_quantity) || 0),
        is_active: Boolean(cat.is_active)
      }));

      console.log('Inserting category data:', categoryData);

      const { data: insertedData, error: insertError } = await supabase
        .from('occurrence_ticket_categories')
        .insert(categoryData)
        .select();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      console.log('Successfully inserted categories:', insertedData);

      toast({
        title: "Success",
        description: `${validCategories.length} ticket categories saved successfully`,
      });

      // Refresh data
      await fetchOccurrences();
      await fetchOccurrenceCategories(selectedOccurrence.id);
      
    } catch (error) {
      console.error('Error saving categories:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error",
        description: `Failed to save ticket categories: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const calculateTotalPrice = (category: OccurrenceTicketCategory) => {
    return Number(category.base_price) + Number(category.convenience_fee);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Manage Occurrence Ticket Categories</h2>
        <div className="flex gap-2">
          {occurrences.length > 0 && (
            <Button 
              onClick={applyEventPricingToAllOccurrences}
              disabled={applyingToAll}
              variant="default"
              className="bg-green-600 hover:bg-green-700"
            >
              <Zap className={`w-4 h-4 mr-2 ${applyingToAll ? 'animate-spin' : ''}`} />
              {applyingToAll ? 'Applying...' : 'Apply Event Pricing to All Occurrences'}
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Occurrence Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Event Occurrence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {occurrences.map((occurrence) => (
              <Card
                key={occurrence.id}
                className={`cursor-pointer transition-colors ${
                  selectedOccurrence?.id === occurrence.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => setSelectedOccurrence(occurrence)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">
                        {format(new Date(occurrence.occurrence_date), 'EEEE, MMMM d, yyyy')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {occurrence.occurrence_time}
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {occurrence.available_tickets} / {occurrence.total_tickets} available
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category Management */}
      {selectedOccurrence && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex justify-between items-center">
              <CardTitle>
                Ticket Categories for {format(new Date(selectedOccurrence.occurrence_date), 'MMM d, yyyy')}
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  onClick={loadFromEventPricing} 
                  size="sm" 
                  variant="outline"
                  disabled={loadingEventPricing}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loadingEventPricing ? 'animate-spin' : ''}`} />
                  Load from Event Pricing
                </Button>
                <Button onClick={addCategory} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
                <Button onClick={saveCategories} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {categories.map((category, index) => (
              <Card key={index} className="border-2">
                <CardContent className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">Category {index + 1}</h4>
                    {categories.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeCategory(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`name-${index}`}>Category Name *</Label>
                      <Input
                        id={`name-${index}`}
                        value={category.category_name}
                        onChange={(e) => updateCategory(index, 'category_name', e.target.value)}
                        placeholder="e.g., General, VIP, Premium"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`price-${index}`}>Base Price (₹) *</Label>
                      <Input
                        id={`price-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={category.base_price}
                        onChange={(e) => updateCategory(index, 'base_price', Number(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`convenience-${index}`}>Convenience Fee (₹)</Label>
                      <Input
                        id={`convenience-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={category.convenience_fee}
                        onChange={(e) => updateCategory(index, 'convenience_fee', Number(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`commission-${index}`}>Commission (₹)</Label>
                      <Input
                        id={`commission-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={category.commission}
                        onChange={(e) => updateCategory(index, 'commission', Number(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`available-${index}`}>Available Quantity *</Label>
                      <Input
                        id={`available-${index}`}
                        type="number"
                        min="0"
                        value={category.available_quantity}
                        onChange={(e) => {
                          const qty = Number(e.target.value) || 0;
                          updateCategory(index, 'available_quantity', qty);
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`total-${index}`}>Total Quantity *</Label>
                      <Input
                        id={`total-${index}`}
                        type="number"
                        min="0"
                        value={category.total_quantity}
                        onChange={(e) => {
                          const qty = Number(e.target.value) || 0;
                          updateCategory(index, 'total_quantity', qty);
                          // Ensure available doesn't exceed total
                          if (category.available_quantity > qty) {
                            updateCategory(index, 'available_quantity', qty);
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg bg-green-50">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Price for Customer:</span>
                      <span className="text-lg font-bold text-green-600">
                        ₹{calculateTotalPrice(category).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Base Price + Convenience Fee = Total
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
