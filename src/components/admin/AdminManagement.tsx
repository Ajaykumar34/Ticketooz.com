
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Calendar, 
  FileText, 
  Settings, 
  BarChart3,
  MapPin,
  Tags,
  Image,
  UserCheck,
  MessageSquare,
  DollarSign
} from 'lucide-react';

// Import management components
import UserManagement from './UserManagement';
import EventManagement from './EventManagement';
import VenueManagement from './VenueManagement';
import CategoryManagement from './CategoryManagement';
import TagManagement from './TagManagement';
import CarouselManagement from './CarouselManagement';
import AdminUserManagement from './AdminUserManagement';

import ComprehensiveFinancialReport from './ComprehensiveFinancialReport';
import TicketSalesReport from './TicketSalesReport';
import SoldTicketsManagement from './SoldTicketsManagement';
import ProfileSettings from './ProfileSettings';

const AdminManagement = () => {
  const [activeSection, setActiveSection] = useState('overview');

  const managementSections = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'events', label: 'Event Management', icon: Calendar },
    { id: 'venues', label: 'Venue Management', icon: MapPin },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'categories', label: 'Category Management', icon: FileText },
    { id: 'tags', label: 'Tag Management', icon: Tags },
    { id: 'carousel', label: 'Carousel Management', icon: Image },
    { id: 'admins', label: 'Admin Management', icon: UserCheck },
    { id: 'comprehensive-financial', label: 'Comprehensive Financial Report', icon: DollarSign },
    { id: 'sales', label: 'Ticket Sales', icon: BarChart3 },
    { id: 'tickets', label: 'Sold Tickets', icon: FileText },
    { id: 'profile', label: 'Profile Settings', icon: Settings },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'events':
        return <EventManagement />;
      case 'venues':
        return <VenueManagement />;
      case 'users':
        return <UserManagement />;
      case 'categories':
        return <CategoryManagement />;
      case 'tags':
        return <TagManagement />;
      case 'carousel':
        return <CarouselManagement />;
      case 'admins':
        return <AdminUserManagement />;
      case 'comprehensive-financial':
        return <ComprehensiveFinancialReport />;
      case 'sales':
        return <TicketSalesReport />;
      case 'tickets':
        return <SoldTicketsManagement />;
      case 'profile':
        return <ProfileSettings user={{}} />;
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {managementSections.filter(section => section.id !== 'overview').map((section) => {
              const IconComponent = section.icon;
              return (
                <Card key={section.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3">
                      <IconComponent className="w-6 h-6 text-blue-600" />
                      {section.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setActiveSection(section.id)}
                    >
                      Manage {section.label.replace(' Management', '')}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-gray-900">Admin Management</h1>
            {activeSection !== 'overview' && (
              <Button 
                variant="outline" 
                onClick={() => setActiveSection('overview')}
              >
                Back to Overview
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminManagement;
