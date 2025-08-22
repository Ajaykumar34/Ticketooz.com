import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LocationVenueSelector from './LocationVenueSelector';
import TagSelector from './TagSelector';
import { useSubcategories } from '@/hooks/useSubcategories';

interface EventFormBasicDetailsProps {
  formData: any;
  setFormData: (data: any) => void;
  venues: any[];
  categories: any[];
  loading: boolean;
  onCategoryChange: (category: string) => void;
}

const EventFormBasicDetails = ({
  formData,
  setFormData,
  venues,
  categories,
  loading,
  onCategoryChange
}: EventFormBasicDetailsProps) => {
  // Get subcategories based on selected category
  const { subcategories, loading: subcategoriesLoading } = useSubcategories(formData.category);
  
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStateChange = (state: string) => {
    setFormData(prev => ({
      ...prev,
      state,
      city: '',
      venue: ''
    }));
  };

  const handleCityChange = (city: string) => {
    setFormData(prev => ({
      ...prev,
      city,
      venue: ''
    }));
  };

  const handleVenueChange = (venueId: string) => {
    const selectedVenue = venues.find(v => v.id === venueId);
    setFormData(prev => ({
      ...prev,
      venue: venueId,
      state: selectedVenue?.state || prev.state,
      city: selectedVenue?.city || prev.city
    }));
  };

  const handleTagsChange = (tags: string[]) => {
    setFormData(prev => ({
      ...prev,
      tags: tags
    }));
  };

  const handleGenresChange = (value: string) => {
    if (value.trim() && !formData.genres.includes(value.trim())) {
      setFormData(prev => ({
        ...prev,
        genres: [...prev.genres, value.trim()]
      }));
    }
  };

  const removeGenre = (genreToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      genres: prev.genres.filter(genre => genre !== genreToRemove)
    }));
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Event Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter event name"
              />
            </div>
            <div>
              <Label htmlFor="language">Language</Label>
              <Input
                id="language"
                value={formData.language}
                onChange={(e) => handleInputChange('language', e.target.value)}
                placeholder="Enter language"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter event description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category *</Label>
               <Select 
                 value={formData.category} 
                 onValueChange={(value) => {
                   handleInputChange('category', value);
                   // Clear sub category when category changes
                   handleInputChange('subCategory', '');
                   onCategoryChange(value);
                 }}
              >
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
             <div>
               <Label htmlFor="subCategory">Sub Category</Label>
               <Select 
                 value={formData.subCategory} 
                 onValueChange={(value) => handleInputChange('subCategory', value)}
                 disabled={!formData.category || subcategoriesLoading}
               >
                 <SelectTrigger>
                   <SelectValue placeholder={
                     !formData.category 
                       ? "Select category first" 
                       : subcategoriesLoading 
                         ? "Loading subcategories..." 
                         : subcategories.length === 0
                           ? "No subcategories available"
                           : "Select sub category"
                   } />
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

          {/* Genres */}
          <div>
            <Label htmlFor="genres">Genres</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.genres.map((genre, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {genre}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => removeGenre(genre)}
                  />
                </Badge>
              ))}
            </div>
            <Input
              id="genres"
              placeholder="Add genre and press Enter"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const target = e.target as HTMLInputElement;
                  handleGenresChange(target.value);
                  target.value = '';
                }
              }}
            />
          </div>

          {/* Tags with proper component */}
          <TagSelector
            selectedTags={formData.tags || []}
            onTagsChange={handleTagsChange}
          />
        </CardContent>
      </Card>

      {/* Location & Venue */}
      <Card>
        <CardHeader>
          <CardTitle>Location & Venue</CardTitle>
        </CardHeader>
        <CardContent>
          <LocationVenueSelector
            selectedState={formData.state}
            selectedCity={formData.city}
            selectedVenue={formData.venue}
            onStateChange={handleStateChange}
            onCityChange={handleCityChange}
            onVenueChange={handleVenueChange}
          />
        </CardContent>
      </Card>

      {/* Event Timing */}
      <Card>
        <CardHeader>
          <CardTitle>Event Timing & Layout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Layout Type Selection */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="layoutType">Event Layout Type</Label>
              <Select 
                value={formData.layoutType} 
                onValueChange={(value) => handleInputChange('layoutType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select layout type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Admission (No assigned seating)</SelectItem>
                  <SelectItem value="seatmap">Seat Map (Assigned seating)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-1">
                {formData.layoutType === 'general' 
                  ? 'Tickets will be sold by category without assigned seating. Seats are allocated at the venue.'
                  : 'Tickets will have specific seat assignments. Users can choose their exact seats.'
                }
              </p>
            </div>
          </div>

          {/* Event Type Selection */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onCheckedChange={(checked) => {
                    handleInputChange('isRecurring', checked);
                    if (checked) {
                      handleInputChange('isRegular', false);
                    }
                  }}
                />
                <Label htmlFor="isRecurring">Recurring Event</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="isRegular"
                  checked={formData.isRegular}
                  onCheckedChange={(checked) => {
                    handleInputChange('isRegular', checked);
                    if (checked) {
                      handleInputChange('isRecurring', false);
                    }
                  }}
                />
                <Label htmlFor="isRegular">Regular Event</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="isFeatured"
                  checked={formData.isFeatured}
                  onCheckedChange={(checked) => handleInputChange('isFeatured', checked)}
                />
                <Label htmlFor="isFeatured">Featured</Label>
              </div>
            </div>
          </div>

          {/* Recurring Event Fields */}
          {formData.isRecurring && (
            <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
              <h4 className="font-medium text-blue-800">Recurring Event Settings</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="recurrenceType">Recurrence Pattern *</Label>
                  <Select 
                    value={formData.recurrenceType} 
                    onValueChange={(value) => handleInputChange('recurrenceType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select pattern" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="eventExpiryMinutes">Booking Cutoff (minutes before start)</Label>
                  <Input
                    id="eventExpiryMinutes"
                    type="number"
                    value={formData.eventExpiryMinutes}
                    onChange={(e) => handleInputChange('eventExpiryMinutes', parseInt(e.target.value) || 60)}
                    placeholder="60"
                    min="0"
                  />
                </div>

                <div>
                  <Label htmlFor="recurrenceEndDate">End Date *</Label>
                  <Input
                    id="recurrenceEndDate"
                    type="date"
                    value={formData.recurrenceEndDate}
                    onChange={(e) => handleInputChange('recurrenceEndDate', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="date">
                {formData.isRecurring ? 'Start Date *' : 'Event Date *'}
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="time">Event Time *</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => handleInputChange('time', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                type="text"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', e.target.value)}
                placeholder="e.g., 2 hours, 90 minutes, 1.5 hours"
              />
              <p className="text-sm text-gray-500 mt-1">
                Enter duration in any format (e.g., "2 hours", "90 minutes", "1.5 hours")
              </p>
            </div>
          </div>

          {/* Ticket Sale Timing Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-green-50">
            <h4 className="font-medium text-green-800">Ticket Sale Timing</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ticketSaleStartDate">Sale Start Date *</Label>
                <Input
                  id="ticketSaleStartDate"
                  type="date"
                  value={formData.ticketSaleStartDate}
                  onChange={(e) => handleInputChange('ticketSaleStartDate', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ticketSaleStartTime">Sale Start Time *</Label>
                <Input
                  id="ticketSaleStartTime"
                  type="time"
                  value={formData.ticketSaleStartTime}
                  onChange={(e) => handleInputChange('ticketSaleStartTime', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ticketSaleEndDate">Sale End Date *</Label>
                <Input
                  id="ticketSaleEndDate"
                  type="date"
                  value={formData.ticketSaleEndDate}
                  onChange={(e) => handleInputChange('ticketSaleEndDate', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ticketSaleEndTime">Sale End Time *</Label>
                <Input
                  id="ticketSaleEndTime"
                  type="time"
                  value={formData.ticketSaleEndTime}
                  onChange={(e) => handleInputChange('ticketSaleEndTime', e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Media */}
      <Card>
        <CardHeader>
          <CardTitle>Media</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="poster">Poster URL</Label>
              <Input
                id="poster"
                value={formData.poster}
                onChange={(e) => handleInputChange('poster', e.target.value)}
                placeholder="Enter poster URL"
              />
            </div>
            <div>
              <Label htmlFor="eventLogo">Event Logo URL</Label>
              <Input
                id="eventLogo"
                value={formData.eventLogo}
                onChange={(e) => handleInputChange('eventLogo', e.target.value)}
                placeholder="Enter event logo URL"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Artists */}
      <Card>
        <CardHeader>
          <CardTitle>Artists</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.artists.map((artist, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`artistName${index}`}>Artist Name</Label>
                <Input
                  id={`artistName${index}`}
                  value={artist.name}
                  onChange={(e) => {
                    const newArtists = [...formData.artists];
                    newArtists[index].name = e.target.value;
                    handleInputChange('artists', newArtists);
                  }}
                  placeholder="Enter artist name"
                />
              </div>
              <div>
                <Label htmlFor={`artistImage${index}`}>Artist Image URL</Label>
                <Input
                  id={`artistImage${index}`}
                  value={artist.image}
                  onChange={(e) => {
                    const newArtists = [...formData.artists];
                    newArtists[index].image = e.target.value;
                    handleInputChange('artists', newArtists);
                  }}
                  placeholder="Enter artist image URL"
                />
              </div>
            </div>
          ))}
          
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              handleInputChange('artists', [...formData.artists, { name: '', image: '' }]);
            }}
          >
            Add Another Artist
          </Button>
        </CardContent>
      </Card>

      {/* Terms and Conditions */}
      <Card>
        <CardHeader>
          <CardTitle>Terms and Conditions</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.termsAndConditions}
            onChange={(e) => handleInputChange('termsAndConditions', e.target.value)}
            placeholder="Enter terms and conditions"
            rows={4}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default EventFormBasicDetails;
