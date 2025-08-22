
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  CalendarDays, 
  MapPin, 
  Tag as TagIcon, 
  Users, 
  Shield, 
  Ticket, 
  ShoppingCart, 
  BarChart3, 
  Settings, 
  Menu, 
  ChevronRight, 
  ChevronDown, 
  X,
  Image 
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const CustomSidebar = ({ onNavigation }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [expandedSection, setExpandedSection] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  const navItems = [
    {
      section: 'dashboard',
      title: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      onClick: () => handleNavigation('dashboard')
    },
    {
      section: 'events',
      title: 'Events',
      icon: <CalendarDays className="w-5 h-5" />,
      onClick: () => handleSectionToggle('events'),
      subItems: [
        {
          title: 'Event Management',
          onClick: () => handleNavigation('events')
        },
        {
          title: 'Category Management',
          onClick: () => handleNavigation('categories')
        },
        {
          title: 'Tag Management',
          onClick: () => handleNavigation('tags')
        }
      ]
    },
    {
      section: 'venues',
      title: 'Venues',
      icon: <MapPin className="w-5 h-5" />,
      onClick: () => handleNavigation('venues')
    },
    {
      section: 'tickets',
      title: 'Tickets & Orders',
      icon: <Ticket className="w-5 h-5" />,
      onClick: () => handleSectionToggle('tickets'),
      subItems: [
        {
          title: 'Ticket Sales Report',
          onClick: () => handleNavigation('ticket-sales')
        },
        {
          title: 'Order Details Report',
          onClick: () => handleNavigation('order-details')
        }
      ]
    },
    {
      section: 'users',
      title: 'Users',
      icon: <Users className="w-5 h-5" />,
      onClick: () => handleSectionToggle('users'),
      subItems: [
        {
          title: 'User Management',
          onClick: () => handleNavigation('users')
        },
        {
          title: 'Admin Management',
          onClick: () => handleNavigation('admins')
        }
      ]
    },
    {
      section: 'reports',
      title: 'Financial Reports',
      icon: <BarChart3 className="w-5 h-5" />,
      onClick: () => handleNavigation('reports')
    },
    {
      section: 'marketing',
      title: 'Marketing',
      icon: <Image className="w-5 h-5" />,
      onClick: () => handleNavigation('carousel')
    },
    {
      section: 'settings',
      title: 'Settings',
      icon: <Settings className="w-5 h-5" />,
      onClick: () => handleNavigation('profile')
    }
  ];

  const handleNavigation = (route) => {
    setActiveSection(route);
    onNavigation(route);
  };

  const handleSectionToggle = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
    
    // If collapsing the sidebar, also expand the clicked section
    if (isCollapsed) {
      setIsCollapsed(false);
      setExpandedSection(section);
    }
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    // Close any expanded sections when collapsing
    if (!isCollapsed) {
      setExpandedSection(null);
    }
  };

  return (
    <div className={cn(
      "h-full bg-white border-r flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="p-4 flex items-center justify-between border-b">
        <div className={cn(
          "flex items-center",
          isCollapsed && "hidden"
        )}>
          <img 
            src="/lovable-uploads/af5ee86c-c5a8-4449-bc78-953f597b6e22.png" 
            alt="Ticketooz Admin" 
            className="h-8 w-auto object-contain mr-2"
          />
          <span className="font-bold text-lg text-blue-600">Admin</span>
        </div>
        <Button variant="ghost" size="sm" onClick={toggleSidebar} className={cn(
          "p-1",
          isCollapsed && "mx-auto"
        )}>
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </Button>
      </div>
      
      <div className="flex-1 overflow-auto py-4">
        <nav className="px-2 space-y-1">
          {navItems.map((item) => (
            <div key={item.section}>
              <Button
                variant={activeSection === item.section ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start mb-1",
                  activeSection === item.section ? "bg-blue-50 text-blue-700" : "",
                  isCollapsed ? "justify-center px-2" : ""
                )}
                onClick={item.subItems ? item.onClick : item.onClick}
              >
                <div className="flex items-center w-full">
                  {item.icon}
                  {!isCollapsed && (
                    <>
                      <span className="ml-2 flex-1">{item.title}</span>
                      {item.subItems && (
                        expandedSection === item.section ? 
                        <ChevronDown className="w-4 h-4" /> : 
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </>
                  )}
                </div>
              </Button>
              
              {!isCollapsed && item.subItems && expandedSection === item.section && (
                <div className="mt-1 ml-6 space-y-1">
                  {item.subItems.map((subItem, idx) => (
                    <Button
                      key={idx}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-gray-600 hover:text-blue-700 hover:bg-blue-50 font-normal"
                      onClick={subItem.onClick}
                    >
                      {subItem.title}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
      
      <div className="p-4 border-t">
        <Button 
          variant="outline" 
          className={cn(
            "w-full", 
            isCollapsed && "px-1 justify-center"
          )}
          onClick={() => handleNavigation('profile')}
        >
          <Settings className="w-4 h-4" />
          {!isCollapsed && <span className="ml-2">Settings</span>}
        </Button>
      </div>
    </div>
  );
};

export default CustomSidebar;
