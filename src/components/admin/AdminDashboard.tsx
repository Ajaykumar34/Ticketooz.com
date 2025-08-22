
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Sidebar from './Sidebar';
import DashboardOverview from './DashboardOverview';
import EventManagement from './EventManagement';
import VenueManagement from './VenueManagement';
import CategoryManagement from './CategoryManagement';
import TagManagement from './TagManagement';
import SoldTicketsManagement from './SoldTicketsManagement';
import FinancialReport from './FinancialReport';
import UserManagement from './UserManagement';
import ProfileSettings from './ProfileSettings';
import EventRequestManagement from './EventRequestManagement';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'event-requests':
        return <EventRequestManagement />;
      case 'events':
        return <EventManagement />;
      case 'venues':
        return <VenueManagement />;
      case 'categories':
        return <CategoryManagement />;
      case 'tags':
        return <TagManagement />;
      case 'sold-tickets':
        return <SoldTicketsManagement />;
      case 'financial-report':
        return <FinancialReport />;
      case 'users':
        return <UserManagement />;
      case 'profile':
        return <ProfileSettings user={user} />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
