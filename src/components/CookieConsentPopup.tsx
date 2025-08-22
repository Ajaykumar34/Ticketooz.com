import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Settings, Cookie } from 'lucide-react';
import { Link } from 'react-router-dom';

const CookieConsentPopup = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Check if user has already given consent
    const consentGiven = localStorage.getItem('cookieConsentGiven');
    if (!consentGiven) {
      // Show popup after a short delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptAll = () => {
    const allAccepted = {
      strictlyNecessary: true,
      functional: true,
      performance: true,
      advertising: true,
      socialMedia: true,
    };
    localStorage.setItem('cookiePreferences', JSON.stringify(allAccepted));
    localStorage.setItem('cookieConsentGiven', 'true');
    setIsVisible(false);
  };

  const rejectNonEssential = () => {
    const onlyNecessary = {
      strictlyNecessary: true,
      functional: false,
      performance: false,
      advertising: false,
      socialMedia: false,
    };
    localStorage.setItem('cookiePreferences', JSON.stringify(onlyNecessary));
    localStorage.setItem('cookieConsentGiven', 'true');
    setIsVisible(false);
  };

  const closePopup = () => {
    // If user closes without making a choice, we'll assume reject non-essential
    rejectNonEssential();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pointer-events-none">
      <div className="w-full max-w-lg pointer-events-auto">
        <Card className="border-2 border-primary/20 shadow-2xl bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Cookie className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Cookie Consent</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={closePopup}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              We use cookies to enhance your experience and improve our services.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {!showDetails ? (
              <>
                <p className="text-sm text-gray-600">
                  We use essential cookies for site functionality and optional cookies for analytics, 
                  personalization, and advertising. You can manage your preferences anytime.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={acceptAll} className="flex-1">
                    Accept All
                  </Button>
                  <Button onClick={rejectNonEssential} variant="outline" className="flex-1">
                    Reject Non-Essential
                  </Button>
                  <Button 
                    onClick={() => setShowDetails(true)} 
                    variant="ghost" 
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Settings className="h-3 w-3" />
                    Customize
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3 text-sm">
                  <div>
                    <h4 className="font-medium text-gray-900">Strictly Necessary</h4>
                    <p className="text-gray-600">Essential for core functionality (always active)</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Functional</h4>
                    <p className="text-gray-600">Remember preferences and enhance features</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Performance/Analytics</h4>
                    <p className="text-gray-600">Help us understand site usage and improve services</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Advertising</h4>
                    <p className="text-gray-600">Show relevant ads and measure campaign effectiveness</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Social Media</h4>
                    <p className="text-gray-600">Enable social sharing and embedded features</p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <Link to="/cookie-settings" onClick={() => setIsVisible(false)}>
                    <Button variant="secondary" className="w-full">
                      Manage Cookie Settings
                    </Button>
                  </Link>
                  <div className="flex gap-2">
                    <Button onClick={acceptAll} className="flex-1">
                      Accept All
                    </Button>
                    <Button onClick={rejectNonEssential} variant="outline" className="flex-1">
                      Reject Non-Essential
                    </Button>
                  </div>
                </div>
              </>
            )}
            
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Read our{' '}
                <Link to="/cookie-policy" className="text-blue-600 hover:underline">
                  Cookie Policy
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </Link>{' '}
                for more information.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CookieConsentPopup;