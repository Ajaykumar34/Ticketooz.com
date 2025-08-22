
// DEPRECATED: Seat layout functionality has been removed
// This file is kept for backward compatibility but returns empty data

export const useSeatLayouts = () => {
  return { 
    seatLayouts: [], 
    loading: false, 
    refetch: () => {} 
  };
};

export const useSeats = (layoutId?: string) => {
  return { 
    seats: [], 
    loading: false, 
    refetch: () => {} 
  };
};
