
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGeolocation } from '@/hooks/useGeolocation';
import { supabase } from '@/integrations/supabase/client';

interface CitySelectorProps {
  onCityChange: (city: string) => void;
  selectedCity: string;
}

const CitySelector = ({ onCityChange, selectedCity }: CitySelectorProps) => {
  const { city: detectedCity, loading, error, updateCity, detectCity } = useGeolocation();
  const [manualCity, setManualCity] = useState(selectedCity);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);

  // Fetch cities from database
  useEffect(() => {
    const fetchCities = async () => {
      try {
        setLoadingCities(true);
        
        // Get cities from venues
        const { data: venuesData, error: venuesError } = await supabase
          .from('venues')
          .select('city')
          .not('city', 'is', null);

        if (venuesError) {
          console.error('Error fetching cities from venues:', venuesError);
        }

        // Get cities from events
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select(`
            venues!inner(city)
          `)
          .eq('status', 'active');

        if (eventsError) {
          console.error('Error fetching cities from events:', eventsError);
        }

        // Combine and deduplicate cities
        const venueCities = venuesData?.map(v => v.city).filter(Boolean) || [];
        const eventCities = eventsData?.map(e => e.venues?.city).filter(Boolean) || [];
        
        const allCities = [...new Set([...venueCities, ...eventCities])].sort();
        
        console.log('Fetched cities:', allCities);
        setAvailableCities(allCities);
      } catch (error) {
        console.error('Error fetching cities:', error);
      } finally {
        setLoadingCities(false);
      }
    };

    fetchCities();
  }, []);

  useEffect(() => {
    if (detectedCity && !selectedCity) {
      onCityChange(detectedCity);
    }
  }, [detectedCity, selectedCity, onCityChange]);

  const handleManualCityChange = (city: string) => {
    setManualCity(city);
    updateCity(city);
    onCityChange(city);
  };

  const handleDetectLocation = () => {
    detectCity();
  };

  const handleAllCities = () => {
    updateCity('');
    onCityChange('all_cities');
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Select Your City
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto-detect Section */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">Auto-detect Location</h3>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleDetectLocation}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Navigation className="w-4 h-4" />
              )}
              {loading ? 'Detecting...' : 'Detect My Location'}
            </Button>
            {detectedCity && (
              <span className="text-sm text-green-600 font-medium">
                Detected: {detectedCity}
              </span>
            )}
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Manual Selection */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">Or Choose Manually</h3>
          {loadingCities ? (
            <div className="flex items-center gap-2 p-3 border rounded">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-gray-600">Loading cities...</span>
            </div>
          ) : (
            <Select value={manualCity} onValueChange={handleManualCityChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a city" />
              </SelectTrigger>
              <SelectContent>
                {availableCities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Show All Events Option */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">View All</h3>
          <Button
            variant="outline"
            onClick={handleAllCities}
            className="w-full"
          >
            Show Events from All Cities
          </Button>
        </div>

        {/* Current Selection Display */}
        {(selectedCity && selectedCity !== 'all_cities') && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Currently showing events in:</strong> {selectedCity}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Your selection is saved and will persist across browser sessions.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CitySelector;
