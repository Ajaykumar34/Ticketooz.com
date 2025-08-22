
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSubcategories } from '@/hooks/useSubcategories';

interface EventFormBasicInfoProps {
  formData: any;
  categories: any[];
  onInputChange: (field: string, value: any) => void;
  onCategoryChange: (category: string) => void;
}

const EventFormBasicInfo = ({
  formData,
  categories,
  onInputChange,
  onCategoryChange
}: EventFormBasicInfoProps) => {
  const { subcategories, loading: subcategoriesLoading } = useSubcategories(formData.category);

  const handleCategoryChange = (category: string) => {
    onInputChange('category', category);
    onInputChange('subCategory', ''); // Reset sub-category when main category changes
    onCategoryChange(category);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Event Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => onInputChange('name', e.target.value)}
            placeholder="Enter event name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="language">Language *</Label>
          <Input
            id="language"
            value={formData.language || ''}
            onChange={(e) => onInputChange('language', e.target.value)}
            placeholder="Enter event language (e.g., English, Hindi, Tamil)"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select value={formData.category} onValueChange={handleCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.name}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subCategory">Sub Category</Label>
          <Select 
            value={formData.subCategory} 
            onValueChange={(value) => onInputChange('subCategory', value)}
            disabled={!formData.category || subcategoriesLoading}
          >
            <SelectTrigger>
              <SelectValue 
                placeholder={
                  !formData.category 
                    ? "Select main category first" 
                    : subcategoriesLoading 
                    ? "Loading subcategories..." 
                    : subcategories.length === 0 
                    ? "No subcategories available" 
                    : "Select sub-category"
                } 
              />
            </SelectTrigger>
            <SelectContent>
              {subcategories.map((subcategory) => (
                <SelectItem key={subcategory.id} value={subcategory.name}>
                  {subcategory.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default EventFormBasicInfo;
