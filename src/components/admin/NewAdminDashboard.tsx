
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Calendar, 
  MapPin, 
  Tag, 
  Ticket, 
  DollarSign, 
  BarChart3,
  LogOut,
  FileText,
  MessageSquare
} from 'lucide-react';

// Import management components
import UserManagement from './UserManagement';
import EventManagement from './EventManagement';
import VenueManagement from './VenueManagement';
import CategoryManagement from './CategoryManagement';
import TagManagement from './TagManagement';
import SoldTicketsManagement from './SoldTicketsManagement';
import ComprehensiveFinancialReport from './ComprehensiveFinancialReport';
import EventRequestManagement from './EventRequestManagement';

import DashboardOverview from './DashboardOverview';
import ProfileSettings from './ProfileSettings';
import OrderDetailsModule from './OrderDetailsModule';
import CarouselManagement from './CarouselManagement';
import UserBlockManagement from './UserBlockManagement';
import GlobalSeatCategoryManager from './GlobalSeatCategoryManager';

interface NewAdminDashboardProps {
  user: any;
  onLogout: () => void;
}

const NewAdminDashboard = ({ user, onLogout }: NewAdminDashboardProps) => {
  const [activeSection, setActiveSection] = useState('overview');

  const menuItems = [
    { id: 'overview', label: 'Dashboard Overview', icon: BarChart3, component: DashboardOverview },
    { id: 'events', label: 'Events', icon: Calendar, component: EventManagement },
    { id: 'venues', label: 'Venues', icon: MapPin, component: VenueManagement },
    { id: 'users', label: 'Users', icon: Users, component: UserManagement },
    { id: 'user-blocking', label: 'Block/Unblock Users', icon: Users, component: UserBlockManagement },
    { id: 'categories', label: 'Categories', icon: Tag, component: CategoryManagement },
    { id: 'seat-categories', label: 'Seat Categories', icon: Ticket, component: GlobalSeatCategoryManager },
    { id: 'tags', label: 'Tags', icon: Tag, component: TagManagement },
    { id: 'carousel', label: 'Carousel Management', icon: FileText, component: CarouselManagement },
    { id: 'event-requests', label: 'Event Requests', icon: MessageSquare, component: EventRequestManagement },
    { id: 'tickets', label: 'Sold Tickets', icon: Ticket, component: SoldTicketsManagement },
    { id: 'orders', label: 'Order Details', icon: FileText, component: OrderDetailsModule },
    { id: 'comprehensive-financial', label: 'Comprehensive Financial Report', icon: DollarSign, component: ComprehensiveFinancialReport },
    { id: 'profile', label: 'Profile Settings', icon: Users, component: () => <ProfileSettings user={user} /> },
  ];

  const renderContent = () => {
    const activeItem = menuItems.find(item => item.id === activeSection);
    if (activeItem) {
      const Component = activeItem.component;
      return <Component />;
    }
    return <DashboardOverview />;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex w-full">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Welcome, {user?.email || 'Admin'}</p>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <Button
                key={item.id}
                variant={activeSection === item.id ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection(item.id)}
              >
                <IconComponent className="w-4 h-4 mr-3" />
                {item.label}
              </Button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200">
          <Button 
            variant="outline" 
            className="w-full justify-start text-red-600 hover:text-red-700"
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4 mr-3" />
            Logout
          </Button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              {menuItems.find(item => item.id === activeSection)?.label || 'Dashboard'}
            </h2>
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString()}
            </div>
          </div>
        </header>
        
        {/* Content Area */}
        <main className="flex-1 p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default NewAdminDashboard;
