
import { useState, useEffect } from 'react';
import NewAdminDashboard from '../components/admin/NewAdminDashboard';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LoginForm from '@/components/auth/LoginForm';

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminData, setAdminData] = useState<any>(null);
  const [adminCheckLoading, setAdminCheckLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setAdminData(null);
        setAdminCheckLoading(false);
        return;
      }

      try {
        console.log('Checking admin status for:', user.email);
        
        const { data: adminCheck, error } = await supabase
          .from('admin_users')
          .select('id, role, permissions')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Admin check error:', error);
          setIsAdmin(false);
          setAdminData(null);
        } else if (adminCheck) {
          console.log('Admin user found:', adminCheck);
          setIsAdmin(true);
          setAdminData({
            id: user.id,
            email: user.email,
            isAdmin: true,
            adminRole: adminCheck.role,
            permissions: adminCheck.permissions || {
              events: true,
              venues: true,
              categories: true,
              users: true,
              bookings: true,
              reports: true,
              workshops: true,
              carousel: true,
              tags: true
            }
          });
        } else {
          console.log('User is not an admin:', user.email);
          setIsAdmin(false);
          setAdminData(null);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        setAdminData(null);
      } finally {
        setAdminCheckLoading(false);
      }
    };

    if (!authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading]);

  const handleLogout = async () => {
    console.log('Admin logout initiated');
    await signOut();
    setIsAdmin(false);
    setAdminData(null);
    console.log('Admin logout completed');
  };

  const handleLogin = (userData: any) => {
    console.log('Login successful for:', userData.email);
  };

  // Show loading while checking auth or admin status
  if (authLoading || adminCheckLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login if no user
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4">
        <LoginForm onLogin={handleLogin} />
      </div>
    );
  }

  // Show access denied if user is not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 via-pink-600 to-purple-800 p-4">
        <div className="text-center text-white">
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="mb-2">You don't have administrator privileges.</p>
          <p className="text-sm text-red-200 mb-6">
            Your account ({user.email}) is not registered as an admin user.
          </p>
          <button
            onClick={handleLogout}
            className="bg-white text-gray-900 px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Show admin dashboard
  return <NewAdminDashboard user={adminData} onLogout={handleLogout} />;
};

export default Index;
