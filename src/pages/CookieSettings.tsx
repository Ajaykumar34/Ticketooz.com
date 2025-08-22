import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { useToast } from '@/hooks/use-toast';

const CookieSettings = () => {
  const { toast } = useToast();
  
  // Cookie preferences state
  const [cookiePreferences, setCookiePreferences] = useState({
    strictlyNecessary: true, // Always true, cannot be disabled
    functional: false,
    performance: false,
    advertising: false,
    socialMedia: false,
  });

  // Load saved preferences on component mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('cookiePreferences');
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        setCookiePreferences(prev => ({
          ...prev,
          ...parsed,
          strictlyNecessary: true, // Always keep this true
        }));
      } catch (error) {
        console.error('Error parsing saved cookie preferences:', error);
      }
    }
  }, []);

  const handlePreferenceChange = (category: string, value: boolean) => {
    if (category === 'strictlyNecessary') return; // Cannot change this
    
    setCookiePreferences(prev => ({
      ...prev,
      [category]: value,
    }));
  };

  const savePreferences = () => {
    localStorage.setItem('cookiePreferences', JSON.stringify(cookiePreferences));
    localStorage.setItem('cookieConsentGiven', 'true');
    
    toast({
      title: "Preferences Saved",
      description: "Your cookie preferences have been updated successfully.",
    });
  };

  const acceptAll = () => {
    const allAccepted = {
      strictlyNecessary: true,
      functional: true,
      performance: true,
      advertising: true,
      socialMedia: true,
    };
    setCookiePreferences(allAccepted);
    localStorage.setItem('cookiePreferences', JSON.stringify(allAccepted));
    localStorage.setItem('cookieConsentGiven', 'true');
    
    toast({
      title: "All Cookies Accepted",
      description: "All cookie categories have been enabled.",
    });
  };

  const rejectAll = () => {
    const onlyNecessary = {
      strictlyNecessary: true,
      functional: false,
      performance: false,
      advertising: false,
      socialMedia: false,
    };
    setCookiePreferences(onlyNecessary);
    localStorage.setItem('cookiePreferences', JSON.stringify(onlyNecessary));
    localStorage.setItem('cookieConsentGiven', 'true');
    
    toast({
      title: "Non-Essential Cookies Rejected",
      description: "Only strictly necessary cookies will be used.",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link to="/">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Cookie Settings</h1>
          <p className="text-gray-600">Manage your cookie preferences for Ticketooz</p>
        </div>

        <div className="space-y-6">
          {/* Action Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Accept all cookies, reject non-essential cookies, or customize your preferences below.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4">
              <Button onClick={acceptAll} className="flex-1">
                Accept All Cookies
              </Button>
              <Button onClick={rejectAll} variant="outline" className="flex-1">
                Reject Non-Essential
              </Button>
              <Button onClick={savePreferences} variant="secondary" className="flex-1">
                Save Custom Preferences
              </Button>
            </CardContent>
          </Card>

          {/* Strictly Necessary Cookies */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Strictly Necessary Cookies</CardTitle>
                  <CardDescription>
                    Essential for core functionality, security, and network management. Cannot be switched off.
                  </CardDescription>
                </div>
                <Switch 
                  checked={cookiePreferences.strictlyNecessary} 
                  disabled={true}
                />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                These cookies are necessary for the website to function and cannot be switched off. They include 
                session management, CSRF protection, and security features.
              </p>
            </CardContent>
          </Card>

          {/* Functional Cookies */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Functional Cookies</CardTitle>
                  <CardDescription>
                    Remember preferences and enhance features like language settings and user interface preferences.
                  </CardDescription>
                </div>
                <Switch 
                  checked={cookiePreferences.functional}
                  onCheckedChange={(value) => handlePreferenceChange('functional', value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                These cookies enable enhanced functionality and personalization, such as remembering your 
                language preference and keeping you signed in.
              </p>
            </CardContent>
          </Card>

          {/* Performance/Analytics Cookies */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Performance/Analytics Cookies</CardTitle>
                  <CardDescription>
                    Measure usage to improve the Services through tools like Google Analytics and Hotjar.
                  </CardDescription>
                </div>
                <Switch 
                  checked={cookiePreferences.performance}
                  onCheckedChange={(value) => handlePreferenceChange('performance', value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                These cookies help us understand how visitors interact with our website by collecting and 
                reporting information anonymously. This helps us improve our services.
              </p>
            </CardContent>
          </Card>

          {/* Advertising Cookies */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Advertising Cookies</CardTitle>
                  <CardDescription>
                    Measure campaigns and show more relevant content/ads through platforms like Google Ads and Meta.
                  </CardDescription>
                </div>
                <Switch 
                  checked={cookiePreferences.advertising}
                  onCheckedChange={(value) => handlePreferenceChange('advertising', value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                These cookies are used to make advertising messages more relevant to you and your interests. 
                They also perform functions like preventing the same ad from continuously appearing.
              </p>
            </CardContent>
          </Card>

          {/* Social Media Cookies */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Social Media Cookies</CardTitle>
                  <CardDescription>
                    Enable sharing and social features embedded on our pages.
                  </CardDescription>
                </div>
                <Switch 
                  checked={cookiePreferences.socialMedia}
                  onCheckedChange={(value) => handlePreferenceChange('socialMedia', value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                These cookies are set by social media services that we have added to the site to enable you 
                to share our content with your friends and networks.
              </p>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle>More Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                For detailed information about how we use cookies and similar technologies, please read our{' '}
                <Link to="/cookie-policy" className="text-blue-600 hover:underline">Cookie Policy</Link>.
              </p>
              <p className="text-sm text-gray-600">
                Questions about cookies or your privacy? Contact us at{' '}
                <a href="mailto:privacy@ticketooz.com" className="text-blue-600 hover:underline">
                  privacy@ticketooz.com
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CookieSettings;