
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EventFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedState: string;
  onStateChange: (state: string) => void;
  selectedCity: string;
  onCityChange: (city: string) => void;
  selectedVenue: string;
  onVenueChange: (venue: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

interface StateCity {
  state: string;
  cities: string[];
}

interface Venue {
  id: string;
  name: string;
  city: string;
  state: string;
}

const EventFilters = ({
  searchTerm,
  onSearchChange,
  selectedState,
  onStateChange,
  selectedCity,
  onCityChange,
  selectedVenue,
  onVenueChange,
  selectedCategory,
  onCategoryChange,
  onClearFilters,
  hasActiveFilters
}: EventFiltersProps) => {
  const [statesAndCities, setStatesAndCities] = useState<StateCity[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFiltersData();
  }, []);

  useEffect(() => {
    // Reset city and venue when state changes
    if (selectedState === 'all') {
      onCityChange('all');
      onVenueChange('all');
    } else {
      // Reset city when state changes to a specific state
      const stateData = statesAndCities.find(s => s.state === selectedState);
      if (stateData && !stateData.cities.includes(selectedCity)) {
        onCityChange('all');
      }
      onVenueChange('all');
    }
  }, [selectedState]);

  useEffect(() => {
    // Reset venue when city changes
    onVenueChange('all');
  }, [selectedCity]);

  const loadFiltersData = async () => {
    try {
      setLoading(true);
      
      // Load venues with states and cities
      const { data: venuesData, error: venuesError } = await supabase
        .from('venues')
        .select('id, name, city, state')
        .order('state', { ascending: true });

      if (venuesError) {
        console.error('Error loading venues:', venuesError);
        return;
      }

      setVenues(venuesData || []);

      // Group by states and cities
      const stateMap = new Map<string, Set<string>>();
      venuesData?.forEach(venue => {
        if (venue.state && venue.city) {
          if (!stateMap.has(venue.state)) {
            stateMap.set(venue.state, new Set());
          }
          stateMap.get(venue.state)?.add(venue.city);
        }
      });

      const statesAndCitiesData: StateCity[] = Array.from(stateMap.entries()).map(([state, cities]) => ({
        state,
        cities: Array.from(cities).sort()
      })).sort((a, b) => a.state.localeCompare(b.state));

      setStatesAndCities(statesAndCitiesData);

      // Load event categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('name')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (categoriesError) {
        console.error('Error loading categories:', categoriesError);
      } else {
        const categoryNames = categoriesData?.map(cat => cat.name) || [];
        
        // Also get categories from events table
        const { data: eventCategoriesData } = await supabase
          .from('events')
          .select('category')
          .not('category', 'is', null);

        const eventCategories = [...new Set(eventCategoriesData?.map(e => e.category) || [])];
        const allCategories = [...new Set([...categoryNames, ...eventCategories])].sort();
        setCategories(allCategories);
      }
    } catch (error) {
      console.error('Error loading filters data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableCities = () => {
    if (selectedState === 'all') {
      return [];
    }
    const stateData = statesAndCities.find(s => s.state === selectedState);
    return stateData?.cities || [];
  };

  const getAvailableVenues = () => {
    return venues.filter(venue => {
      if (selectedState !== 'all' && venue.state !== selectedState) {
        return false;
      }
      if (selectedCity !== 'all' && venue.city !== selectedCity) {
        return false;
      }
      return true;
    });
  };

  if (loading) {
    return (
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">Loading filters...</div>
      </div>
    );
  }

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
      {/* Search */}
      <div className="relative">
        <Label htmlFor="search">Search Events</Label>
        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            id="search"
            placeholder="Search by event name or category..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Filters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Category Filter */}
        <div>
          <Label>Category</Label>
          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* State Filter */}
        <div>
          <Label>State</Label>
          <Select value={selectedState} onValueChange={onStateChange}>
            <SelectTrigger>
              <SelectValue placeholder="All States" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {statesAndCities.map(stateData => (
                <SelectItem key={stateData.state} value={stateData.state}>
                  {stateData.state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* City Filter */}
        <div>
          <Label>City</Label>
          <Select 
            value={selectedCity} 
            onValueChange={onCityChange}
            disabled={selectedState === 'all'}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedState === 'all' ? 'Select State First' : 'All Cities'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {getAvailableCities().map(city => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Venue Filter */}
        <div>
          <Label>Venue</Label>
          <Select 
            value={selectedVenue} 
            onValueChange={onVenueChange}
            disabled={selectedState === 'all'}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedState === 'all' ? 'Select State First' : 'All Venues'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Venues</SelectItem>
              {getAvailableVenues().map(venue => (
                <SelectItem key={venue.id} value={venue.id}>
                  {venue.name} - {venue.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            <X className="w-4 h-4 mr-2" />
            Clear All Filters
          </Button>
        </div>
      )}
    </div>
  );
};

export default EventFilters;
