
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Music, Laptop, Palette, Briefcase, Trophy, GraduationCap, Plus } from 'lucide-react';

interface CategoryListProps {
  onCategorySelect?: (category: string) => void;
  selectedCategory?: string;
  categories?: Array<{ id: string; name: string; description?: string; color?: string }>;
}

const CategoryList = ({ onCategorySelect, selectedCategory, categories = [] }: CategoryListProps) => {
  // Default category icons mapping
  const categoryIcons = {
    'Music': Music,
    'Technology': Laptop,
    'Art': Palette,
    'Business': Briefcase,
    'Sports': Trophy,
    'Education': GraduationCap,
  };

  // Predefined colors for fallback when category doesn't have a color
  const fallbackCategoryColors = {
    'Music': 'bg-pink-500',
    'Technology': 'bg-blue-500',
    'Art': 'bg-purple-500',
    'Business': 'bg-green-500',
    'Sports': 'bg-orange-500',
    'Education': 'bg-indigo-500',
  };

  // Use Supabase categories if available, otherwise fall back to default
  const displayCategories = categories.length > 0 
    ? categories.map(cat => ({
        name: cat.name,
        icon: categoryIcons[cat.name as keyof typeof categoryIcons] || Briefcase,
        // Use the color from database, fallback to predefined colors, then gray
        color: cat.color ? `bg-[${cat.color}]` : (fallbackCategoryColors[cat.name as keyof typeof fallbackCategoryColors] || 'bg-gray-500'),
        hexColor: cat.color // Store hex color for inline styles when needed
      }))
    : [
        { name: 'Music', icon: Music, color: 'bg-pink-500', hexColor: '#EC4899' },
        { name: 'Technology', icon: Laptop, color: 'bg-blue-500', hexColor: '#3B82F6' },
        { name: 'Art', icon: Palette, color: 'bg-purple-500', hexColor: '#8B5CF6' },
        { name: 'Business', icon: Briefcase, color: 'bg-green-500', hexColor: '#10B981' },
        { name: 'Sports', icon: Trophy, color: 'bg-orange-500', hexColor: '#F97316' },
        { name: 'Education', icon: GraduationCap, color: 'bg-indigo-500', hexColor: '#6366F1' },
      ];

  const visibleCategories = displayCategories.slice(0, 6);
  const hasMore = displayCategories.length > 6;

  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-center space-x-2 md:space-x-4 overflow-x-auto">
          {/* All Categories Button */}
          <Button
            variant={!selectedCategory ? "default" : "outline"}
            size="sm"
            className={`flex items-center space-x-2 whitespace-nowrap ${
              !selectedCategory ? 'bg-blue-600' : 'hover:bg-gray-50'
            }`}
            onClick={() => onCategorySelect?.('')}
          >
            <span className="hidden sm:inline">All</span>
          </Button>

          {visibleCategories.map((category) => {
            const Icon = category.icon;
            const isSelected = selectedCategory === category.name;
            
            return (
              <Button
                key={category.name}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className={`flex items-center space-x-2 whitespace-nowrap`}
                style={isSelected && category.hexColor ? { backgroundColor: category.hexColor, borderColor: category.hexColor } : {}}
                onClick={() => onCategorySelect?.(category.name)}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{category.name}</span>
              </Button>
            );
          })}
          
          {hasMore && (
            <Button variant="outline" size="sm" className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">More</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryList;
