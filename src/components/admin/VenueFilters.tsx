
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Filter, X } from 'lucide-react';

interface VenueFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedState: string;
  onStateChange: (value: string) => void;
  selectedCity: string;
  onCityChange: (value: string) => void;
  states: string[];
  cities: string[];
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", 
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", 
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", 
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir", 
  "Ladakh", "Puducherry", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", 
  "Lakshadweep", "Andaman and Nicobar Islands"
];

const VenueFilters = ({
  searchTerm,
  onSearchChange,
  selectedState,
  onStateChange,
  selectedCity,
  onCityChange,
  states,
  cities,
  onClearFilters,
  hasActiveFilters
}: VenueFiltersProps) => {
  // Filter cities based on selected state (if we have venue data) and ensure no empty strings
  const availableCities = selectedState && cities.length > 0 
    ? cities.filter(city => city && typeof city === 'string' && city.trim() !== '')
    : cities.filter(city => city && typeof city === 'string' && city.trim() !== '');

  // Filter states to ensure no empty strings
  const validStates = indianStates.filter(state => state && typeof state === 'string' && state.trim() !== '');

  console.log('VenueFilters - Debug:', {
    validStates: validStates.length,
    availableCities: availableCities.length,
    selectedState,
    selectedCity,
    hasEmptyStates: validStates.some(state => !state || state.trim() === ''),
    hasEmptyCities: availableCities.some(city => !city || city.trim() === '')
  });

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold">Filter Venues</h3>
        {hasActiveFilters && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onClearFilters}
            className="ml-auto"
          >
            <X className="w-4 h-4 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Search</label>
          <Input
            placeholder="Search venues..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">State</label>
          <Select value={selectedState} onValueChange={onStateChange}>
            <SelectTrigger>
              <SelectValue placeholder="All States" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_states">All States</SelectItem>
              {validStates.map(state => {
                console.log('VenueFilters - Rendering state:', { state, isValid: !!(state && state.trim()) });
                return (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">City</label>
          <Select 
            value={selectedCity} 
            onValueChange={onCityChange}
            disabled={!selectedState}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedState ? "Select City" : "Select State First"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_cities">All Cities</SelectItem>
              {availableCities.map(city => {
                console.log('VenueFilters - Rendering city:', { city, isValid: !!(city && city.trim()) });
                return (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Location</label>
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">
              {selectedState || 'All States'} {selectedCity ? `• ${selectedCity}` : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VenueFilters;
