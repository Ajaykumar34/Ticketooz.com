
import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { useTags } from '@/hooks/useTags';

interface TagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  disabled?: boolean;
}

const TagSelector = ({ selectedTags, onTagsChange, disabled = false }: TagSelectorProps) => {
  const { tags, loading } = useTags();
  const [newTagName, setNewTagName] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);

  const handleAddExistingTag = (tagName: string) => {
    if (tagName && !selectedTags.includes(tagName)) {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  const handleAddNewTag = () => {
    if (newTagName.trim() && !selectedTags.includes(newTagName.trim())) {
      onTagsChange([...selectedTags, newTagName.trim()]);
      setNewTagName('');
      setIsAddingNew(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddNewTag();
    }
    if (e.key === 'Escape') {
      setIsAddingNew(false);
      setNewTagName('');
    }
  };

  const availableTags = tags.filter(tag => !selectedTags.includes(tag.name));

  return (
    <div className="space-y-3">
      <Label>Tags</Label>
      
      {/* Selected Tags Display */}
      <div className="flex flex-wrap gap-2 min-h-[2rem]">
        {selectedTags.map((tag, index) => (
          <Badge key={index} variant="secondary" className="flex items-center gap-1">
            {tag}
            <X 
              className="w-3 h-3 cursor-pointer hover:text-red-500" 
              onClick={() => handleRemoveTag(tag)}
            />
          </Badge>
        ))}
        {selectedTags.length === 0 && (
          <span className="text-sm text-gray-500">No tags selected</span>
        )}
      </div>

      {/* Add Tags Section */}
      <div className="space-y-2">
        {!isAddingNew ? (
          <div className="flex gap-2">
            {/* Select Existing Tag */}
            {availableTags.length > 0 && (
              <Select onValueChange={handleAddExistingTag} disabled={disabled}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select existing tag" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  {availableTags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.name}>
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {/* Add New Tag Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddingNew(true)}
              disabled={disabled}
            >
              <Plus className="w-4 h-4 mr-1" />
              New Tag
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder="Enter new tag name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={disabled}
              autoFocus
            />
            <Button
              type="button"
              size="sm"
              onClick={handleAddNewTag}
              disabled={!newTagName.trim() || disabled}
            >
              Add
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAddingNew(false);
                setNewTagName('');
              }}
              disabled={disabled}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {loading && (
        <div className="text-sm text-gray-500">Loading tags...</div>
      )}
    </div>
  );
};

export default TagSelector;
