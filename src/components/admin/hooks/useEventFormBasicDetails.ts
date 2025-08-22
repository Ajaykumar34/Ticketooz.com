
import { useCallback } from 'react';

export const useEventFormBasicDetails = (formData: any, setFormData: any) => {
  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  }, [setFormData]);

  const handleStateChange = useCallback((state: string) => {
    setFormData((prev: any) => ({
      ...prev,
      state,
      city: '',
      venue: ''
    }));
  }, [setFormData]);

  const handleCityChange = useCallback((city: string) => {
    setFormData((prev: any) => ({
      ...prev,
      city,
      venue: ''
    }));
  }, [setFormData]);

  const handleVenueChange = useCallback((venueId: string) => {
    setFormData((prev: any) => ({
      ...prev,
      venue: venueId
    }));
  }, [setFormData]);

  const handleTagsChange = useCallback((tags: string[]) => {
    setFormData((prev: any) => ({
      ...prev,
      tags: tags
    }));
  }, [setFormData]);

  return {
    handleInputChange,
    handleStateChange,
    handleCityChange,
    handleVenueChange,
    handleTagsChange
  };
};
