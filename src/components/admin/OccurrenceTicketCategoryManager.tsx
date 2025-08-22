import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';

interface OccurrenceTicketCategory {
  id: string;
  occurrence_id: string;
  category_name: string;
  base_price: number;
  convenience_fee: number;
  commission: number;
  total_quantity: number;
  available_quantity: number;
  is_active: boolean;
}

interface EventOccurrence {
  id: string;
  occurrence_date: string;
  occurrence_time: string;
  event_id: string;
}

interface OccurrenceTicketCategoryManagerProps {
  eventId: string;
}

const OccurrenceTicketCategoryManager = ({ eventId }: OccurrenceTicketCategoryManagerProps) => {
  const { toast } = useToast();
  const [occurrences, setOccurrences] = useState<EventOccurrence[]>([]);
  const [selectedOccurrence, setSelectedOccurrence] = useState<string>('');
  const [categories, setCategories] = useState<OccurrenceTicketCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({
    category_name: '',
    base_price: 0,
    convenience_fee: 50,
    commission: 0,
    total_quantity: 100,
    available_quantity: 100
  });

  // Fetch occurrences for the event
  useEffect(() => {
    const fetchOccurrences = async () => {
      try {
        const { data, error } = await supabase
          .from('event_occurrences')
          .select('id, occurrence_date, occurrence_time, event_id')
          .eq('event_id', eventId)
          .eq('is_active', true)
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
      }
    };

    if (eventId) {
      fetchOccurrences();
    }
  }, [eventId]);

  // Fetch categories for selected occurrence
  useEffect(() => {
    const fetchCategories = async () => {
      if (!selectedOccurrence) {
        setCategories([]);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('occurrence_ticket_categories')
          .select('*')
          .eq('occurrence_id', selectedOccurrence)
          .order('category_name', { ascending: true });

        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast({
          title: "Error",
          description: "Failed to load ticket categories",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [selectedOccurrence]);

  const handleCreateCategory = async () => {
    if (!selectedOccurrence || !newCategory.category_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please select an occurrence and enter a category name",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('occurrence_ticket_categories')
        .insert([{
          occurrence_id: selectedOccurrence,
          category_name: newCategory.category_name.trim(),
          base_price: newCategory.base_price,
          convenience_fee: newCategory.convenience_fee,
          commission: newCategory.commission,
          total_quantity: newCategory.total_quantity,
          available_quantity: newCategory.available_quantity,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      setCategories(prev => [...prev, data]);
      setNewCategory({
        category_name: '',
        base_price: 0,
        convenience_fee: 50,
        commission: 0,
        total_quantity: 100,
        available_quantity: 100
      });

      toast({
        title: "Success",
        description: "Ticket category created successfully",
      });
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: "Error",
        description: "Failed to create ticket category",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCategory = async (categoryId: string, updates: Partial<OccurrenceTicketCategory>) => {
    try {
      const { error } = await supabase
        .from('occurrence_ticket_categories')
        .update(updates)
        .eq('id', categoryId);

      if (error) throw error;

      setCategories(prev => prev.map(cat => 
        cat.id === categoryId ? { ...cat, ...updates } : cat
      ));

      setEditingCategory(null);

      toast({
        title: "Success",
        description: "Category updated successfully",
      });
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const { error } = await supabase
        .from('occurrence_ticket_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      setCategories(prev => prev.filter(cat => cat.id !== categoryId));

      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manage Occurrence Ticket Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Occurrence Selection */}
          <div>
            <Label htmlFor="occurrence-select">Select Event Occurrence</Label>
            <select
              id="occurrence-select"
              value={selectedOccurrence}
              onChange={(e) => setSelectedOccurrence(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Select an occurrence...</option>
              {occurrences.map((occurrence) => (
                <option key={occurrence.id} value={occurrence.id}>
                  {new Date(occurrence.occurrence_date).toLocaleDateString()} at {occurrence.occurrence_time}
                </option>
              ))}
            </select>
          </div>

          {/* Add New Category Form */}
          {selectedOccurrence && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add New Category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category-name">Category Name</Label>
                    <Input
                      id="category-name"
                      value={newCategory.category_name}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, category_name: e.target.value }))}
                      placeholder="e.g., VIP, Premium, Standard"
                    />
                  </div>
                  <div>
                    <Label htmlFor="base-price">Base Price (₹)</Label>
                    <Input
                      id="base-price"
                      type="number"
                      value={newCategory.base_price}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, base_price: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="convenience-fee">Convenience Fee (₹)</Label>
                    <Input
                      id="convenience-fee"
                      type="number"
                      value={newCategory.convenience_fee}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, convenience_fee: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="total-quantity">Total Quantity</Label>
                    <Input
                      id="total-quantity"
                      type="number"
                      value={newCategory.total_quantity}
                      onChange={(e) => {
                        const quantity = parseInt(e.target.value) || 0;
                        setNewCategory(prev => ({ 
                          ...prev, 
                          total_quantity: quantity,
                          available_quantity: quantity
                        }));
                      }}
                    />
                  </div>
                </div>
                <Button onClick={handleCreateCategory} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Category
                </Button>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Existing Categories */}
      {selectedOccurrence && (
        <Card>
          <CardHeader>
            <CardTitle>Existing Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">Loading categories...</div>
            ) : categories.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No categories created for this occurrence
              </div>
            ) : (
              <div className="space-y-4">
                {categories.map((category) => (
                  <Card key={category.id} className="p-4">
                    {editingCategory === category.id ? (
                      <EditCategoryForm
                        category={category}
                        onSave={(updates) => handleUpdateCategory(category.id, updates)}
                        onCancel={() => setEditingCategory(null)}
                      />
                    ) : (
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{category.category_name}</h3>
                            <Badge variant={category.is_active ? "default" : "secondary"}>
                              {category.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Price: ₹{category.base_price} + ₹{category.convenience_fee} fee | 
                            Available: {category.available_quantity}/{category.total_quantity}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingCategory(category.id)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))
                }
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Edit Category Form Component
interface EditCategoryFormProps {
  category: OccurrenceTicketCategory;
  onSave: (updates: Partial<OccurrenceTicketCategory>) => void;
  onCancel: () => void;
}

const EditCategoryForm = ({ category, onSave, onCancel }: EditCategoryFormProps) => {
  const [formData, setFormData] = useState({
    category_name: category.category_name,
    base_price: category.base_price,
    convenience_fee: category.convenience_fee,
    commission: category.commission,
    total_quantity: category.total_quantity,
    available_quantity: category.available_quantity,
    is_active: category.is_active
  });

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Category Name</Label>
          <Input
            value={formData.category_name}
            onChange={(e) => setFormData(prev => ({ ...prev, category_name: e.target.value }))}
          />
        </div>
        <div>
          <Label>Base Price (₹)</Label>
          <Input
            type="number"
            value={formData.base_price}
            onChange={(e) => setFormData(prev => ({ ...prev, base_price: parseInt(e.target.value) || 0 }))}
          />
        </div>
        <div>
          <Label>Convenience Fee (₹)</Label>
          <Input
            type="number"
            value={formData.convenience_fee}
            onChange={(e) => setFormData(prev => ({ ...prev, convenience_fee: parseInt(e.target.value) || 0 }))}
          />
        </div>
        <div>
          <Label>Total Quantity</Label>
          <Input
            type="number"
            value={formData.total_quantity}
            onChange={(e) => setFormData(prev => ({ ...prev, total_quantity: parseInt(e.target.value) || 0 }))}
          />
        </div>
        <div>
          <Label>Available Quantity</Label>
          <Input
            type="number"
            value={formData.available_quantity}
            onChange={(e) => setFormData(prev => ({ ...prev, available_quantity: parseInt(e.target.value) || 0 }))}
          />
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is-active"
            checked={formData.is_active}
            onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
          />
          <Label htmlFor="is-active">Active</Label>
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSave} size="sm">
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
        <Button variant="outline" onClick={onCancel} size="sm">
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default OccurrenceTicketCategoryManager;
