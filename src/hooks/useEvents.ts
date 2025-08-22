
// DEPRECATED: Events functionality has been removed
// This file is kept for backward compatibility but returns empty data

export interface Event {
  id: string;
  name: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
  venue_id?: string;
  category_id?: string;
  venues?: any;
  categories?: any;
  is_featured?: boolean;
  is_regular?: boolean;
}

export const useEvents = () => {
  return { 
    events: [] as Event[], 
    loading: false, 
    refetch: () => {} 
  };
};

export const useFeaturedEvents = () => {
  return { 
    events: [] as Event[], 
    loading: false, 
    refetch: () => {} 
  };
};
