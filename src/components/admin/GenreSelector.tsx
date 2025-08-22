
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus } from 'lucide-react';

interface GenreSelectorProps {
  selectedGenres: string[];
  onGenresChange: (genres: string[]) => void;
}

const GenreSelector = ({ selectedGenres, onGenresChange }: GenreSelectorProps) => {
  const [newGenre, setNewGenre] = useState('');

  // Common genre suggestions (similar to how TagSelector works)
  const commonGenres = [
    'Classical', 'Rock', 'Pop', 'Jazz', 'Electronic', 'Folk', 'Hip Hop', 
    'Country', 'Blues', 'Reggae', 'R&B', 'Metal', 'Indie', 'Alternative',
    'Drama', 'Comedy', 'Musical', 'Opera', 'Dance', 'Contemporary',
    'Stand-up', 'Improv', 'Experimental', 'Children', 'Educational'
  ];

  const handleAddGenre = (genreName: string) => {
    if (genreName && !selectedGenres.includes(genreName)) {
      onGenresChange([...selectedGenres, genreName]);
    }
  };

  const handleRemoveGenre = (genreToRemove: string) => {
    onGenresChange(selectedGenres.filter(genre => genre !== genreToRemove));
  };

  const handleCreateAndAddGenre = () => {
    if (newGenre.trim()) {
      handleAddGenre(newGenre.trim());
      setNewGenre('');
    }
  };

  const availableGenres = commonGenres.filter(genre => !selectedGenres.includes(genre));

  return (
    <div className="space-y-4">
      <Label>Event Genres</Label>
      
      {/* Selected Genres */}
      <div className="flex flex-wrap gap-2 min-h-[2rem] p-2 border rounded-md bg-gray-50">
        {selectedGenres.length > 0 ? (
          selectedGenres.map((genre) => (
            <Badge key={genre} variant="secondary" className="flex items-center gap-1">
              {genre}
              <X 
                className="w-3 h-3 cursor-pointer hover:text-red-500" 
                onClick={() => handleRemoveGenre(genre)}
              />
            </Badge>
          ))
        ) : (
          <span className="text-gray-500 text-sm">No genres selected</span>
        )}
      </div>

      {/* Available Genres */}
      {availableGenres.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm">Suggested Genres:</Label>
          <div className="flex flex-wrap gap-2">
            {availableGenres.map((genre) => (
              <Badge 
                key={genre} 
                variant="outline" 
                className="cursor-pointer hover:bg-blue-50"
                onClick={() => handleAddGenre(genre)}
              >
                {genre}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Add New Genre */}
      <div className="flex gap-2">
        <Input
          placeholder="Add new genre"
          value={newGenre}
          onChange={(e) => setNewGenre(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleCreateAndAddGenre()}
        />
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleCreateAndAddGenre}
          disabled={!newGenre.trim()}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default GenreSelector;
