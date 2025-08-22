import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSeatCategories } from '@/hooks/useSeatCategories';
import SeatCategoryManager from './SeatCategoryManager';

interface SeatLayoutData {
  rows?: number;
  seatsPerRow?: number;
  seats?: Array<{
    id: string;
    row: number;
    seat: number;
    category: string;
    isBlocked: boolean;
    seatNumber: string;
    rowName: string;
  }>;
}

const VenueSeatManager = ({ venue, onClose }) => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    fetchVenueEvents();
  }, [venue.id]);

  const fetchVenueEvents = async () => {
    try {
      setLoadingEvents(true);
      console.log('VenueSeatManager - Fetching events for venue:', venue.id);
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('venue_id', venue.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('VenueSeatManager - Fetch events error:', error);
        throw error;
      }

      console.log('VenueSeatManager - Found events:', data);
      setEvents(data || []);
    } catch (error) {
      console.error('VenueSeatManager - Error fetching events:', error);
      toast.error('Failed to load events for this venue');
    } finally {
      setLoadingEvents(false);
    }
  };

  if (selectedEvent) {
    return (
      <EventSeatManager
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Venues
          </Button>
          <h1 className="text-3xl font-bold">Events at {venue.name}</h1>
        </div>
      </div>

      {loadingEvents ? (
        <div className="text-center py-8">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium mb-2">No events found</p>
          <p>This venue doesn't have any events yet. Create an event first to manage its seating layout.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          <h2 className="text-xl font-semibold mb-4">Select an event to manage its seating:</h2>
          {events.map((event) => (
            <Card key={event.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{event.name}</CardTitle>
                    <p className="text-gray-600">
                      {new Date(event.start_datetime).toLocaleDateString()} at{' '}
                      {new Date(event.start_datetime).toLocaleTimeString()}
                    </p>
                    <Badge variant="outline" className="mt-2">
                      {event.category}
                    </Badge>
                  </div>
                  <Button onClick={() => setSelectedEvent(event)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Manage Seats
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Component for managing seats for a specific event
const EventSeatManager = ({ event, onClose }) => {
  const [seatLayout, setSeatLayout] = useState({
    name: `${event.name} Layout`,
    rows: 10,
    seatsPerRow: 12,
    seats: []
  });
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingSeat, setEditingSeat] = useState(null);
  const [editSeatNumber, setEditSeatNumber] = useState('');
  const [existingLayoutId, setExistingLayoutId] = useState(null);

  const { categories, loading: categoriesLoading, refetch: refetchCategories } = useSeatCategories(event.id);

  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0].id);
    }
  }, [categories, selectedCategory]);

  useEffect(() => {
    fetchSeatLayout();
  }, [event.id]);

  const fetchSeatLayout = async () => {
    try {
      console.log('EventSeatManager - Fetching seat layout for event:', event.id);
      
      const { data, error } = await supabase
        .from('seat_layouts')
        .select('*')
        .eq('event_id', event.id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        console.error('EventSeatManager - Fetch error:', error);
        throw error;
      }

      if (data) {
        console.log('EventSeatManager - Found existing layout:', data);
        setExistingLayoutId(data.id);
        const layoutData = data.layout_data as SeatLayoutData;
        setSeatLayout({
          name: data.name,
          rows: layoutData.rows || 10,
          seatsPerRow: layoutData.seatsPerRow || 12,
          seats: layoutData.seats || []
        });
        
        if (layoutData.seats && layoutData.seats.length > 0) {
          await syncSeatsToDatabase(data.id, layoutData.seats);
        }
      } else {
        console.log('EventSeatManager - No layout found, initializing default');
        initializeSeatLayout();
      }
    } catch (error) {
      console.error('EventSeatManager - Error fetching seat layout:', error);
      initializeSeatLayout();
    }
  };

  const syncSeatsToDatabase = async (layoutId, seats) => {
    try {
      console.log('EventSeatManager - Syncing seats to database');
      
      await supabase
        .from('seats')
        .delete()
        .eq('seat_layout_id', layoutId);

      const seatInserts = seats.map(seat => ({
        seat_layout_id: layoutId,
        seat_category_id: seat.category || categories[0]?.id,
        seat_number: seat.seatNumber,
        row_name: seat.rowName,
        x_position: seat.seat,
        y_position: seat.row,
        is_available: !seat.isBlocked,
        is_blocked: seat.isBlocked || false
      }));

      const { error } = await supabase
        .from('seats')
        .insert(seatInserts);

      if (error) {
        console.error('EventSeatManager - Error syncing seats:', error);
      } else {
        console.log('EventSeatManager - Seats synced successfully');
      }
    } catch (error) {
      console.error('EventSeatManager - Error in syncSeatsToDatabase:', error);
    }
  };

  const initializeSeatLayout = () => {
    console.log('EventSeatManager - Initializing seat layout with rows:', seatLayout.rows, 'seatsPerRow:', seatLayout.seatsPerRow);
    const seats = [];
    for (let row = 0; row < seatLayout.rows; row++) {
      for (let seat = 0; seat < seatLayout.seatsPerRow; seat++) {
        const defaultCategory = categories.find(cat => cat.name === 'General')?.id || categories[0]?.id;
        seats.push({
          id: `${row}-${seat}`,
          row: row,
          seat: seat,
          category: defaultCategory || '',
          isBlocked: false,
          seatNumber: `${String.fromCharCode(65 + row)}${seat + 1}`,
          rowName: String.fromCharCode(65 + row)
        });
      }
    }
    setSeatLayout(prev => ({ ...prev, seats }));
  };

  const handleSeatClick = (seatId) => {
    if (!isEditing || !selectedCategory) return;
    
    setSeatLayout(prev => ({
      ...prev,
      seats: prev.seats.map(seat =>
        seat.id === seatId
          ? { ...seat, category: selectedCategory }
          : seat
      )
    }));
  };

  const handleSeatDoubleClick = (seat) => {
    setEditingSeat(seat);
    setEditSeatNumber(seat.seatNumber);
  };

  const handleSeatNumberUpdate = () => {
    if (!editSeatNumber.trim()) {
      toast.error('Seat number cannot be empty');
      return;
    }

    setSeatLayout(prev => ({
      ...prev,
      seats: prev.seats.map(seat =>
        seat.id === editingSeat.id
          ? { ...seat, seatNumber: editSeatNumber.trim() }
          : seat
      )
    }));

    setEditingSeat(null);
    setEditSeatNumber('');
    toast.success('Seat number updated');
  };

  const toggleSeatBlock = (seatId) => {
    setSeatLayout(prev => ({
      ...prev,
      seats: prev.seats.map(seat =>
        seat.id === seatId
          ? { ...seat, isBlocked: !seat.isBlocked }
          : seat
      )
    }));
  };

  const getCategoryColor = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.color : '#4ECDC4';
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Unknown';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log('EventSeatManager - Saving seat layout:', seatLayout);
      
      const layoutData = {
        event_id: event.id,
        name: seatLayout.name,
        layout_data: {
          rows: seatLayout.rows,
          seatsPerRow: seatLayout.seatsPerRow,
          seats: seatLayout.seats
        },
        is_active: true,
        updated_at: new Date().toISOString()
      };

      let layoutId = existingLayoutId;
      let result;
      
      if (existingLayoutId) {
        console.log('EventSeatManager - Updating existing layout:', existingLayoutId);
        result = await supabase
          .from('seat_layouts')
          .update(layoutData)
          .eq('id', existingLayoutId)
          .select();
      } else {
        console.log('EventSeatManager - Creating new layout');
        result = await supabase
          .from('seat_layouts')
          .insert({
            ...layoutData,
            created_at: new Date().toISOString()
          })
          .select();
        
        if (result.data && result.data[0]) {
          layoutId = result.data[0].id;
          setExistingLayoutId(layoutId);
        }
      }

      if (result.error) {
        console.error('EventSeatManager - Save error:', result.error);
        throw result.error;
      }

      if (layoutId) {
        console.log('EventSeatManager - Saving individual seats');
        
        await supabase
          .from('seats')
          .delete()
          .eq('seat_layout_id', layoutId);

        const seatInserts = seatLayout.seats.map(seat => ({
          seat_layout_id: layoutId,
          seat_category_id: seat.category || categories[0]?.id,
          seat_number: seat.seatNumber,
          row_name: seat.rowName,
          x_position: seat.seat,
          y_position: seat.row,
          is_available: !seat.isBlocked,
          is_blocked: seat.isBlocked || false
        }));

        const { error: seatsError } = await supabase
          .from('seats')
          .insert(seatInserts);

        if (seatsError) {
          console.error('EventSeatManager - Error saving seats:', seatsError);
          toast.error('Layout saved but failed to save individual seats');
        } else {
          console.log('EventSeatManager - Seats saved successfully');
        }
      }

      console.log('EventSeatManager - Save successful');
      toast.success('Seat layout and seats saved successfully');
    } catch (error) {
      console.error('EventSeatManager - Save error:', error);
      toast.error(`Failed to save seat layout: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (showCategoryManager) {
    return (
      <SeatCategoryManager
        event={event}
        onClose={() => {
          setShowCategoryManager(false);
          refetchCategories();
        }}
      />
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Button>
          <h1 className="text-3xl font-bold">Seat Management - {event.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCategoryManager(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Manage Categories
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Layout'}
          </Button>
        </div>
      </div>

      {/* Layout Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Seat Layout Configuration</span>
            <Button
              variant={isEditing ? "destructive" : "default"}
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Stop Editing' : 'Start Editing'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <Label>Layout Name</Label>
              <Input
                value={seatLayout.name}
                onChange={(e) => setSeatLayout(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Rows</Label>
              <Input
                type="number"
                min="1"
                max="20"
                value={seatLayout.rows}
                onChange={(e) => setSeatLayout(prev => ({ ...prev, rows: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Seats per Row</Label>
              <Input
                type="number"
                min="1"
                max="30"
                value={seatLayout.seatsPerRow}
                onChange={(e) => setSeatLayout(prev => ({ ...prev, seatsPerRow: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Category to Apply</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={!isEditing}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: category.color }}
                        />
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={initializeSeatLayout} variant="outline">
            Reset Layout
          </Button>
        </CardContent>
      </Card>

      {/* Seat Map */}
      <Card>
        <CardHeader>
          <CardTitle>Seat Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="text-center mb-4">
              <div className="bg-gray-800 text-white py-2 px-4 rounded inline-block">
                STAGE
              </div>
            </div>
            
            <div className="space-y-2 mb-6">
              {Array.from({ length: seatLayout.rows }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex justify-center space-x-1">
                  <div className="w-8 text-center text-sm font-medium">
                    {String.fromCharCode(65 + rowIndex)}
                  </div>
                  {Array.from({ length: seatLayout.seatsPerRow }).map((_, seatIndex) => {
                    const seatId = `${rowIndex}-${seatIndex}`;
                    const seat = seatLayout.seats.find(s => s.id === seatId);
                    const isBlocked = seat?.isBlocked || false;
                    const category = seat?.category || '';
                    
                    return (
                      <button
                        key={seatId}
                        onClick={() => handleSeatClick(seatId)}
                        onDoubleClick={() => handleSeatDoubleClick(seat)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          toggleSeatBlock(seatId);
                        }}
                        className={`w-8 h-8 text-xs border rounded relative ${
                          isBlocked 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : isEditing 
                              ? 'hover:scale-110 cursor-pointer' 
                              : 'cursor-default'
                        } ${isBlocked ? 'line-through' : ''}`}
                        style={{
                          backgroundColor: isBlocked ? '#9CA3AF' : getCategoryColor(category),
                          color: isBlocked ? '#fff' : '#000'
                        }}
                        title={`${seat?.seatNumber || `${seatIndex + 1}`} (${getCategoryName(category)}) - Double-click to edit number, Right-click to block`}
                      >
                        {seat?.seatNumber || `${seatIndex + 1}`}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {categories.map(category => (
                <div key={category.id} className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm">{category.name} (₹{category.base_price})</span>
                </div>
              ))}
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded border bg-gray-400" />
                <span className="text-sm">Blocked</span>
              </div>
            </div>
            
            <div className="text-center text-sm text-gray-600">
              {isEditing ? 'Click: Assign category | Double-click: Edit seat number | Right-click: Block/unblock' : 'Enable editing to modify seat layout'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seat Number Edit Modal */}
      {editingSeat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Edit Seat Number</h3>
            <div className="space-y-4">
              <div>
                <Label>Seat Number</Label>
                <Input
                  value={editSeatNumber}
                  onChange={(e) => setEditSeatNumber(e.target.value)}
                  placeholder="Enter seat number"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSeatNumberUpdate} className="flex-1">
                  Update
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingSeat(null);
                    setEditSeatNumber('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VenueSeatManager;
