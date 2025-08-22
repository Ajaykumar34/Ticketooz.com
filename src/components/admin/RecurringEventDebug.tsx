
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Play, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RecurringEventDebugProps {
  eventId: string;
  eventName: string;
}

const RecurringEventDebug = ({ eventId, eventName }: RecurringEventDebugProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [eventData, setEventData] = useState<any>(null);
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch event details
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;
      setEventData(event);

      // Fetch occurrences
      const { data: occs, error: occError } = await supabase
        .from('event_occurrences')
        .select('*')
        .eq('event_id', eventId)
        .order('occurrence_date', { ascending: true });

      if (occError) throw occError;
      setOccurrences(occs || []);

    } catch (error) {
      console.error('Debug fetch error:', error);
      toast({
        title: "Error",
        description: "Failed to fetch debug data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateOccurrences = async () => {
    if (!eventData) return;
    
    setIsLoading(true);
    try {
      // Try the newer function first
      const { error: generateError } = await supabase.rpc('generate_recurring_occurrences', {
        p_event_id: eventId,
        p_start_date: eventData.start_datetime.split('T')[0],
        p_end_date: eventData.recurrence_end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        p_recurrence_type: eventData.recurrence_type,
        p_start_time: eventData.start_datetime.split('T')[1]?.split('.')[0] || '19:00:00',
        p_total_tickets: 100
      });

      if (generateError) {
        // Try fallback
        const { error: fallbackError } = await supabase.rpc('generate_event_occurrences', {
          p_event_id: eventId
        });
        
        if (fallbackError) throw fallbackError;
      }

      toast({
        title: "Success",
        description: "Occurrences generation triggered",
      });
      
      // Refresh data
      setTimeout(fetchData, 1000);
      
    } catch (error) {
      console.error('Generate error:', error);
      toast({
        title: "Error",
        description: "Failed to generate occurrences",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [eventId]);

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="w-5 h-5" />
          Recurring Event Debug: {eventName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={fetchData} 
            variant="outline" 
            size="sm" 
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <Button 
            onClick={generateOccurrences} 
            variant="default" 
            size="sm" 
            disabled={isLoading || !eventData?.is_recurring}
          >
            <Play className="w-4 h-4 mr-2" />
            Generate Occurrences
          </Button>
        </div>

        {eventData && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Event Details</h4>
              <div className="space-y-1 text-sm">
                <div>ID: <code className="bg-muted px-1 rounded">{eventData.id}</code></div>
                <div>Recurring: <Badge variant={eventData.is_recurring ? "default" : "secondary"}>{eventData.is_recurring ? "Yes" : "No"}</Badge></div>
                <div>Type: <Badge variant="outline">{eventData.recurrence_type || "N/A"}</Badge></div>
                <div>Start: {eventData.start_datetime}</div>
                <div>End: {eventData.recurrence_end_date || "N/A"}</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Occurrences ({occurrences.length})</h4>
              <div className="max-h-32 overflow-y-auto space-y-1 text-sm">
                {occurrences.length === 0 ? (
                  <p className="text-muted-foreground">No occurrences found</p>
                ) : (
                  occurrences.map((occ, idx) => (
                    <div key={occ.id} className="flex justify-between">
                      <span>{occ.occurrence_date}</span>
                      <Badge variant={occ.is_active ? "default" : "secondary"} className="text-xs">
                        {occ.available_tickets}/{occ.total_tickets}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecurringEventDebug;
