
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface EventRequest {
  id: string;
  event_name: string;
  event_category: string;
  event_description: string | null;
  expected_attendees: number | null;
  preferred_venue: string | null;
  preferred_date: string | null;
  estimated_budget: number | null;
  contact_email: string;
  contact_phone: string | null;
  additional_info: string | null;
  admin_notes: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  user_id: string | null;
}

export function useEventRequestData() {
  const { user, session } = useAuth();
  const [requests, setRequests] = useState<EventRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if current user is admin
  const checkAdminStatus = async () => {
    if (!user || !session) {
      console.log('[useEventRequestData] No user session');
      return false;
    }

    try {
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('id, role')
        .eq('user_id', user.id)
        .single();

      if (adminError) {
        console.log('[useEventRequestData] Not an admin user:', adminError.message);
        return false;
      }

      console.log('[useEventRequestData] Admin user confirmed:', adminData);
      setIsAdmin(true);
      return true;
    } catch (err) {
      console.error('[useEventRequestData] Admin check failed:', err);
      return false;
    }
  };

  // Fetch event requests with simplified query
  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[useEventRequestData] Starting fetch...');

      // Check admin status first
      const hasAdminAccess = await checkAdminStatus();
      
      if (!hasAdminAccess) {
        setError('Admin access required to view event requests');
        setRequests([]);
        return;
      }

      // Use a simple select without any complex joins or RLS that might reference users table
      const { data, error: fetchError } = await supabase
        .from('event_requests')
        .select(`
          id,
          event_name,
          event_category,
          event_description,
          expected_attendees,
          preferred_venue,
          preferred_date,
          estimated_budget,
          contact_email,
          contact_phone,
          additional_info,
          admin_notes,
          status,
          created_at,
          updated_at,
          user_id
        `)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('[useEventRequestData] Fetch error:', fetchError);
        setError(`Failed to fetch requests: ${fetchError.message}`);
        setRequests([]);
        return;
      }

      console.log('[useEventRequestData] Successfully fetched', data?.length || 0, 'requests');
      setRequests(data || []);

    } catch (err: any) {
      console.error('[useEventRequestData] Unexpected error:', err);
      setError(`Unexpected error: ${err.message}`);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Update request status
  const updateRequestStatus = async (requestId: string, newStatus: string, adminNotes?: string) => {
    try {
      console.log('[useEventRequestData] Updating request:', { requestId, newStatus, adminNotes });

      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (adminNotes !== undefined) {
        updateData.admin_notes = adminNotes;
      }

      const { data, error } = await supabase
        .from('event_requests')
        .update(updateData)
        .eq('id', requestId)
        .select('*')
        .single();

      if (error) {
        console.error('[useEventRequestData] Update error:', error);
        throw new Error(`Failed to update request: ${error.message}`);
      }

      console.log('[useEventRequestData] Successfully updated request:', data);

      // Update local state
      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, ...data } : req
      ));

      return data;
    } catch (err: any) {
      console.error('[useEventRequestData] Update failed:', err);
      throw err;
    }
  };

  // Initial fetch
  useEffect(() => {
    if (user && session) {
      fetchRequests();
    } else {
      setLoading(false);
      setError('Authentication required');
    }
  }, [user, session]);

  return {
    requests,
    loading,
    error,
    isAdmin,
    refetch: fetchRequests,
    updateRequestStatus
  };
}
