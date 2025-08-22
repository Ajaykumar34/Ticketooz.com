
import { useEventRequestData } from './useEventRequestData';

// Re-export the new hook with the same interface for backward compatibility
export function useEventRequestManagement() {
  return useEventRequestData();
}
