
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Users, Calendar, MapPin, IndianRupee, Ticket } from 'lucide-react';

interface DashboardStats {
  totalBookings: number;
  totalRevenue: number;
  totalUsers: number;
  totalVenues: number;
  totalEvents: number;
  recentBookings: any[];
}

interface AdminDashboardStatsProps {
  selectedState?: string;
  selectedCity?: string;
  onStateChange: (state: string) => void;
  onCityChange: (city: string) => void;
}

const AdminDashboardStats = ({ 
  selectedState, 
  selectedCity, 
  onStateChange, 
  onCityChange 
}: AdminDashboardStatsProps) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    totalRevenue: 0,
    totalUsers: 0,
    totalVenues: 0,
    totalEvents: 0,
    recentBookings: []
  });
  const [loading, setLoading] = useState(true);
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    fetchStats();
    fetchStatesAndCities();
  }, [selectedState, selectedCity]);

  const fetchStatesAndCities = async () => {
    try {
      // Fetch unique states from venues
      const { data: statesData } = await supabase
        .from('venues')
        .select('state')
        .not('state', 'is', null);
      
      const uniqueStates = [...new Set(statesData?.map(v => v.state).filter(Boolean))];
      setStates(uniqueStates);

      // Fetch cities based on selected state
      if (selectedState && selectedState !== 'all_states') {
        const { data: citiesData } = await supabase
          .from('venues')
          .select('city')
          .eq('state', selectedState)
          .not('city', 'is', null);
        
        const uniqueCities = [...new Set(citiesData?.map(v => v.city).filter(Boolean))];
        setCities(uniqueCities);
      } else {
        setCities([]);
      }
    } catch (error) {
      console.error('Error fetching states and cities:', error);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Build venue filter for state/city
      let venueFilter = supabase.from('venues').select('id');
      
      if (selectedState && selectedState !== 'all_states') {
        venueFilter = venueFilter.eq('state', selectedState);
      }
      if (selectedCity && selectedCity !== 'all_cities') {
        venueFilter = venueFilter.eq('city', selectedCity);
      }

      const { data: venueIds } = await venueFilter;
      const filteredVenueIds = venueIds?.map(v => v.id) || [];

      // Fetch bookings with venue filter
      let bookingsQuery = supabase
        .from('bookings')
        .select(`
          *,
          events!inner (
            name,
            venues!inner (
              id,
              name,
              city,
              state
            )
          )
        `);

      if (filteredVenueIds.length > 0 && (selectedState !== 'all_states' || selectedCity !== 'all_cities')) {
        // Only apply venue filter if we have specific venues to filter by
        bookingsQuery = bookingsQuery.in('events.venue_id', filteredVenueIds);
      } else if ((selectedState && selectedState !== 'all_states') || (selectedCity && selectedCity !== 'all_cities')) {
        // If state/city selected but no venues match, return empty results
        bookingsQuery = bookingsQuery.eq('id', 'impossible-id');
      }

      const { data: bookings } = await bookingsQuery;

      // Fetch total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch venues with state/city filter
      let venuesQuery = supabase
        .from('venues')
        .select('*', { count: 'exact', head: true });
      
      if (selectedState && selectedState !== 'all_states') {
        venuesQuery = venuesQuery.eq('state', selectedState);
      }
      if (selectedCity && selectedCity !== 'all_cities') {
        venuesQuery = venuesQuery.eq('city', selectedCity);
      }

      const { count: totalVenues } = await venuesQuery;

      // Fetch events with venue filter
      let eventsQuery = supabase
        .from('events')
        .select('*', { count: 'exact', head: true });

      if (filteredVenueIds.length > 0 && (selectedState !== 'all_states' || selectedCity !== 'all_cities')) {
        eventsQuery = eventsQuery.in('venue_id', filteredVenueIds);
      } else if ((selectedState && selectedState !== 'all_states') || (selectedCity && selectedCity !== 'all_cities')) {
        eventsQuery = eventsQuery.eq('id', 'impossible-id');
      }

      const { count: totalEvents } = await eventsQuery;

      // Calculate revenue and bookings
      const totalRevenue = bookings?.reduce((sum, booking) => sum + (booking.total_price || 0), 0) || 0;
      const recentBookings = bookings?.slice(0, 5) || [];

      setStats({
        totalBookings: bookings?.length || 0,
        totalRevenue,
        totalUsers: totalUsers || 0,
        totalVenues: totalVenues || 0,
        totalEvents: totalEvents || 0,
        recentBookings
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
    setLoading(false);
  };

  const handleStateChange = (value: string) => {
    console.log('AdminDashboardStats - State change:', { value });
    // Convert 'all_states' back to empty string for the parent component
    onStateChange(value === 'all_states' ? '' : value);
  };

  const handleCityChange = (value: string) => {
    console.log('AdminDashboardStats - City change:', { value });
    // Convert 'all_cities' back to empty string for the parent component
    onCityChange(value === 'all_cities' ? '' : value);
  };

  if (loading) {
    return <div className="p-6">Loading dashboard statistics...</div>;
  }

  // Convert empty strings to our special values for the Select components
  const selectStateValue = selectedState === '' ? 'all_states' : selectedState;
  const selectCityValue = selectedCity === '' ? 'all_cities' : selectedCity;

  console.log('AdminDashboardStats - Select values:', { 
    selectedState, 
    selectedCity, 
    selectStateValue, 
    selectCityValue 
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4">
        <Select value={selectStateValue} onValueChange={handleStateChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_states">All States</SelectItem>
            {states.filter(state => state && state.trim() !== '').map((state) => (
              <SelectItem key={state} value={state}>
                {state}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectCityValue} onValueChange={handleCityChange} disabled={!selectedState || selectedState === ''}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select City" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_cities">All Cities</SelectItem>
            {cities.filter(city => city && city.trim() !== '').map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Venues</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVenues}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentBookings.length > 0 ? (
              stats.recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{booking.events?.name || 'Unknown Event'}</p>
                    <p className="text-sm text-gray-500">
                      {booking.events?.venues?.name}, {booking.events?.venues?.city}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(booking.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{booking.total_price}</p>
                    <p className="text-sm text-gray-500">{booking.quantity} tickets</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent bookings found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboardStats;
