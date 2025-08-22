
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EventFiltersProps {
  selectedCity: string;
  selectedVenue: string;
  selectedDate: Date | undefined;
  selectedLanguage: string;
  onCityChange: (city: string) => void;
  onVenueChange: (venue: string) => void;
  onDateChange: (date: Date | undefined) => void;
  onLanguageChange: (language: string) => void;
  onClearFilters: () => void;
  venues: Array<{ id: string; name: string; city?: string }>;
  cities: string[];
  languages: string[];
}

const EventFilters = ({
  selectedCity,
  selectedVenue,
  selectedDate,
  selectedLanguage,
  onCityChange,
  onVenueChange,
  onDateChange,
  onLanguageChange,
  onClearFilters,
  venues,
  cities,
  languages
}: EventFiltersProps) => {
  const [filteredVenues, setFilteredVenues] = useState(venues);

  // Filter venues based on selected city
  useEffect(() => {
    if (selectedCity && selectedCity !== 'all') {
      setFilteredVenues(venues.filter(venue => venue.city === selectedCity));
      // Clear venue selection if it's not in the filtered list
      if (selectedVenue && selectedVenue !== 'all' && !venues.find(v => v.id === selectedVenue && v.city === selectedCity)) {
        onVenueChange('all');
      }
    } else {
      setFilteredVenues(venues);
    }
  }, [selectedCity, venues, selectedVenue, onVenueChange]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-4 items-center">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">Filters:</span>
        </div>
        
        {/* City Filter */}
        <div className="flex items-center space-x-2">
          <span className="font-medium text-gray-700">City:</span>
          <Select 
            value={selectedCity || 'all'} 
            onValueChange={(value) => onCityChange(value === 'all' ? '' : value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map(city => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Venue Filter */}
        <div className="flex items-center space-x-2">
          <span className="font-medium text-gray-700">Venue:</span>
          <Select 
            value={selectedVenue || 'all'} 
            onValueChange={(value) => onVenueChange(value === 'all' ? '' : value)}
            disabled={!selectedCity || selectedCity === ''}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Venues" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Venues</SelectItem>
              {filteredVenues.map(venue => (
                <SelectItem key={venue.id} value={venue.id}>{venue.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Filter */}
        <div className="flex items-center space-x-2">
          <span className="font-medium text-gray-700">Date:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-40 justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Any Date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={onDateChange}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Language Filter */}
        <div className="flex items-center space-x-2">
          <span className="font-medium text-gray-700">Language:</span>
          <Select 
            value={selectedLanguage || 'all'} 
            onValueChange={(value) => onLanguageChange(value === 'all' ? '' : value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All Languages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Languages</SelectItem>
              {languages.map(language => (
                <SelectItem key={language} value={language}>{language}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          variant="outline" 
          onClick={onClearFilters}
        >
          Clear All Filters
        </Button>
      </div>
    </div>
  );
};

export default EventFilters;
