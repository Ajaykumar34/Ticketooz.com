
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SimpleEventForm from './admin/SimpleEventForm';
import DynamicEventBooking from './DynamicEventBooking';
import { Settings, Users, Calendar } from 'lucide-react';

const SimplifiedEventDemo = () => {
  const [currentView, setCurrentView] = useState<'admin' | 'customer'>('admin');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  
  // Sample event ID - replace with actual event ID from your database
  const sampleEventId = 'cd4e9cf1-e70a-45ab-adf0-b3f2da672531';

  const handleEventCreated = (eventId: string) => {
    setSelectedEventId(eventId);
    setCurrentView('customer');
  };

  const handleBookingComplete = (bookingId: string) => {
    console.log('Booking completed:', bookingId);
    alert(`Booking confirmed! Booking ID: ${bookingId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl text-center">
              Dynamic Event Booking System
            </CardTitle>
            <p className="text-center text-gray-600 mt-2">
              Simplified event management with flexible date handling
            </p>
          </CardHeader>
        </Card>

        {/* Navigation */}
        <Card>
          <CardContent className="p-6">
            <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as 'admin' | 'customer')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Admin Panel
                </TabsTrigger>
                <TabsTrigger value="customer" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Customer Booking
                </TabsTrigger>
              </TabsList>

              <TabsContent value="admin" className="mt-6">
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">Admin Features</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Create events with single or multiple dates</li>
                      <li>• Dynamic date and time management</li>
                      <li>• Flexible ticket allocation per date</li>
                      <li>• Simple pricing configuration</li>
                    </ul>
                  </div>
                  <SimpleEventForm onEventCreated={handleEventCreated} />
                </div>
              </TabsContent>

              <TabsContent value="customer" className="mt-6">
                <div className="space-y-6">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-900 mb-2">Customer Features</h3>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• Browse available dates for events</li>
                      <li>• Real-time ticket availability display</li>
                      <li>• Simple 3-step booking process</li>
                      <li>• Instant booking confirmations</li>
                    </ul>
                  </div>
                  
                  <div className="flex gap-4 mb-4">
                    <Button
                      onClick={() => setSelectedEventId(sampleEventId)}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Calendar className="w-4 h-4" />
                      Load Sample Event
                    </Button>
                    {selectedEventId && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>Event ID: {selectedEventId}</span>
                      </div>
                    )}
                  </div>

                  {selectedEventId ? (
                    <DynamicEventBooking
                      eventId={selectedEventId}
                      onBookingComplete={handleBookingComplete}
                    />
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Event Selected</h3>
                        <p className="text-gray-600 mb-4">
                          Create a new event in the Admin panel or load the sample event to test the booking flow.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Features Overview */}
        <Card>
          <CardHeader>
            <CardTitle>System Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="font-semibold text-green-700">✅ Key Features</h4>
                <ul className="text-sm space-y-1">
                  <li>• Dynamic event creation</li>
                  <li>• Flexible date management</li>
                  <li>• Real-time availability tracking</li>
                  <li>• Simple booking workflow</li>
                  <li>• Customer information capture</li>
                  <li>• Instant booking confirmation</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-blue-700">🚀 Benefits</h4>
                <ul className="text-sm space-y-1">
                  <li>• No complex recurring logic</li>
                  <li>• Easy to understand and maintain</li>
                  <li>• Flexible for any event type</li>
                  <li>• Fast development and deployment</li>
                  <li>• Ready for customization</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SimplifiedEventDemo;
