import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Square, Ban, Navigation } from 'lucide-react';
import { useSeatCategories } from '@/hooks/useSeatCategories';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SeatPosition {
  id: string;
  row: string;
  number: string;
  x: number;
  y: number;
  categoryId: string;
  isBlocked: boolean;
  isPassage: boolean;
  isEditing?: boolean;
  editingField?: 'row' | 'number' | null;
}

interface TheaterSeatMapBuilderProps {
  eventId: string;
  onSeatMapUpdate?: (seatMap: any) => void;
}

const TheaterSeatMapBuilder = ({ eventId, onSeatMapUpdate }: TheaterSeatMapBuilderProps) => {
  const [rows, setRows] = useState(10);
  const [seatsPerRow, setSeatsPerRow] = useState(12);
  const [seats, setSeats] = useState<SeatPosition[]>([]);
  const [selectedTool, setSelectedTool] = useState<'category' | 'block' | 'passage'>('category');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingSeat, setEditingSeat] = useState<{ index: number; field: 'row' | 'number' } | null>(null);

  const { categories, loading: categoriesLoading } = useSeatCategories(eventId);
  const { toast } = useToast();

  // Remove duplicate categories and keep only unique ones by name
  const uniqueCategories = React.useMemo(() => {
    const seen = new Set();
    return categories.filter(category => {
      const key = `${category.name}-${category.base_price}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [categories]);

  console.log('TheaterSeatMapBuilder - Categories:', categories.length, 'Unique:', uniqueCategories.length);

  // Initialize seat map
  useEffect(() => {
    if (!categoriesLoading && uniqueCategories.length > 0) {
      if (!selectedCategoryId) {
        setSelectedCategoryId(uniqueCategories[0].id);
      }
      loadExistingLayout();
    }
  }, [uniqueCategories, categoriesLoading, eventId]);

  // Only regenerate seats when rows or seatsPerRow changes and we don't have existing seats
  useEffect(() => {
    if (uniqueCategories.length > 0 && seats.length === 0) {
      generateSeatsLayout();
    }
  }, [rows, seatsPerRow, uniqueCategories]);

  const loadExistingLayout = async () => {
    try {
      console.log('Loading existing layout for event:', eventId);
      setLoading(true);
      
      // Get the most recent active layout
      const { data: layoutData, error } = await supabase
        .from('seat_layouts')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading layout:', error);
        generateSeatsLayout();
        setLoading(false);
        return;
      }

      if (layoutData) {
        console.log('Found existing layout:', layoutData);
        
        // Update rows and seatsPerRow from existing layout
        const existingRows = layoutData.rows || 10;
        const existingColumns = layoutData.columns || 12;
        
        setRows(existingRows);
        setSeatsPerRow(existingColumns);
        
        // Load seats from database
        const { data: seatsData, error: seatsError } = await supabase
          .from('seats')
          .select(`
            *,
            seat_categories:seat_category_id (
              id,
              name,
              color,
              base_price
            )
          `)
          .eq('seat_layout_id', layoutData.id);

        if (seatsError) {
          console.error('Error loading seats:', seatsError);
          generateSeatsLayout();
        } else if (seatsData && seatsData.length > 0) {
          console.log('Loaded seats from database:', seatsData.length);
          const seatPositions: SeatPosition[] = seatsData.map(seat => ({
            id: seat.id,
            row: seat.row_name,
            number: seat.seat_number,
            x: seat.x_position,
            y: seat.y_position,
            categoryId: seat.seat_category_id,
            isBlocked: seat.is_blocked,
            isPassage: !seat.is_available && !seat.is_blocked
          }));
          setSeats(seatPositions);
        } else {
          console.log('No seats found in database, generating new layout');
          generateSeatsLayout();
        }
      } else {
        console.log('No existing layout found, generating new one');
        generateSeatsLayout();
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading layout:', error);
      generateSeatsLayout();
      setLoading(false);
    }
  };

  const generateSeatsLayout = () => {
    console.log('Generating seats layout with rows:', rows, 'seatsPerRow:', seatsPerRow, 'categories:', uniqueCategories.length);
    const newSeats: SeatPosition[] = [];
    
    for (let row = 0; row < rows; row++) {
      for (let seat = 0; seat < seatsPerRow; seat++) {
        const rowLabel = String.fromCharCode(65 + row);
        const seatNumber = (seat + 1).toString();
        
        newSeats.push({
          id: `temp-${row}-${seat}`,
          row: rowLabel,
          number: seatNumber,
          x: seat,
          y: row,
          categoryId: uniqueCategories.length > 0 ? uniqueCategories[0].id : '',
          isBlocked: false,
          isPassage: false
        });
      }
    }
    
    console.log('Generated seats:', newSeats.length);
    setSeats(newSeats);
  };

  const handleRowsChange = (newRows: number) => {
    const validRows = Math.max(1, Math.min(26, newRows));
    console.log('Updating rows to:', validRows);
    setRows(validRows);
  };

  const handleSeatsPerRowChange = (newSeatsPerRow: number) => {
    const validSeatsPerRow = Math.max(1, Math.min(50, newSeatsPerRow));
    console.log('Updating seats per row to:', validSeatsPerRow);
    setSeatsPerRow(validSeatsPerRow);
  };

  const handleSeatClick = (seatIndex: number) => {
    if (editingSeat?.index === seatIndex) {
      return;
    }

    const newSeats = [...seats];
    const seat = newSeats[seatIndex];

    switch (selectedTool) {
      case 'category':
        if (selectedCategoryId && !seat.isBlocked && !seat.isPassage) {
          seat.categoryId = selectedCategoryId;
          console.log(`Seat ${seatIndex} assigned to category:`, selectedCategoryId);
          setSeats(newSeats);
        }
        break;
      case 'block':
        seat.isBlocked = !seat.isBlocked;
        if (seat.isBlocked) {
          seat.isPassage = false;
        }
        setSeats(newSeats);
        break;
      case 'passage':
        seat.isPassage = !seat.isPassage;
        if (seat.isPassage) {
          seat.isBlocked = false;
        }
        setSeats(newSeats);
        break;
    }
  };

  const handleSeatDoubleClick = (seatIndex: number, field: 'row' | 'number') => {
    setEditingSeat({ index: seatIndex, field });
  };

  const handleSeatEdit = (seatIndex: number, field: 'row' | 'number', newValue: string) => {
    const newSeats = [...seats];
    if (field === 'row') {
      newSeats[seatIndex].row = newValue.toUpperCase();
    } else {
      newSeats[seatIndex].number = newValue;
    }
    setSeats(newSeats);
  };

  const handleSeatEditBlur = () => {
    setEditingSeat(null);
  };

  const handleSeatEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setEditingSeat(null);
    }
  };

  const getSeatColor = (seat: SeatPosition) => {
    if (seat.isBlocked) return '#dc2626';
    if (seat.isPassage) return '#f3f4f6';
    
    const category = uniqueCategories.find(cat => cat.id === seat.categoryId);
    return category?.color || '#4ECDC4';
  };

  const getSeatCategory = (seat: SeatPosition) => {
    return uniqueCategories.find(cat => cat.id === seat.categoryId);
  };

  const saveSeatLayout = async () => {
    if (!eventId || eventId === 'new-event') {
      toast({
        title: "Error",
        description: "Please save the event first before creating seat layout",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      console.log('Saving seat layout for event:', eventId);

      const layoutDataObj = {
        rows: rows,
        seatsPerRow: seatsPerRow,
        totalSeats: seats.filter(s => !s.isPassage && !s.isBlocked).length,
        lastUpdated: new Date().toISOString()
      };

      // First, deactivate all existing layouts for this event
      await supabase
        .from('seat_layouts')
        .update({ is_active: false })
        .eq('event_id', eventId);

      // Create new layout
      const { data: newLayout, error: createError } = await supabase
        .from('seat_layouts')
        .insert({
          event_id: eventId,
          name: 'Main Theater Layout',
          rows: rows,
          columns: seatsPerRow,
          layout_data: layoutDataObj,
          is_active: true
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating layout:', createError);
        throw createError;
      }

      const layoutId = newLayout.id;
      console.log('Created new layout:', layoutId);

      // Delete existing seats for this layout to prevent duplicates
      await supabase
        .from('seats')
        .delete()
        .eq('seat_layout_id', layoutId);

      // Insert new seats with row and number data
      const seatsToInsert = seats.map(seat => ({
        seat_layout_id: layoutId,
        seat_category_id: seat.categoryId || uniqueCategories[0]?.id,
        seat_number: seat.number,
        row_name: seat.row,
        row_label: seat.row,
        x_position: seat.x,
        y_position: seat.y,
        is_available: !seat.isPassage && !seat.isBlocked,
        is_blocked: seat.isBlocked
      })).filter(seat => seat.seat_category_id);

      console.log('Inserting seats:', seatsToInsert.length);

      if (seatsToInsert.length > 0) {
        // Insert seats in batches to avoid large queries
        const batchSize = 100;
        for (let i = 0; i < seatsToInsert.length; i += batchSize) {
          const batch = seatsToInsert.slice(i, i + batchSize);
          const { error: seatsError } = await supabase
            .from('seats')
            .insert(batch);

          if (seatsError) {
            console.error('Error inserting seats batch:', seatsError);
            throw seatsError;
          }
        }
      }

      console.log('Saved seats successfully');

      // Update the event's seat map
      if (onSeatMapUpdate) {
        onSeatMapUpdate({
          layoutId: layoutId,
          rows: rows,
          seatsPerRow: seatsPerRow,
          seats: seats
        });
      }

      toast({
        title: "Success",
        description: "Seat layout saved successfully",
      });

    } catch (error) {
      console.error('Error saving seat layout:', error);
      toast({
        title: "Error",
        description: `Failed to save seat layout: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const seatMapKey = `${rows}-${seatsPerRow}-${seats.length}-${seats.map(s => `${s.categoryId}-${s.isBlocked}-${s.isPassage}`).join(',')}`;

  if (loading || categoriesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Theater Seat Layout</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading seat categories and layout...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (uniqueCategories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Theater Seat Layout</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">No seat categories found. Please create seat categories first before setting up the theater seat layout.</p>
            <p className="text-gray-600">Go to the Ticket Details section to create seat categories.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theater Seat Layout Builder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Layout Controls */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rows">Number of Rows</Label>
            <Input
              id="rows"
              type="number"
              min="1"
              max="26"
              value={rows}
              onChange={(e) => handleRowsChange(parseInt(e.target.value) || 1)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seatsPerRow">Seats Per Row</Label>
            <Input
              id="seatsPerRow"
              type="number"
              min="1"
              max="50"
              value={seatsPerRow}
              onChange={(e) => handleSeatsPerRowChange(parseInt(e.target.value) || 1)}
            />
          </div>
        </div>

        {/* Tool Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Tools</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedTool === 'category' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTool('category')}
            >
              <Square className="w-4 h-4 mr-2" />
              Assign Category
            </Button>
            <Button
              variant={selectedTool === 'block' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTool('block')}
            >
              <Ban className="w-4 h-4 mr-2" />
              Block/Unblock
            </Button>
            <Button
              variant={selectedTool === 'passage' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTool('passage')}
            >
              <Navigation className="w-4 h-4 mr-2" />
              Passage
            </Button>
          </div>

          {selectedTool === 'category' && (
            <div className="space-y-2">
              <Label>Select Category</Label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueCategories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name} (₹{category.base_price})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Legend</h3>
          <div className="flex flex-wrap gap-4">
            {uniqueCategories.map(category => (
              <div key={category.id} className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded border-2 border-gray-300"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-sm">{category.name} (₹{category.base_price})</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded border-2 border-gray-300 bg-red-600" />
              <span className="text-sm">Blocked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded border-2 border-gray-300 bg-gray-200" />
              <span className="text-sm">Passage</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">How to use:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Single click: Apply selected tool (Category/Block/Passage)</li>
            <li>• Double click on row letter: Edit row name</li>
            <li>• Double click on seat number: Edit seat number</li>
            <li>• Select a tool and category first before clicking seats</li>
            <li>• Changes are saved when you click "Save Seat Layout"</li>
          </ul>
        </div>

        {/* Seat Map */}
        <div className="space-y-4">
          <div className="text-center">
            <div className="bg-gray-200 px-4 py-2 rounded mb-4 inline-block">
              STAGE
            </div>
          </div>
          
          <div className="overflow-auto max-h-96 border rounded p-4">
            <div 
              className="grid gap-1 mx-auto"
              style={{ 
                gridTemplateColumns: `repeat(${seatsPerRow}, 1fr)`,
                maxWidth: `${seatsPerRow * 50}px`
              }}
            >
              {Array.from({ length: rows }, (_, rowIndex) => {
                const rowSeats = seats.filter(seat => seat.y === rowIndex);
                rowSeats.sort((a, b) => a.x - b.x);
                
                return rowSeats.map((seat, seatIndexInRow) => {
                  const seatGlobalIndex = seats.findIndex(s => s.id === seat.id);
                  const seatColor = getSeatColor(seat);
                  const isCurrentlyEditingRow = editingSeat?.index === seatGlobalIndex && editingSeat?.field === 'row';
                  const isCurrentlyEditingNumber = editingSeat?.index === seatGlobalIndex && editingSeat?.field === 'number';
                  
                  return (
                    <div
                      key={`${seat.id}-${seatGlobalIndex}-${seat.categoryId}`}
                      className={`
                        w-12 h-12 border border-gray-300 rounded text-xs flex flex-col items-center justify-center cursor-pointer
                        hover:border-gray-500 relative group transition-colors duration-200
                        ${seat.isPassage ? 'border-dashed bg-gray-100' : ''}
                        ${seat.isBlocked ? 'bg-red-600 text-white' : ''}
                      `}
                      style={{ 
                        backgroundColor: seatColor,
                        color: seat.isBlocked ? '#fff' : seat.isPassage ? '#666' : '#000'
                      }}
                      onClick={() => handleSeatClick(seatGlobalIndex)}
                      title={`${seat.row}${seat.number} - ${getSeatCategory(seat)?.name || 'No category'} ${seat.isBlocked ? '(BLOCKED)' : ''} ${seat.isPassage ? '(PASSAGE)' : ''}`}
                    >
                      {seat.isBlocked ? (
                        'X'
                      ) : seat.isPassage ? (
                        ''
                      ) : (
                        <div className="flex flex-col items-center justify-center w-full h-full">
                          {/* Row Letter - Editable */}
                          <div 
                            className="text-xs font-bold leading-none mb-0.5 cursor-pointer hover:bg-black hover:bg-opacity-10 px-1 rounded"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              handleSeatDoubleClick(seatGlobalIndex, 'row');
                            }}
                          >
                            {isCurrentlyEditingRow ? (
                              <input
                                type="text"
                                value={seat.row}
                                onChange={(e) => handleSeatEdit(seatGlobalIndex, 'row', e.target.value)}
                                onBlur={handleSeatEditBlur}
                                onKeyPress={handleSeatEditKeyPress}
                                className="w-4 bg-transparent border-none text-center text-xs outline-none font-bold"
                                style={{ color: 'inherit' }}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                                maxLength={2}
                              />
                            ) : (
                              seat.row
                            )}
                          </div>
                          
                          {/* Seat Number - Editable */}
                          <div 
                            className="text-xs font-medium leading-none cursor-pointer hover:bg-black hover:bg-opacity-10 px-1 rounded"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              handleSeatDoubleClick(seatGlobalIndex, 'number');
                            }}
                          >
                            {isCurrentlyEditingNumber ? (
                              <input
                                type="text"
                                value={seat.number}
                                onChange={(e) => handleSeatEdit(seatGlobalIndex, 'number', e.target.value)}
                                onBlur={handleSeatEditBlur}
                                onKeyPress={handleSeatEditKeyPress}
                                className="w-6 bg-transparent border-none text-center text-xs outline-none font-medium"
                                style={{ color: 'inherit' }}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                                maxLength={3}
                              />
                            ) : (
                              seat.number
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                });
              }).flat()}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end space-x-2">
          <Button onClick={generateSeatsLayout} variant="outline">
            Reset Layout
          </Button>
          <Button onClick={saveSeatLayout} disabled={saving}>
            {saving ? 'Saving...' : 'Save Seat Layout'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TheaterSeatMapBuilder;
