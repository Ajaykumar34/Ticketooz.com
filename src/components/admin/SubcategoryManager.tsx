
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSubcategories } from '@/hooks/useSubcategories';

interface SubcategoryManagerProps {
  category: any;
  onSubcategoryChange?: () => void;
}

const SubcategoryManager = ({ category, onSubcategoryChange }: SubcategoryManagerProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const { subcategories, loading, refetch } = useSubcategories(category?.name);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a subcategory name",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingId) {
        // Update existing subcategory
        const { error } = await supabase
          .from('subcategories')
          .update({
            name: formData.name,
            description: formData.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;
        toast({ title: "Success", description: "Subcategory updated successfully" });
      } else {
        // Create new subcategory
        const { error } = await supabase
          .from('subcategories')
          .insert({
            category_id: category.id,
            name: formData.name,
            description: formData.description
          });

        if (error) throw error;
        toast({ title: "Success", description: "Subcategory created successfully" });
      }
      
      resetForm();
      refetch();
      onSubcategoryChange?.();
    } catch (error) {
      console.error('Error saving subcategory:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save subcategory",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (subcategory: any) => {
    setEditingId(subcategory.id);
    setFormData({
      name: subcategory.name,
      description: subcategory.description || ''
    });
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      refetch();
      onSubcategoryChange?.();
      toast({ title: "Success", description: "Subcategory deleted successfully" });
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      toast({
        title: "Error",
        description: "Failed to delete subcategory",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setEditingId(null);
    setIsAdding(false);
  };

  if (!category) return null;

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Subcategories for "{category.name}"
          </CardTitle>
          <Button
            onClick={() => setIsAdding(true)}
            size="sm"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Subcategory
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isAdding && (
          <form onSubmit={handleSubmit} className="space-y-4 mb-6 p-4 border rounded-lg bg-gray-50">
            <div>
              <label className="text-sm font-medium">Subcategory Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter subcategory name"
                required
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe the subcategory"
              />
            </div>
            
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                {editingId ? 'Update' : 'Create'} Subcategory
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="text-center py-4">Loading subcategories...</div>
        ) : subcategories.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No subcategories found for this category
          </div>
        ) : (
          <div className="space-y-2">
            {subcategories.map((subcategory) => (
              <div
                key={subcategory.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{subcategory.name}</h4>
                    <Badge variant={subcategory.is_active ? 'default' : 'secondary'}>
                      {subcategory.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {subcategory.description && (
                    <p className="text-sm text-gray-600 mt-1">{subcategory.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(subcategory)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(subcategory.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SubcategoryManager;
