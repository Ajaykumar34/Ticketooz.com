
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  FolderOpen, 
  Tag, 
  Ticket, 
  DollarSign, 
  ClipboardList, 
  Users, 
  User,
  Calendar,
  MapPin
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'event-requests', label: 'Event Requests', icon: ClipboardList },
    { id: 'events', label: 'Event Management', icon: Calendar },
    { id: 'venues', label: 'Venue Management', icon: MapPin },
    { id: 'categories', label: 'Categories', icon: FolderOpen },
    { id: 'tags', label: 'Tags', icon: Tag },
    { id: 'sold-tickets', label: 'Sold Tickets', icon: Ticket },
    { id: 'comprehensive-financial-report', label: 'Comprehensive Financial Report', icon: DollarSign },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'profile', label: 'Profile Settings', icon: User },
  ];

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-border bg-gradient-to-r from-primary to-primary/80">
        <h2 className="text-2xl font-bold text-primary-foreground tracking-wide">
          Ticketooz Admin Hub
        </h2>
        <p className="text-sm text-primary-foreground/80 mt-1">Management Dashboard</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant={activeTab === item.id ? "default" : "ghost"}
            className={cn(
              "w-full justify-start",
              activeTab === item.id && "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
            )}
            onClick={() => onTabChange(item.id)}
          >
            <item.icon className="w-4 h-4 mr-3" />
            {item.label}
          </Button>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
