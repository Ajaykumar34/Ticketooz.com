
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

interface EventFormArtistsProps {
  formData: any;
  onInputChange: (field: string, value: any) => void;
}

const EventFormArtists = ({ formData, onInputChange }: EventFormArtistsProps) => {
  // Ensure artists array always exists and has at least one artist
  const currentArtists = formData.artists && Array.isArray(formData.artists) && formData.artists.length > 0 
    ? formData.artists 
    : [{ name: '', image: '' }];

  const addArtist = () => {
    const updatedArtists = [...currentArtists, { name: '', image: '' }];
    onInputChange('artists', updatedArtists);
  };

  const removeArtist = (index: number) => {
    if (currentArtists.length > 1) {
      const updatedArtists = currentArtists.filter((_: any, i: number) => i !== index);
      onInputChange('artists', updatedArtists);
    }
  };

  const updateArtist = (index: number, field: string, value: string) => {
    const updatedArtists = [...currentArtists]; // Create a new array to prevent mutation
    updatedArtists[index] = { ...updatedArtists[index], [field]: value }; // Create new object
    onInputChange('artists', updatedArtists);
  };

  return (
    <div className="border-t pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Artist Information</h3>
        <Button type="button" onClick={addArtist} size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Add Artist
        </Button>
      </div>
      
      <div className="space-y-4">
        {currentArtists.map((artist: any, index: number) => (
          <div key={`artist-${index}`} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
            <div className="space-y-2">
              <Label htmlFor={`artistName-${index}`}>Artist Name {index === 0 ? '*' : ''}</Label>
              <Input
                id={`artistName-${index}`}
                value={artist.name || ''}
                onChange={(e) => updateArtist(index, 'name', e.target.value)}
                placeholder="Enter artist name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`artistImage-${index}`}>Artist Image URL</Label>
              <div className="flex space-x-2">
                <Input
                  id={`artistImage-${index}`}
                  value={artist.image || ''}
                  onChange={(e) => updateArtist(index, 'image', e.target.value)}
                  placeholder="https://example.com/artist.jpg"
                />
                {currentArtists.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => removeArtist(index)}
                    size="sm"
                    variant="outline" 
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventFormArtists;
