
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, RefreshCw, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface RecurringEventStatusMessageProps {
  isGenerating: boolean;
  isLoading: boolean;
  error: string | null;
  occurrenceCount: number;
  onRefresh: () => void;
  eventName?: string;
}

const RecurringEventStatusMessage = ({ 
  isGenerating, 
  isLoading, 
  error, 
  occurrenceCount, 
  onRefresh,
  eventName 
}: RecurringEventStatusMessageProps) => {
  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            <div className="flex-1">
              <h3 className="font-semibold">Unable to Load Event Dates</h3>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <Button 
              onClick={onRefresh} 
              variant="outline" 
              size="sm"
              className="border-destructive/50 hover:bg-destructive/10"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || isGenerating) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-amber-700">
            <div className="relative">
              <Clock className="w-5 h-5" />
              <Loader2 className="w-3 h-3 animate-spin absolute -top-1 -right-1 text-amber-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">
                {isLoading ? 'Loading Event Details...' : 'Generating Event Dates...'}
              </h3>
              <p className="text-sm text-amber-600 mt-1">
                {isGenerating 
                  ? 'If this is a recurring event, occurrences may still be generating. Please refresh the page in a moment.'
                  : 'Please wait while we load the event information.'
                }
              </p>
              {eventName && (
                <p className="text-xs text-amber-600 mt-1">Event: {eventName}</p>
              )}
            </div>
            <Button 
              onClick={onRefresh} 
              variant="outline" 
              size="sm"
              disabled={isLoading}
              className="border-amber-300 hover:bg-amber-100"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (occurrenceCount === 0) {
    return (
      <Card className="border-muted-foreground/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Clock className="w-5 h-5" />
            <div className="flex-1">
              <h3 className="font-semibold">No Upcoming Dates Available</h3>
              <p className="text-sm mt-1">
                There are currently no future dates scheduled for this event.
              </p>
            </div>
            <Button 
              onClick={onRefresh} 
              variant="outline" 
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success state - occurrences found
  return (
    <Card className="border-green-200 bg-green-50">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 text-green-700">
          <CheckCircle className="w-5 h-5" />
          <div className="flex-1">
            <h3 className="font-semibold">Event Dates Available</h3>
            <p className="text-sm text-green-600 mt-1">
              Found {occurrenceCount} upcoming occurrence{occurrenceCount !== 1 ? 's' : ''} for this event.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecurringEventStatusMessage;
