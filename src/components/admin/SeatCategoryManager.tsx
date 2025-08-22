
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Edit, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useSeatCategories } from '@/hooks/useSeatCategories';

const SeatCategoryManager = ({ event, onClose }) => {
  const [editingCategory, setEditingCategory] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    color: '#4ECDC4',
    base_price: '0'
  });

  const { 
    categories, 
    loading, 
    createCategory, 
    updateCategory, 
    deleteCategory 
  } = useSeatCategories(event.id);

  const handleCreateCategory = () => {
    setFormData({
      name: '',
      color: '#4ECDC4',
      base_price: '0'
    });
    setEditingCategory(null);
    setShowForm(true);
  };

  const handleEditCategory = (category) => {
    setFormData({
      name: category.name,
      color: category.color,
      base_price: category.base_price.toString()
    });
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleSaveCategory = async () => {
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    const basePrice = parseFloat(formData.base_price);
    if (basePrice < 0) {
      toast.error('Base price cannot be negative');
      return;
    }

    try {
      const categoryData = {
        event_id: event.id,
        name: formData.name.trim(),
        color: formData.color,
        base_price: basePrice,
        is_active: true
      };

      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryData);
        toast.success('Category updated successfully');
      } else {
        await createCategory(categoryData);
        toast.success('Category created successfully');
      }

      setShowForm(false);
      setEditingCategory(null);
    } catch (error) {
      console.error('Save category error:', error);
      toast.error('Failed to save category');
    }
  };

  const handleDeleteCategory = async (categoryId, categoryName) => {
    if (!confirm(`Are you sure you want to delete "${categoryName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteCategory(categoryId);
      toast.success('Category deleted successfully');
    } catch (error) {
      console.error('Delete category error:', error);
      toast.error('Failed to delete category');
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      color: '#4ECDC4',
      base_price: '0'
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Event Details
          </Button>
          <h1 className="text-3xl font-bold">Seat Categories - {event.name}</h1>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="space-y-2">
                <Label>Category Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., VIP, Premium, General"
                />
              </div>
              <div className="space-y-2">
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
            <div className="flex gap-2">
              <Button onClick={handleSaveCategory}>
                <Save className="w-4 h-4 mr-2" />
                {editingCategory ? 'Update' : 'Create'} Category
              </Button>
              <Button variant="outline" onClick={cancelForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-8">Loading categories...</div>
      ) : (
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
      )}

      {!loading && categories.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No seat categories created yet. Create your first category to get started.
        </div>
      )}
    </div>
  );
};

export default SeatCategoryManager;
