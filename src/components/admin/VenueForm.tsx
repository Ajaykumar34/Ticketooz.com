import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VenueFormProps {
  venue?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const VenueForm = ({ venue, onSuccess, onCancel }: VenueFormProps) => {
  const [formData, setFormData] = useState({
    name: venue?.name || '',
    address: venue?.address || '',
    city: venue?.city || '',
    state: venue?.state || '',
    latitude: venue?.latitude || '',
    longitude: venue?.longitude || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const venueData = {
        name: formData.name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        latitude: formData.latitude || null,
        longitude: formData.longitude || null,
        updated_at: new Date().toISOString(),
      };

      if (venue) {
        // Update existing venue
        const { error } = await supabase
          .from('venues')
          .update(venueData)
          .eq('id', venue.id);

        if (error) throw error;
      } else {
        // Create new venue
        const { error } = await supabase
          .from('venues')
          .insert({
            ...venueData,
            created_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      toast({
        title: venue ? 'Venue Updated' : 'Venue Created',
        description: `Venue has been ${venue ? 'updated' : 'created'} successfully`,
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          name="address"
          value={formData.address}
          onChange={handleInputChange}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="city">City</Label>
        <Input
          id="city"
          name="city"
          value={formData.city}
          onChange={handleInputChange}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="state">State</Label>
        <Input
          id="state"
          name="state"
          value={formData.state}
          onChange={handleInputChange}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="latitude">Latitude</Label>
        <Input
          type="number"
          id="latitude"
          name="latitude"
          value={formData.latitude}
          onChange={handleInputChange}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="longitude">Longitude</Label>
        <Input
          type="number"
          id="longitude"
          name="longitude"
          value={formData.longitude}
          onChange={handleInputChange}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Venue'}
        </Button>
      </div>
    </form>
  );
};

export default VenueForm;
