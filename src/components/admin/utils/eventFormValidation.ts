
import { toast } from 'sonner';

export const validateEventForm = (formData: any) => {
  if (!formData.name.trim()) {
    toast.error('Event name is required');
    return false;
  }
  if (!formData.category) {
    toast.error('Event category is required');
    return false;
  }
  if (!formData.language) {
    toast.error('Event language is required');
    return false;
  }
  if (!formData.venue) {
    toast.error('Venue is required');
    return false;
  }
  if (!formData.date) {
    toast.error('Event date is required');
    return false;
  }
  if (!formData.time) {
    toast.error('Event time is required');
    return false;
  }
  if (!formData.ticketSaleStartDate || !formData.ticketSaleStartTime) {
    toast.error('Ticket sale start date and time are required');
    return false;
  }
  if (!formData.ticketSaleEndDate || !formData.ticketSaleEndTime) {
    toast.error('Ticket sale end date and time are required');
    return false;
  }
  
  for (let i = 0; i < formData.ticketCategories.length; i++) {
    const category = formData.ticketCategories[i];
    if (!category.name.trim()) {
      toast.error(`Ticket category ${i + 1} name is required`);
      return false;
    }
    if (!category.price || parseFloat(category.price) <= 0) {
      toast.error(`Ticket category ${i + 1} price is required and must be greater than 0`);
      return false;
    }
    if (!category.quantity || parseInt(category.quantity) <= 0) {
      toast.error(`Ticket category ${i + 1} quantity is required and must be greater than 0`);
      return false;
    }
  }
  
  return true;
};
