
import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVenuesByLocation } from '@/hooks/useVenuesByLocation';

interface LocationVenueSelectorProps {
  selectedState: string;
  selectedCity: string;
  selectedVenue: string;
  onStateChange: (state: string) => void;
  onCityChange: (city: string) => void;
  onVenueChange: (venueId: string) => void;
  disabled?: boolean;
}

const LocationVenueSelector = ({
  selectedState,
  selectedCity,
  selectedVenue,
  onStateChange,
  onCityChange,
  onVenueChange,
  disabled = false
}: LocationVenueSelectorProps) => {
  const { venues, states, loading, getCitiesByState, getVenuesByStateAndCity } = useVenuesByLocation();
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [availableVenues, setAvailableVenues] = useState<any[]>([]);

  // Update cities when state changes
  useEffect(() => {
    console.log('State changed to:', selectedState);
    if (selectedState) {
      const cities = getCitiesByState(selectedState);
      console.log('Cities for selected state:', cities);
      setAvailableCities(cities);
      
      // Reset city and venue if current selections are invalid
      if (selectedCity && !cities.includes(selectedCity)) {
        console.log('Resetting city and venue - current city not valid for new state');
        onCityChange('');
        onVenueChange('');
      }
    } else {
      console.log('No state selected, clearing cities and venues');
      setAvailableCities([]);
      onCityChange('');
      onVenueChange('');
    }
  }, [selectedState, getCitiesByState, selectedCity, onCityChange, onVenueChange]);

  // Update venues when state or city changes
  useEffect(() => {
    console.log('Updating venues for state:', selectedState, 'city:', selectedCity);
    if (selectedState && selectedCity) {
      const venues = getVenuesByStateAndCity(selectedState, selectedCity);
      console.log('Venues for selected state and city:', venues);
      setAvailableVenues(venues);
      
      // Reset venue if current selection is invalid
      if (selectedVenue && !venues.find(v => v.id === selectedVenue)) {
        console.log('Resetting venue - current venue not valid for new state/city');
        onVenueChange('');
      }
    } else {
      console.log('No state or city selected, clearing venues');
      setAvailableVenues([]);
      if (selectedVenue) {
        onVenueChange('');
      }
    }
  }, [selectedState, selectedCity, getVenuesByStateAndCity, selectedVenue, onVenueChange]);

  const handleStateChange = (value: string) => {
    console.log('Manual state change to:', value);
    onStateChange(value);
    // City and venue will be cleared by the effect above
  };

  const handleCityChange = (value: string) => {
    console.log('Manual city change to:', value);
    onCityChange(value);
    // Venue will be cleared by the effect above
  };

  const handleVenueChange = (venueId: string) => {
    console.log('Manual venue change to:', venueId);
    onVenueChange(venueId);
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading location data...</div>;
  }

  return (
    <div className="space-y-4">
      {/* State Selector */}
      <div className="space-y-2">
        <Label htmlFor="state">State *</Label>
        <Select
          value={selectedState}
          onValueChange={handleStateChange}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a state" />
          </SelectTrigger>
          <SelectContent className="bg-white z-50">
            {states.length > 0 ? (
              states.map(state => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="no-states" disabled>
                No states available
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* City Selector */}
      <div className="space-y-2">
        <Label htmlFor="city">City *</Label>
        <Select
          value={selectedCity}
          onValueChange={handleCityChange}
          disabled={disabled || !selectedState || availableCities.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder={
              !selectedState 
                ? "Select state first" 
                : availableCities.length === 0 
                  ? "No cities available" 
                  : "Select a city"
            } />
          </SelectTrigger>
          <SelectContent className="bg-white z-50">
            {availableCities.length > 0 ? (
              availableCities.map(city => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="no-cities" disabled>
                {selectedState ? "No cities available for this state" : "Select state first"}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Venue Selector */}
      <div className="space-y-2">
        <Label htmlFor="venue">Venue *</Label>
        <Select
          value={selectedVenue}
          onValueChange={handleVenueChange}
          disabled={disabled || !selectedCity || availableVenues.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder={
              !selectedCity 
                ? "Select city first" 
                : availableVenues.length === 0 
                  ? "No venues available" 
                  : "Select a venue"
            } />
          </SelectTrigger>
          <SelectContent className="bg-white z-50">
            {availableVenues.length > 0 ? (
              availableVenues.map(venue => (
                <SelectItem key={venue.id} value={venue.id}>
                  {venue.name} - {venue.city}, {venue.state}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="no-venues" disabled>
                {selectedCity ? "No venues available for this city" : "Select city first"}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && selectedVenue && (
        <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
          <strong>Debug Info:</strong><br />
          Selected Venue ID: {selectedVenue}<br />
          Selected State: {selectedState}<br />
          Selected City: {selectedCity}<br />
          Available Cities: {availableCities.length}<br />
          Available Venues: {availableVenues.length}<br />
          Total Venues Loaded: {venues.length}
        </div>
      )}
    </div>
  );
};

export default LocationVenueSelector;
