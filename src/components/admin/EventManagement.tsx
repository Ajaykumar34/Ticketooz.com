
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Settings, TicketIcon, Plus, Copy, Trash2, MapPin, Clock, Users, RefreshCw, AlertTriangle, Tag } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OccurrenceTicketManager } from './OccurrenceTicketManager';
import OccurrenceTicketCategoryManager from './OccurrenceTicketCategoryManager';
import SeatCategoryManager from './SeatCategoryManager';
import EventFormRefactored from './EventFormRefactored';
import RecurringEventDebug from './RecurringEventDebug';
import { useToast } from '@/hooks/use-toast';
import { useRecurringEventStatus } from '@/hooks/useRecurringEventStatus';

interface Event {
  id: string;
  name: string;
  is_recurring: boolean;
  start_datetime: string;
  category: string;
  description: string;
  venue: string;
  city: string;
  state: string;
  status: string;
  is_active: boolean;
  poster?: string;
  recurrence_type?: string;
  recurrence_end_date?: string;
  event_time?: string;
  venues?: {
    name: string;
    city: string;
    state: string;
  };
}

const EventManagement = () => {
  const [selectedEventForTickets, setSelectedEventForTickets] = useState<string | null>(null);
  const [selectedEventForCategories, setSelectedEventForCategories] = useState<string | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [copyFromEvent, setCopyFromEvent] = useState<Event | null>(null);
  const [showDebugForEvent, setShowDebugForEvent] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ['admin-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          venues:venue_id (
            name,
            city,
            state
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Event[];
    },
  });

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setCopyFromEvent(null);
    setShowEventForm(true);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setCopyFromEvent(null);
    setShowEventForm(true);
  };

  const handleCopyEvent = (event: Event) => {
    setCopyFromEvent(event);
    setEditingEvent(null);
    setShowEventForm(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This will permanently delete all related data including bookings, tickets, and financial records. This action cannot be undone.')) {
      return;
    }

    try {
      console.log('Starting event deletion process for event:', eventId);

      // Get all occurrences for this event
      const { data: occurrences } = await supabase
        .from('event_occurrences')
        .select('id')
        .eq('event_id', eventId);

      const occurrenceIds = occurrences?.map(occ => occ.id) || [];
      console.log('Found occurrences:', occurrenceIds);

      // Delete all related data in correct order
      if (occurrenceIds.length > 0) {
        // Delete occurrence ticket categories
        console.log('Deleting occurrence ticket categories...');
        await supabase
          .from('occurrence_ticket_categories')
          .delete()
          .in('occurrence_id', occurrenceIds);

        // Delete seat bookings
        console.log('Deleting seat bookings...');
        await supabase
          .from('seat_bookings')
          .delete()
          .in('event_occurrence_id', occurrenceIds);

        // Delete GA ticket inventory
        console.log('Deleting GA ticket inventory...');
        await supabase
          .from('ga_ticket_inventory')
          .delete()
          .in('event_occurrence_id', occurrenceIds);
      }

      // Delete ALL bookings (including confirmed ones)
      console.log('Deleting all bookings...');
      await supabase
        .from('bookings')
        .delete()
        .eq('event_id', eventId);

      // Delete financial transactions
      console.log('Deleting financial transactions...');
      await supabase
        .from('financial_transactions')
        .delete()
        .eq('event_id', eventId);

      // Delete event occurrences
      console.log('Deleting event occurrences...');
      await supabase
        .from('event_occurrences')
        .delete()
        .eq('event_id', eventId);

      // Delete seat categories
      console.log('Deleting seat categories...');
      await supabase
        .from('seat_categories')
        .delete()
        .eq('event_id', eventId);

      // Delete event seat pricing
      console.log('Deleting event seat pricing...');
      await supabase
        .from('event_seat_pricing')
        .delete()
        .eq('event_id', eventId);

      // Delete seat layouts
      console.log('Deleting seat layouts...');
      await supabase
        .from('seat_layouts')
        .delete()
        .eq('event_id', eventId);

      // Finally delete the event
      console.log('Deleting event...');
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      console.log('Event deletion completed successfully');
      
      toast({
        title: "Success",
        description: "Event and all related data deleted successfully",
      });

      refetch();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error",
        description: "Failed to delete event. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateOccurrences = async (event: Event) => {
    try {
      console.log('Generating occurrences for event:', event.id);
      
      // Try the newer function first
      const { error: generateError } = await supabase.rpc('generate_recurring_occurrences', {
        p_event_id: event.id,
        p_start_date: event.start_datetime.split('T')[0],
        p_end_date: event.recurrence_end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        p_recurrence_type: event.recurrence_type || 'weekly',
        p_start_time: event.start_datetime.split('T')[1]?.split('.')[0] || '19:00:00',
        p_total_tickets: 100
      });

      if (generateError) {
        console.error('Primary generation error:', generateError);
        // Try fallback function
        const { error: fallbackError } = await supabase.rpc('generate_event_occurrences', {
          p_event_id: event.id
        });
        
        if (fallbackError) {
          console.error('Fallback generation error:', fallbackError);
          throw fallbackError;
        }
      }

      toast({
        title: "Success",
        description: "Event occurrences generated successfully",
      });
      
      // Refresh the events list
      refetch();
      
    } catch (error) {
      console.error('Generate occurrences error:', error);
      toast({
        title: "Error",
        description: "Failed to generate event occurrences. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateOccurrenceTimes = async (event: Event) => {
    if (!confirm(`Are you sure you want to update all occurrence times for "${event.name}" to match the event time (${event.event_time || 'not set'})?`)) {
      return;
    }

    try {
      const { updateOccurrenceTimesFromEvent } = await import('./utils/occurrenceTimeUtils');
      const success = await updateOccurrenceTimesFromEvent(event.id);
      
      if (success) {
        // Refresh the events list to show updated data
        refetch();
      }
    } catch (error) {
      console.error('Error updating occurrence times:', error);
      toast({
        title: "Error",
        description: "Failed to update occurrence times. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCloseForm = () => {
    setShowEventForm(false);
    setEditingEvent(null);
    setCopyFromEvent(null);
    refetch();
  };

  if (selectedEventForTickets) {
    return (
      <OccurrenceTicketManager
        eventId={selectedEventForTickets}
        onClose={() => setSelectedEventForTickets(null)}
      />
    );
  }

  if (selectedEventForCategories) {
    const selectedEvent = events?.find(e => e.id === selectedEventForCategories);
    
    // For non-recurring events, use SeatCategoryManager
    if (selectedEvent && !selectedEvent.is_recurring) {
      return (
        <SeatCategoryManager
          event={selectedEvent}
          onClose={() => setSelectedEventForCategories(null)}
        />
      );
    }
    
    // For recurring events, use OccurrenceTicketCategoryManager
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Manage Ticket Categories</h2>
          <Button variant="outline" onClick={() => setSelectedEventForCategories(null)}>
            Back to Events
          </Button>
        </div>
        <OccurrenceTicketCategoryManager eventId={selectedEventForCategories} />
      </div>
    );
  }

  if (showEventForm) {
    return (
      <EventFormRefactored
        event={editingEvent}
        copyFromEvent={copyFromEvent}
        onClose={handleCloseForm}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Event Management</h1>
          <p className="text-muted-foreground">Manage your events and ticket categories</p>
        </div>
        <Button onClick={handleCreateEvent}>
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </div>

      {events?.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No events found. Create your first event to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {events?.map((event) => (
            <EventCard 
              key={event.id} 
              event={event}
              onEdit={handleEditEvent}
              onCopy={handleCopyEvent}
              onDelete={handleDeleteEvent}
              onManageTickets={setSelectedEventForTickets}
              onManageCategories={setSelectedEventForCategories}
              onGenerateOccurrences={handleGenerateOccurrences}
              onShowDebug={setShowDebugForEvent}
              onUpdateOccurrenceTimes={handleUpdateOccurrenceTimes}
            />
          ))}
        </div>
      )}

      {/* Debug Panel */}
      {showDebugForEvent && (
        <div className="mt-8">
          <RecurringEventDebug
            eventId={showDebugForEvent}
            eventName={events?.find(e => e.id === showDebugForEvent)?.name || "Event"}
          />
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={() => setShowDebugForEvent(null)}>
              Close Debug Panel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const EventCard = ({ 
  event, 
  onEdit, 
  onCopy, 
  onDelete, 
  onManageTickets,
  onManageCategories,
  onGenerateOccurrences,
  onShowDebug,
  onUpdateOccurrenceTimes
}: {
  event: Event;
  onEdit: (event: Event) => void;
  onCopy: (event: Event) => void;
  onDelete: (eventId: string) => void;
  onManageTickets: (eventId: string) => void;
  onManageCategories: (eventId: string) => void;
  onGenerateOccurrences: (event: Event) => void;
  onShowDebug: (eventId: string) => void;
  onUpdateOccurrenceTimes: (event: Event) => void;
}) => {
  const { hasOccurrences, isGenerating, occurrenceCount } = useRecurringEventStatus(
    event.is_recurring ? event.id : undefined
  );

  const needsOccurrences = event.is_recurring && !hasOccurrences && !isGenerating;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Event Poster */}
      <div className="relative h-48 bg-gradient-to-br from-primary/10 to-secondary/10">
        {event.poster ? (
          <img
            src={event.poster}
            alt={event.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Calendar className="w-16 h-16 text-muted-foreground" />
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          <Badge variant={event.status === 'Active' ? 'default' : 'destructive'}>
            {event.status || 'Active'}
          </Badge>
        </div>

        {/* Occurrence Status for Recurring Events */}
        {event.is_recurring && (
          <div className="absolute top-2 left-2">
            {needsOccurrences && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                No Occurrences
              </Badge>
            )}
            {isGenerating && (
              <Badge variant="secondary" className="text-xs">
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                Generating...
              </Badge>
            )}
            {hasOccurrences && (
              <Badge variant="default" className="text-xs">
                {occurrenceCount} Occurrences
              </Badge>
            )}
          </div>
        )}
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="text-lg line-clamp-2">{event.name}</CardTitle>
        <div className="flex flex-wrap gap-1">
          <Badge variant={event.is_recurring ? "default" : "secondary"} className="text-xs">
            {event.is_recurring ? "Recurring" : "Single Event"}
          </Badge>
          <Badge variant="outline" className="text-xs">{event.category}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Event Details */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{new Date(event.start_datetime).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span className="truncate">
              {event.venues?.name || event.venue}, {event.venues?.city || event.city}
            </span>
          </div>
          {/* Show event time for recurring events */}
          {event.is_recurring && event.event_time && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Event Time: {event.event_time}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {event.description}
          </p>
        )}

        {/* Recurring Event Warning */}
        {needsOccurrences && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            This recurring event has no occurrences. Generate them manually.
          </div>
        )}

        {/* Recurring Event Info */}
        {event.is_recurring && hasOccurrences && (
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            Use "Manage Tickets" to configure ticket categories for each occurrence date.
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-1 pt-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(event)}>
            <Settings className="w-3 h-3 mr-1" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => onCopy(event)}>
            <Copy className="w-3 h-3 mr-1" />
            Copy
          </Button>

          {/* Manage Categories button for ALL events */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onManageCategories(event.id)}
            className="w-full"
          >
            <Tag className="w-3 h-3 mr-1" />
            Manage Categories
          </Button>

          {/* Manage Tickets button for non-recurring events */}
          {!event.is_recurring && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onManageTickets(event.id)}
              className="w-full"
            >
              <TicketIcon className="w-3 h-3 mr-1" />
              Manage Tickets
            </Button>
          )}
          
          {/* Recurring Event Actions */}
          {event.is_recurring && (
            <>
              {needsOccurrences && (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => onGenerateOccurrences(event)}
                  className="w-full"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Generate Occurrences
                </Button>
              )}
              
              {hasOccurrences && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onManageTickets(event.id)}
                    className="w-full"
                  >
                    <TicketIcon className="w-3 h-3 mr-1" />
                    Manage Tickets
                  </Button>

                  {/* New Update Times Button */}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onUpdateOccurrenceTimes(event)}
                    className="w-full text-xs"
                    title="Update all occurrence times to match event time"
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    Update Times
                  </Button>
                </>
              )}
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onShowDebug(event.id)}
                className="text-xs"
              >
                Debug
              </Button>
            </>
          )}
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onDelete(event.id)}
            className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EventManagement;
