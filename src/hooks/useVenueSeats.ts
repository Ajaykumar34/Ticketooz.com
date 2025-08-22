
/**
 * All venue seat features are deprecated because the "venue_seats" and "venues" tables have been removed.
 * This hook now returns only empty data and disabled loading.
 */
export interface VenueSeat {}
export const useVenueSeats = () => {
  return {
    seats: [],
    loading: false,
    createSeat: async () => { throw new Error('VenueSeats is deprecated'); },
    updateSeat: async () => { throw new Error('VenueSeats is deprecated'); },
    deleteSeat: async () => { throw new Error('VenueSeats is deprecated'); },
    bulkCreateSeats: async () => { throw new Error('VenueSeats is deprecated'); },
    refetch: () => {},
  };
};
