
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, Save, X, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CarouselSlide {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  button_text: string;
  button_link: string;
  city: string;
  is_active: boolean;
  sort_order: number;
}

const CITIES = [
  'All Cities',
  'Mumbai',
  'Delhi',
  'Bangalore',
  'Chennai',
  'Kolkata',
  'Hyderabad',
  'Pune',
  'Ahmedabad',
  'Jaipur',
  'Lucknow'
];

const CarouselManagement = () => {
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [editingSlide, setEditingSlide] = useState<CarouselSlide | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string>('All Cities');
  const { toast } = useToast();

  useEffect(() => {
    loadSlides();
  }, [selectedCity]);

  const loadSlides = async () => {
    try {
      let query = supabase
        .from('carousel_slides')
        .select('*')
        .order('sort_order', { ascending: true });

      if (selectedCity !== 'All Cities') {
        query = query.eq('city', selectedCity);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSlides(data || []);
    } catch (error) {
      console.error('Error loading slides:', error);
      toast({
        title: "Error",
        description: "Failed to load carousel slides",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSlide = () => {
    const newSlide: CarouselSlide = {
      title: '',
      subtitle: '',
      description: '',
      image: '',
      button_text: 'Learn More',
      button_link: '#',
      city: selectedCity === 'All Cities' ? 'All Cities' : selectedCity,
      is_active: true,
      sort_order: slides.length + 1
    };
    setEditingSlide(newSlide);
    setIsCreating(true);
  };

  const handleSaveSlide = async () => {
    if (!editingSlide) return;

    try {
      if (isCreating) {
        const { error } = await supabase
          .from('carousel_slides')
          .insert([editingSlide]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Carousel slide created successfully",
        });
      } else {
        const { error } = await supabase
          .from('carousel_slides')
          .update(editingSlide)
          .eq('id', editingSlide.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Carousel slide updated successfully",
        });
      }

      await loadSlides();
      setEditingSlide(null);
      setIsCreating(false);
    } catch (error) {
      console.error('Error saving slide:', error);
      toast({
        title: "Error",
        description: "Failed to save carousel slide",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSlide = async (id: string) => {
    try {
      const { error } = await supabase
        .from('carousel_slides')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await loadSlides();
      toast({
        title: "Success",
        description: "Carousel slide deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting slide:', error);
      toast({
        title: "Error",
        description: "Failed to delete carousel slide",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('carousel_slides')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      
      await loadSlides();
      toast({
        title: "Success",
        description: "Carousel slide status updated",
      });
    } catch (error) {
      console.error('Error updating slide status:', error);
      toast({
        title: "Error",
        description: "Failed to update slide status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Carousel Management</h2>
            <p className="text-gray-600">Manage city-wise homepage carousel slides</p>
          </div>
        </div>
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Carousel Management</h2>
          <p className="text-gray-600">Manage city-wise homepage carousel slides</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                {CITIES.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreateSlide} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Slide
          </Button>
        </div>
      </div>

      {/* Edit/Create Slide Form */}
      {editingSlide && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>{isCreating ? 'Create New Slide' : 'Edit Slide'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <Input
                  value={editingSlide.title}
                  onChange={(e) => setEditingSlide({...editingSlide, title: e.target.value})}
                  placeholder="Slide title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Subtitle</label>
                <Input
                  value={editingSlide.subtitle}
                  onChange={(e) => setEditingSlide({...editingSlide, subtitle: e.target.value})}
                  placeholder="Slide subtitle"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Input
                value={editingSlide.description}
                onChange={(e) => setEditingSlide({...editingSlide, description: e.target.value})}
                placeholder="Slide description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">City</label>
                <Select 
                  value={editingSlide.city} 
                  onValueChange={(value) => setEditingSlide({...editingSlide, city: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {CITIES.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Button Text</label>
                <Input
                  value={editingSlide.button_text}
                  onChange={(e) => setEditingSlide({...editingSlide, button_text: e.target.value})}
                  placeholder="Button text"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Button Link</label>
                <Input
                  value={editingSlide.button_link}
                  onChange={(e) => setEditingSlide({...editingSlide, button_link: e.target.value})}
                  placeholder="Button link"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Image URL</label>
              <Input
                value={editingSlide.image}
                onChange={(e) => setEditingSlide({...editingSlide, image: e.target.value})}
                placeholder="Image URL"
              />
              {editingSlide.image && (
                <img 
                  src={editingSlide.image} 
                  alt="Preview" 
                  className="mt-2 h-32 w-full object-cover rounded"
                />
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                <Button onClick={handleSaveSlide} className="bg-green-600 hover:bg-green-700">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingSlide(null);
                    setIsCreating(false);
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* City Filter Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Showing slides for:</strong> {selectedCity} 
          {slides.length > 0 && ` (${slides.length} slide${slides.length !== 1 ? 's' : ''})`}
        </p>
      </div>

      {/* Slides List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {slides.map((slide) => (
          <Card key={slide.id} className={`relative ${!slide.is_active ? 'opacity-60' : ''}`}>
            <div className="absolute top-2 right-2 z-10 flex gap-1">
              <Badge variant="secondary" className="text-xs">
                {slide.city}
              </Badge>
              <Badge variant={slide.is_active ? "default" : "secondary"}>
                {slide.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            
            {slide.image && (
              <img 
                src={slide.image} 
                alt={slide.title}
                className="w-full h-40 object-cover rounded-t-lg"
              />
            )}
            
            <CardHeader className="pb-2">
              <CardTitle className="text-lg truncate">{slide.title}</CardTitle>
              <CardDescription className="truncate">{slide.subtitle}</CardDescription>
            </CardHeader>
            
            <CardContent>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{slide.description}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={slide.is_active}
                    onCheckedChange={() => handleToggleActive(slide.id!, slide.is_active)}
                  />
                  <span className="text-sm">Active</span>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingSlide(slide);
                      setIsCreating(false);
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteSlide(slide.id!)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {slides.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">
              No carousel slides found for {selectedCity}
            </p>
            <Button onClick={handleCreateSlide} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create First Slide for {selectedCity}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CarouselManagement;
