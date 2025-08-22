
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSeatCategories } from '@/hooks/useSeatCategories';

const SeatMapBuilder = ({ eventId, existingSeatMap, onSave }) => {
  const { categories, loading: categoriesLoading } = useSeatCategories(eventId);
  
  const [seatMap, setSeatMap] = useState({
    rows: 10,
    seatsPerRow: 12,
    seats: []
  });
  
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (existingSeatMap) {
      setSeatMap({
        ...existingSeatMap,
        seats: existingSeatMap.seats || []
      });
    } else {
      initializeSeatMap();
    }
  }, [existingSeatMap]);

  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0].id);
    }
  }, [categories]);

  const initializeSeatMap = () => {
    if (!categories.length) return;
    
    const seats = [];
    const defaultCategory = categories[0]?.id || '';
    
    for (let row = 0; row < seatMap.rows; row++) {
      for (let seat = 0; seat < seatMap.seatsPerRow; seat++) {
        seats.push({
          id: `${row}-${seat}`,
          row: row,
          seat: seat,
          category: defaultCategory,
          isBlocked: false,
          seatNumber: `${String.fromCharCode(65 + row)}${seat + 1}`
        });
      }
    }
    setSeatMap(prev => ({ ...prev, seats }));
  };

  const handleSeatClick = (seatId) => {
    if (!isEditing || !selectedCategory) return;
    
    setSeatMap(prev => ({
      ...prev,
      seats: (prev.seats || []).map(seat =>
        seat.id === seatId
          ? { ...seat, category: selectedCategory }
          : seat
      )
    }));
  };

  const toggleSeatBlock = (seatId) => {
    setSeatMap(prev => ({
      ...prev,
      seats: (prev.seats || []).map(seat =>
        seat.id === seatId
          ? { ...seat, isBlocked: !seat.isBlocked }
          : seat
      )
    }));
  };

  const handleSave = () => {
    const seatMapData = {
      ...seatMap,
      categories: categories
    };
    onSave(seatMapData);
    toast({
      title: "Seat Map Saved",
      description: "Seat map configuration has been saved successfully."
    });
  };

  const getCategoryColor = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.color : '#4ECDC4';
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Unknown';
  };

  if (categoriesLoading) {
    return <div className="text-center py-8">Loading seat categories...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Seat Map Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Seat Map Designer</span>
            <div className="flex items-center space-x-2">
              <Button
                variant={isEditing ? "destructive" : "default"}
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? 'Stop Editing' : 'Start Editing'}
              </Button>
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" />
                Save Map
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Map Controls */}
            <div className="flex space-x-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Rows</label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={seatMap.rows}
                  onChange={(e) => setSeatMap(prev => ({ ...prev, rows: parseInt(e.target.value) || 1 }))}
                  className="w-20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Seats per Row</label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={seatMap.seatsPerRow}
                  onChange={(e) => setSeatMap(prev => ({ ...prev, seatsPerRow: parseInt(e.target.value) || 1 }))}
                  className="w-32"
                />
              </div>
              <Button onClick={initializeSeatMap} variant="outline">
                Reset Map
              </Button>
            </div>

            {/* Category Selector for Editing */}
            {isEditing && categories.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Category to Apply</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
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
            )}

            {/* Seat Map Display */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="text-center mb-4">
                <div className="bg-gray-800 text-white py-2 px-4 rounded inline-block">
                  STAGE
                </div>
              </div>
              
              {categories.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Please create seat categories first before designing the seat map.
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {Array.from({ length: seatMap.rows }).map((_, rowIndex) => (
                      <div key={rowIndex} className="flex justify-center space-x-1">
                        <div className="w-8 text-center text-sm font-medium">
                          {String.fromCharCode(65 + rowIndex)}
                        </div>
                        {Array.from({ length: seatMap.seatsPerRow }).map((_, seatIndex) => {
                          const seatId = `${rowIndex}-${seatIndex}`;
                          const seat = (seatMap.seats || []).find(s => s.id === seatId);
                          const isBlocked = seat?.isBlocked || false;
                          const category = seat?.category || (categories[0]?.id || '');
                          
                          // Show blocked seats as white gaps
                          if (isBlocked) {
                            return (
                              <div 
                                key={seatId}
                                className="w-8 h-8 bg-white border border-gray-200 flex items-center justify-center text-xs font-medium"
                                title="Blocked/Passage - Double-click to unblock"
                                onDoubleClick={() => toggleSeatBlock(seatId)}
                              >
                                ✕
                              </div>
                            );
                          }
                          
                          return (
                            <button
                              key={seatId}
                              onClick={() => handleSeatClick(seatId)}
                              onDoubleClick={() => toggleSeatBlock(seatId)}
                              className={`w-8 h-8 text-xs font-medium border rounded flex items-center justify-center ${
                                isEditing 
                                  ? 'hover:scale-110 cursor-pointer transition-transform' 
                                  : 'cursor-default'
                              }`}
                              style={{
                                backgroundColor: getCategoryColor(category),
                                color: '#000',
                                borderColor: '#ccc'
                              }}
                              title={`Row ${String.fromCharCode(65 + rowIndex)}, Seat ${seatIndex + 1} (${getCategoryName(category)}) - Double-click to block`}
                            >
                              {seatIndex + 1}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  
                  {/* Legend */}
                  <div className="mt-6 flex flex-wrap gap-2 justify-center">
                    {categories.map(category => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <div 
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-sm">{category.name}</span>
                      </div>
                    ))}
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded border bg-white" />
                      <span className="text-sm">Blocked/Passage</span>
                    </div>
                  </div>
                </>
              )}
              
              <div className="mt-4 text-center text-sm text-gray-600">
                {isEditing ? 'Click seats to assign category, double-click to block/unblock' : 'Enable editing to modify seat layout'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SeatMapBuilder;
