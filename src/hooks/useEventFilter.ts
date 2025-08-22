
// DEPRECATED: Event filtering functionality has been removed
// This file is kept for backward compatibility but returns empty data

export const isPastEvent = () => {
  return false;
};

export function useEventFilter() {
  return { 
    currentEvents: [], 
    pastEvents: [], 
    displayedEvents: [] 
  };
}
