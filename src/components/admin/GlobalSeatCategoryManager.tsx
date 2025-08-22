
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface GlobalSeatCategory {
  id: string;
  name: string;
  color: string;
  base_price: number;
  description?: string;
  is_active: boolean;
}

const GlobalSeatCategoryManager = () => {
  const [categories, setCategories] = useState<GlobalSeatCategory[]>([]);
  const [editingCategory, setEditingCategory] = useState<GlobalSeatCategory | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    color: '#4ECDC4',
    base_price: '0',
    description: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('global_seat_categories')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading global seat categories:', error);
      toast({
        title: "Error",
        description: "Failed to load seat categories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = () => {
    setFormData({
      name: '',
      color: '#4ECDC4',
      base_price: '0',
      description: ''
    });
    setEditingCategory(null);
    setShowForm(true);
  };

  const handleEditCategory = (category: GlobalSeatCategory) => {
    setFormData({
      name: category.name,
      color: category.color,
      base_price: category.base_price.toString(),
      description: category.description || ''
    });
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleSaveCategory = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    const basePrice = parseFloat(formData.base_price);
    if (basePrice < 0) {
      toast({
        title: "Error",
        description: "Base price cannot be negative",
        variant: "destructive",
      });
      return;
    }

    try {
      const categoryData = {
        name: formData.name.trim(),
        color: formData.color,
        base_price: basePrice,
        description: formData.description.trim() || null,
        is_active: true
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('global_seat_categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Category updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('global_seat_categories')
          .insert([categoryData]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Category created successfully",
        });
      }

      setShowForm(false);
      setEditingCategory(null);
      await loadCategories();
    } catch (error) {
      console.error('Save category error:', error);
      toast({
        title: "Error",
        description: "Failed to save category",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Are you sure you want to delete "${categoryName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('global_seat_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
      await loadCategories();
    } catch (error) {
      console.error('Delete category error:', error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      color: '#4ECDC4',
      base_price: '0',
      description: ''
    });
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-8">Loading seat categories...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Global Seat Categories</h1>
          <p className="text-gray-600 mt-1">
            Manage seat categories that can be used across all venues and events
          </p>
        </div>
        <Button onClick={handleCreateCategory}>
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label>Category Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., VIP, Premium, General"
                />
              </div>
              <div className="space-y-2">
                <Label>Base Price (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.base_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, base_price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <Label>Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-16 h-10 p-1 border rounded"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  placeholder="#4ECDC4"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <Label>Description (Optional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this seat category"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveCategory}>
                <Save className="w-4 h-4 mr-2" />
                {editingCategory ? 'Update' : 'Create'} Category
              </Button>
              <Button variant="outline" onClick={cancelForm}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <Card key={category.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-6 h-6 rounded border-2 border-gray-300"
                    style={{ backgroundColor: category.color }}
                  />
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                </div>
                <Badge 
                  style={{ backgroundColor: category.color, color: '#000' }}
                >
                  ₹{category.base_price}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {category.description && (
                <p className="text-sm text-gray-600 mb-3">{category.description}</p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditCategory(category)}
                  className="flex-1"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteCategory(category.id, category.name)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No seat categories created yet. Create your first category to get started.
        </div>
      )}
    </div>
  );
};

export default GlobalSeatCategoryManager;
