import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Trash2, Folder, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import SubcategoryManager from './SubcategoryManager';

const CategoryManagement = () => {
  const { data: categories, loading, refetch } = useRealtimeData('categories');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [selectedCategoryForSubcategories, setSelectedCategoryForSubcategories] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subCategory: '',
    color: '#4F46E5', // Default blue color
    isActive: true
  });
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast({
        title: "Validation Error",
        description: "Please enter a category name",
        variant: "destructive"
      });
      return;
    }

    try {
      const categoryData = {
        name: formData.name,
        description: formData.description,
        sub_category: formData.subCategory,
        color: formData.color,
        is_active: formData.isActive
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast({ title: "Success", description: "Category updated successfully" });
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([categoryData]);

        if (error) throw error;
        toast({ title: "Success", description: "Category created successfully" });
      }
      
      refetch();
      resetForm();
    } catch (error) {
      console.error('Error saving category:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save category",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', subCategory: '', color: '#4F46E5', isActive: true });
    setEditingCategory(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      subCategory: category.sub_category || '',
      color: category.color || '#4F46E5',
      isActive: category.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      refetch();
      toast({ title: "Success", description: "Category deleted successfully" });
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const handleSubcategoryChange = () => {
    // Refresh categories or handle any other updates needed
    refetch();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Category Management</h2>
            <p className="text-gray-600 mt-2">Manage event categories with real-time updates</p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Category Management</h2>
          <p className="text-gray-600 mt-2">Manage event categories with real-time updates</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="bg-green-50 text-green-700">
            <Activity className="w-3 h-3 mr-1" />
            Live Data
          </Badge>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
                <DialogDescription>
                  Create categories to organize events
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Enter category name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sub Category</label>
                  <Input
                    value={formData.subCategory}
                    onChange={(e) => setFormData({...formData, subCategory: e.target.value})}
                    placeholder="Enter sub category (optional)"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Describe the category"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category Color</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({...formData, color: e.target.value})}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-6 h-6 rounded-full border-2 border-gray-300"
                        style={{ backgroundColor: formData.color }}
                      />
                      <span className="text-sm text-gray-600">{formData.color}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">This color will be used to represent the category in various UI elements</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({...formData, isActive: Boolean(checked)})}
                  />
                  <label htmlFor="isActive" className="text-sm font-medium">
                    Active Category
                  </label>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    {editingCategory ? 'Update Category' : 'Create Category'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid gap-4">
        {categories.length === 0 ? (
          <Card className="p-8 text-center">
            <Folder className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Categories Found</h3>
            <p className="text-gray-500 mb-4">Create your first category to get started.</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Category
            </Button>
          </Card>
        ) : (
          categories.map((category) => (
            <div key={category.id} className="space-y-4">
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <div 
                          className="w-5 h-5 rounded-full border-2 border-gray-300" 
                          style={{ backgroundColor: category.color || '#4F46E5' }}
                        />
                        <span>{category.name}</span>
                        {category.sub_category && (
                          <Badge variant="secondary" className="ml-2">
                            {category.sub_category}
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {category.description || 'No description provided'}
                      </CardDescription>
                      <div className="mt-2">
                        <Badge variant={category.is_active ? 'default' : 'secondary'}>
                          {category.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setSelectedCategoryForSubcategories(
                            selectedCategoryForSubcategories?.id === category.id ? null : category
                          );
                        }}
                      >
                        Subcategories
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(category)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(category.id)} className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    Created: {new Date(category.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>

              {/* Subcategory Manager */}
              {selectedCategoryForSubcategories?.id === category.id && (
                <SubcategoryManager 
                  category={selectedCategoryForSubcategories} 
                  onSubcategoryChange={handleSubcategoryChange}
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CategoryManagement;
