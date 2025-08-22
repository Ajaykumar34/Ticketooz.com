
import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EventFormBasicDetails from './EventFormBasicDetails';
import { EventFormTicketDetails } from './EventFormTicketDetails';
import EventFormSeatLayout from './EventFormSeatLayout';
import EventFormHeader from './EventFormHeader';
import { useCategories } from '@/hooks/useCategories';
import { useVenues } from '@/hooks/useVenues';
import { useSeatCategories } from '@/hooks/useSeatCategories';
import { useEventFormData } from './hooks/useEventFormData';
import { validateEventForm } from './utils/eventFormValidation';
import { saveEventForm } from './utils/eventFormSave';

interface EventFormProps {
  event?: any;
  copyFromEvent?: any;
  onClose: () => void;
}

const EventForm = ({ event, copyFromEvent, onClose }: EventFormProps) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [saving, setSaving] = useState(false);
  
  const { formData, setFormData } = useEventFormData(event, copyFromEvent);
  const { categories, loading: categoriesLoading } = useCategories();
  const { venues, loading: venuesLoading } = useVenues();
  const { categories: seatCategories } = useSeatCategories(formData.eventId);

  const dataLoading = categoriesLoading || venuesLoading;

  const handleCategoryChange = (categoryName: string) => {
    setFormData(prev => ({ ...prev, category: categoryName }));
  };

  const handleSave = async () => {
    if (!validateEventForm(formData)) return;
    
    setSaving(true);
    const success = await saveEventForm(formData, event, onClose);
    setSaving(false);
  };

  if (dataLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-8">Loading form data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <EventFormHeader
        event={event}
        copyFromEvent={copyFromEvent}
        saving={saving}
        onClose={onClose}
        onSave={handleSave}
      />

      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
        </CardHeader>
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Details</TabsTrigger>
              <TabsTrigger value="tickets">Ticket Details</TabsTrigger>
              <TabsTrigger value="seatlayout">Seat Layout</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="mt-6">
              <EventFormBasicDetails
                formData={formData}
                setFormData={setFormData}
                venues={venues}
                categories={categories}
                loading={dataLoading}
                onCategoryChange={handleCategoryChange}
              />
            </TabsContent>
            
            <TabsContent value="tickets" className="mt-6">
              <EventFormTicketDetails
                formData={formData}
                setFormData={setFormData}
              />
            </TabsContent>
            
            <TabsContent value="seatlayout" className="mt-6">
              <EventFormSeatLayout
                formData={formData}
                setFormData={setFormData}
                seatCategories={seatCategories}
              />
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>
  );
};

export default EventForm;
