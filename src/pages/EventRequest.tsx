import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Calendar, Send, LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';

const EventRequest = () => {
  const { user, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    eventName: '',
    eventType: '',
    description: '',
    expectedAttendees: '',
    venue: '',
    eventDate: '',
    budget: '',
    contactEmail: user?.email || '',
    contactPhone: '',
    additionalInfo: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Request Your Event</h1>
              <p className="text-gray-600">Please log in to submit an event request</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <LogIn className="w-5 h-5" />
                <span>Authentication Required</span>
              </CardTitle>
              <CardDescription>
                You need to be logged in to submit an event request
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8">
              <p className="text-gray-600 mb-6">
                Please log in or create an account to submit your event request.
              </p>
              <div className="space-x-4">
                <Button 
                  onClick={() => navigate('/login')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Log In
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/register')}
                >
                  Create Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log('Submitting form data:', formData);
      
      // Map form data to database field names and convert types
      const dbData = {
        event_name: formData.eventName,
        event_category: formData.eventType,
        event_description: formData.description,
        expected_attendees: formData.expectedAttendees ? parseInt(formData.expectedAttendees) : null,
        preferred_venue: formData.venue,
        preferred_date: formData.eventDate,
        estimated_budget: formData.budget ? parseFloat(formData.budget) : null,
        contact_email: formData.contactEmail,
        contact_phone: formData.contactPhone,
        additional_info: formData.additionalInfo,
        status: 'pending',
        user_id: user.id
      };

      console.log('Database data to insert:', dbData);

      const { data, error } = await supabase
        .from('event_requests')
        .insert(dbData)
        .select();

      if (error) {
        console.error('Supabase error details:', error);
        toast({
          title: "Error",
          description: `Failed to submit your event request: ${error.message}`,
          variant: "destructive"
        });
      } else {
        console.log('Event request saved successfully:', data);
        toast({
          title: "Request Submitted",
          description: "Your event request has been submitted successfully. We'll get back to you soon!",
        });
        navigate('/');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Request Your Event</h1>
            <p className="text-gray-600">Tell us about your event and we'll help make it happen</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Event Details</span>
            </CardTitle>
            <CardDescription>
              Provide detailed information about your event requirements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Name *
                  </label>
                  <Input
                    value={formData.eventName}
                    onChange={(e) => handleInputChange('eventName', e.target.value)}
                    placeholder="Enter event name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Type *
                  </label>
                  <Input
                    value={formData.eventType}
                    onChange={(e) => handleInputChange('eventType', e.target.value)}
                    placeholder="Conference, Concert, Workshop, etc."
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your event in detail"
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Attendees
                  </label>
                  <Input
                    type="number"
                    value={formData.expectedAttendees}
                    onChange={(e) => handleInputChange('expectedAttendees', e.target.value)}
                    placeholder="Number of attendees"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Date *
                  </label>
                  <Input
                    type="date"
                    value={formData.eventDate}
                    onChange={(e) => handleInputChange('eventDate', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Budget (₹)
                  </label>
                  <Input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => handleInputChange('budget', e.target.value)}
                    placeholder="Estimated budget"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Venue
                </label>
                <Input
                  value={formData.venue}
                  onChange={(e) => handleInputChange('venue', e.target.value)}
                  placeholder="Venue name or location preference"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Email *
                  </label>
                  <Input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Phone
                  </label>
                  <Input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Information
                </label>
                <Textarea
                  value={formData.additionalInfo}
                  onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                  placeholder="Any special requirements, technical needs, catering preferences, etc."
                  rows={3}
                />
              </div>

              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  disabled={isSubmitting}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EventRequest;
