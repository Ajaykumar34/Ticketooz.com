
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Navbar from '@/components/Navbar';
import HomepageCarousel from '@/components/HomepageCarousel';
import CategoryList from '@/components/CategoryList';
import CitySelector from '@/components/CitySelector';
import PublicEventCard from '@/components/PublicEventCard';
import CookieConsentPopup from '@/components/CookieConsentPopup';
import SEOHead from '@/components/SEOHead';
import { usePopularEvents, useRegularEvents, useUpcomingEvents, useNonRecurringEvents, isEventSaleEnded, isEventPast } from '@/hooks/usePublicEvents';
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/hooks/useAuth';

const PublicHome = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCitySelector, setShowCitySelector] = useState(false);
  const navigate = useNavigate();

  const [selectedCity, setSelectedCity] = useState(() => {
    return localStorage.getItem('selectedCity') || '';
  });

  const { user, loading: authLoading } = useAuth();

  const { events: popularEvents, loading: popularLoading } = usePopularEvents();
  const { events: regularEvents, loading: regularLoading } = useRegularEvents();
  const { events: upcomingEvents, loading: upcomingLoading } = useUpcomingEvents();
  const { events: nonRecurringEvents, loading: nonRecurringLoading } = useNonRecurringEvents();
  const { categories } = useCategories();

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(prevCategory => prevCategory === category ? '' : category);
  };

  const handleCitySelect = (city: string) => {
    if (city === 'all_cities') {
      setSelectedCity('');
      localStorage.setItem('selectedCity', '');
    } else {
      setSelectedCity(city);
      localStorage.setItem('selectedCity', city);
    }
    setShowCitySelector(false);
  };

  const handleShowCitySelector = () => {
    setShowCitySelector(true);
  };

  const handleGetStartedClick = () => {
    // Navigate directly to event request form without login requirement
    navigate('/event-request');
  };

  if (showCitySelector) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar onSearch={setSearchTerm} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-4">
            <Button 
              variant="outline" 
              onClick={() => setShowCitySelector(false)}
              className="mb-4"
            >
              ← Back
            </Button>
          </div>
          <CitySelector 
            onCityChange={handleCitySelect} 
            selectedCity={selectedCity} 
          />
        </div>
      </div>
    );
  }

  if (popularLoading && regularLoading && upcomingLoading && nonRecurringLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar onSearch={setSearchTerm} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
                <div className="h-48 bg-gray-200 rounded mb-4"></div>
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Filter events by city and exclude expired events, but include events with sales not started
  const filterEventsByCity = (events: any[]) => {
    return events.filter(event => {
      const matchesCity = event.city === selectedCity || !selectedCity;
      const notExpired = !isEventPast(event);
      return matchesCity && notExpired;
    });
  };

  const filterEventsByCategory = (events: any[]) => {
    return events.filter(event => {
      const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.category?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === '' || event.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  };

  const filteredPopularEvents = filterEventsByCategory(filterEventsByCity(popularEvents));
  const filteredRegularEvents = filterEventsByCategory(filterEventsByCity(regularEvents));
  const filteredUpcomingEvents = filterEventsByCategory(filterEventsByCity(upcomingEvents));
  const filteredNonRecurringEvents = filterEventsByCategory(filterEventsByCity(nonRecurringEvents));

  // Generate structured data for homepage
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Ticketooz",
    "description": "Book amazing events in your city - concerts, shows, workshops and more",
    "url": "https://ticketooz.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://ticketooz.com/events?search={search_term_string}",
      "query-input": "required name=search_term_string"
    },
    "sameAs": [
      "https://facebook.com/ticketooz",
      "https://twitter.com/ticketooz",
      "https://instagram.com/ticketooz"
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SEOHead
        title="Ticketooz - Book Amazing Events in Your City"
        description="Discover and book tickets for concerts, shows, workshops and events in your city. Best prices, secure booking, instant confirmation."
        keywords="event tickets, concerts, shows, workshops, book events online, entertainment tickets, India events"
        structuredData={structuredData}
      />
      <Navbar onSearch={setSearchTerm} />
      
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg md:text-xl font-semibold">
              Events in {selectedCity || 'All Cities'}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-blue-600 bg-white hover:bg-gray-100"
              onClick={handleShowCitySelector}
            >
              Change City
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-blue-600 bg-white hover:bg-gray-100"
              onClick={handleGetStartedClick}
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>
      
      <CategoryList 
        onCategorySelect={handleCategorySelect} 
        selectedCategory={selectedCategory}
        categories={categories}
      />
      
      {/* Carousel Section */}
      <div className="mb-8">
        <HomepageCarousel />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {searchTerm && (
          <section className="mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Search Results</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...filteredPopularEvents, ...filteredRegularEvents, ...filteredUpcomingEvents, ...filteredNonRecurringEvents].map((event) => (
                <PublicEventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}

        {!searchTerm && (
          <>
            {filteredPopularEvents.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Popular Events</h3>
                  <Button variant="outline" onClick={() => navigate('/events')}>
                    View All
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredPopularEvents.map((event) => (
                    <PublicEventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            )}

            {filteredRegularEvents.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Regular Events</h3>
                  <Button variant="outline" onClick={() => navigate('/events')}>
                    View All Events
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredRegularEvents.map((event) => (
                    <PublicEventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            )}

            {filteredUpcomingEvents.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Upcoming Events</h3>
                  <Button variant="outline" onClick={() => navigate('/events')}>
                    View All Events
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredUpcomingEvents.map((event) => (
                    <PublicEventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            )}

            {filteredNonRecurringEvents.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">General Events</h3>
                  <Button variant="outline" onClick={() => navigate('/events')}>
                    View All Events
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredNonRecurringEvents.map((event) => (
                    <PublicEventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            )}

            {filteredPopularEvents.length === 0 && filteredRegularEvents.length === 0 && filteredUpcomingEvents.length === 0 && filteredNonRecurringEvents.length === 0 && (
              <section className="mb-12 text-center py-12">
                <h3 className="text-xl font-semibold text-gray-600 mb-4">No Events Available</h3>
                <p className="text-gray-500 mb-6">
                  {selectedCategory 
                    ? `No events found in ${selectedCategory} category for ${selectedCity || 'your area'}.`
                    : `No events available in ${selectedCity || 'your area'} right now.`
                  }
                </p>
                <div className="space-x-4">
                  {selectedCategory && (
                    <Button variant="outline" onClick={() => setSelectedCategory('')}>
                      Clear Category Filter
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleShowCitySelector}>
                    Change City
                  </Button>
                </div>
              </section>
            )}
          </>
        )}

        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-r from-green-500 to-blue-600 text-white">
              <CardHeader>
                <CardTitle>List Your Event</CardTitle>
                <CardDescription className="text-green-100">
                  Promote your event to thousands of users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="secondary" 
                  onClick={handleGetStartedClick}
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
              <CardHeader>
                <CardTitle>Contact Us</CardTitle>
                <CardDescription className="text-pink-100">
                  Get in touch for any queries or support
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/contact">
                  <Button variant="secondary">Contact Us</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
      
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <Link to="/">
                <img 
                  src="/lovable-uploads/749dfa90-a1d6-4cd0-87ad-4fec3daeb6d2.png" 
                  alt="Ticketooz" 
                  className="h-12 w-auto mb-4 brightness-0 invert cursor-pointer"
                />
              </Link>
              <p className="text-gray-400 mb-4">Book amazing events in your city</p>
              <div className="flex space-x-4">
                <a href="https://facebook.com/ticketooz" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="https://instagram.com/theticketooz" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-500">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a href="https://youtube.com/@TicketooZ" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-red-500">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
                <a href="https://x.com/TicketooZ" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/about" className="hover:text-white">About Us</Link></li>
                <li><Link to="/contact" className="hover:text-white">Contact Us</Link></li>
                <li><Link to="/event-request" className="hover:text-white">List Your Event</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/terms" className="hover:text-white">Terms of Use</Link></li>
                <li><Link to="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link to="/cookie-policy" className="hover:text-white">Cookie Policy</Link></li>
                <li><Link to="/cookie-settings" className="hover:text-white">Cookie Settings</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Follow Us</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="https://facebook.com/ticketooz" target="_blank" rel="noopener noreferrer" className="hover:text-white">Facebook</a></li>
                <li><a href="https://instagram.com/theticketooz" target="_blank" rel="noopener noreferrer" className="hover:text-white">Instagram</a></li>
                <li><a href="https://youtube.com/@TicketooZ" target="_blank" rel="noopener noreferrer" className="hover:text-white">YouTube</a></li>
                <li><a href="https://x.com/TicketooZ" target="_blank" rel="noopener noreferrer" className="hover:text-white">X (Twitter)</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400">© 2024 Ticketooz Events. All rights reserved.</p>
          </div>
        </div>
      </footer>
      
      {/* Cookie Consent Popup */}
      <CookieConsentPopup />
    </div>
  );
};

export default PublicHome;
