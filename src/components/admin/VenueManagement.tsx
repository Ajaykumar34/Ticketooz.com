import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import VenueForm from './VenueForm';
import VenueFilters from './VenueFilters';
import VenueCard from './VenueCard';
import GlobalSeatCategoryManager from './GlobalSeatCategoryManager';
import { useVenuesWithFilters, VenueWithFilters } from '@/hooks/useVenuesWithFilters';

const VenueManagement = () => {
  const [showForm, setShowForm] = useState(false);
  const [showSeatCategories, setShowSeatCategories] = useState(false);
  const [editingVenue, setEditingVenue] = useState<VenueWithFilters | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');

  const { venues, loading, refetch, states, cities } = useVenuesWithFilters(
    selectedState === 'all' ? undefined : selectedState,
    selectedCity === 'all' ? undefined : selectedCity
  );

  // Filter venues by search term
  const filteredVenues = venues.filter(venue =>
    venue.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    venue.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    venue.state?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasActiveFilters = searchTerm !== '' || selectedState !== 'all' || selectedCity !== 'all';

  const handleCreateVenue = () => {
    setEditingVenue(null);
    setShowForm(true);
  };

  const handleEditVenue = (venue: VenueWithFilters) => {
    setEditingVenue(venue);
    setShowForm(true);
  };

  const handleDeleteVenue = async (venueId: string) => {
    if (!confirm('Are you sure you want to delete this venue? This will also delete all associated seat layouts and categories.')) return;

    try {
      const { error } = await supabase
        .from('venues')
        .delete()
        .eq('id', venueId);

      if (error) throw error;
      
      toast.success('Venue deleted successfully');
      refetch();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to delete venue');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingVenue(null);
    refetch();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingVenue(null);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedState('all');
    setSelectedCity('all');
  };

  // Show seat categories management
  if (showSeatCategories) {
    return <GlobalSeatCategoryManager />;
  }

  if (showForm) {
    return (
      <VenueForm
        venue={editingVenue}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Venue Management</h1>
          <p className="text-gray-600 mt-1">
            Manage venues with state and city filtering. Seat layouts are now managed at the event level.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => setShowSeatCategories(true)}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Manage Seat Categories
          </Button>
          <Button onClick={handleCreateVenue} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Venue
          </Button>
        </div>
      </div>

      <VenueFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedState={selectedState}
        onStateChange={setSelectedState}
        selectedCity={selectedCity}
        onCityChange={setSelectedCity}
        states={states}
        cities={cities}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Results Summary */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Results:</strong> {filteredVenues.length} venue(s) found
          {selectedState !== 'all' && ` in ${selectedState}`}
          {selectedCity !== 'all' && ` • ${selectedCity}`}
          {searchTerm && ` • matching "${searchTerm}"`}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="text-lg">Loading venues...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVenues.map((venue) => (
            <VenueCard
              key={venue.id}
              venue={venue}
              onEdit={handleEditVenue}
              onDelete={handleDeleteVenue}
              showSeatManagement={false}
            />
          ))}
        </div>
      )}

      {!loading && filteredVenues.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-lg mb-2">
            {hasActiveFilters 
              ? 'No venues found matching your criteria.' 
              : 'No venues created yet.'
            }
          </div>
          <div className="text-sm mb-4">
            {hasActiveFilters 
              ? 'Try adjusting your filters or search terms.'
              : 'Create your first venue to get started.'
            }
          </div>
          {hasActiveFilters && (
            <Button variant="outline" onClick={handleClearFilters}>
              Clear All Filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default VenueManagement;
