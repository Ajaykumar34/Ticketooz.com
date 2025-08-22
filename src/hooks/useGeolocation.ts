
import { useState, useEffect } from 'react';

interface GeolocationResult {
  city: string | null;
  loading: boolean;
  error: string | null;
  updateCity: (newCity: string) => void;
  detectCity: () => Promise<void>;
}

export const useGeolocation = (): GeolocationResult => {
  const [city, setCity] = useState<string | null>(() => {
    return localStorage.getItem('selectedCity') || null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reverseGeocode = async (lat: number, lon: number): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding failed');
      }
      
      const data = await response.json();
      
      // Extract city from the response with improved priority
      const address = data.address;
      
      // Priority order: city -> town -> village -> state_district -> county -> state
      // We explicitly avoid suburb, neighbourhood, locality to get proper city names
      const detectedCity = 
        address.city ||           // Main city (e.g., "Indore")
        address.town ||           // For smaller towns
        address.village ||        // For villages
        address.state_district || // Administrative district
        address.county ||         // County level
        address.state ||          // State as last resort
        null;
      
      // Clean the city name - remove area prefixes if present
      // Sometimes geocoding returns "Area Name, City Name" format
      const cleanCityName = detectedCity 
        ? detectedCity.split(',').pop()?.trim() || detectedCity
        : null;
      
      console.log('Geocoding response:', { address, detectedCity, cleanCityName });
      
      return cleanCityName;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  };

  const detectCity = async (): Promise<void> => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 600000 // 10 minutes cache
        });
      });

      const { latitude, longitude } = position.coords;
      const detectedCity = await reverseGeocode(latitude, longitude);
      
      if (detectedCity) {
        setCity(detectedCity);
        localStorage.setItem('selectedCity', detectedCity);
      } else {
        setError('Could not determine city from location');
      }
    } catch (error: any) {
      let errorMessage = 'Failed to detect location';
      
      if (error.code === 1) {
        errorMessage = 'Location access denied. Please enable location services.';
      } else if (error.code === 2) {
        errorMessage = 'Location unavailable. Please try again.';
      } else if (error.code === 3) {
        errorMessage = 'Location request timed out. Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateCity = (newCity: string) => {
    setCity(newCity);
    localStorage.setItem('selectedCity', newCity);
    setError(null);
  };

  // Auto-detect city on first load if no city is stored
  useEffect(() => {
    if (!city) {
      detectCity();
    }
  }, []);

  return { city, loading, error, updateCity, detectCity };
};
