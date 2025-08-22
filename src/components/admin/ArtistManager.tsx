
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Plus, User } from 'lucide-react';

interface Artist {
  name: string;
  image: string;
}

interface ArtistManagerProps {
  artists: Artist[];
  onArtistsChange: (artists: Artist[]) => void;
}

const ArtistManager = ({ artists, onArtistsChange }: ArtistManagerProps) => {
  const handleArtistChange = (index: number, field: keyof Artist, value: string) => {
    const updatedArtists = [...artists];
    updatedArtists[index] = { ...updatedArtists[index], [field]: value };
    onArtistsChange(updatedArtists);
  };

  const addArtist = () => {
    onArtistsChange([...artists, { name: '', image: '' }]);
  };

  const removeArtist = (index: number) => {
    if (artists.length > 1) {
      const updatedArtists = artists.filter((_, i) => i !== index);
      onArtistsChange(updatedArtists);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Artists</Label>
        <Button type="button" variant="outline" size="sm" onClick={addArtist}>
          <Plus className="w-4 h-4 mr-2" />
          Add Artist
        </Button>
      </div>

      <div className="space-y-4">
        {artists.map((artist, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Artist {index + 1}
                </div>
                {artists.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeArtist(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`artist-name-${index}`}>Artist Name</Label>
                  <Input
                    id={`artist-name-${index}`}
                    placeholder="Enter artist name"
                    value={artist.name}
                    onChange={(e) => handleArtistChange(index, 'name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`artist-image-${index}`}>Artist Image URL</Label>
                  <Input
                    id={`artist-image-${index}`}
                    placeholder="Enter image URL"
                    value={artist.image}
                    onChange={(e) => handleArtistChange(index, 'image', e.target.value)}
                  />
                </div>
              </div>
              
              {/* Image Preview */}
              {artist.image && (
                <div className="mt-4">
                  <Label className="text-sm text-gray-600">Preview:</Label>
                  <div className="mt-2 flex items-center gap-4">
                    <img 
                      src={artist.image} 
                      alt={artist.name || 'Artist preview'}
                      className="w-16 h-16 rounded-full object-cover border"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div>
                      <p className="font-medium">{artist.name || 'Artist Name'}</p>
                      <p className="text-sm text-gray-500">Artist Image Preview</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ArtistManager;
