
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Users, Target, Award, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import SEOHead from '@/components/SEOHead';

const AboutUs = () => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Ticketooz",
    "alternateName": "Ticketooz",
    "url": "https://ticketooz.com",
    "description": "Revolutionizing event discovery and ticketing in India",
    "foundingDate": "2024",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "IN"
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
        title="About Ticketooz - Revolutionizing Event Discovery"
        description="Learn about Ticketooz, our mission to revolutionize event discovery and ticketing in India. Discover our story, values and impact."
        keywords="about ticketooz, ticketooz company, event platform, india events, our story"
        structuredData={structuredData}
      />
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link to="/">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            About Ticketooz
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We're passionate about connecting people through amazing events and creating unforgettable experiences.
          </p>
        </div>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardContent className="p-8 text-center">
              <Target className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
              <p className="text-gray-600">
                To make event discovery and booking seamless, helping people find and attend events that inspire, educate, and entertain them.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-8 text-center">
              <Award className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-4">Our Vision</h3>
              <p className="text-gray-600">
                To become the leading platform where event organizers and attendees connect, fostering communities and creating lasting memories.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Our Story */}
        <Card className="mb-12">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold text-center mb-6">Our Story</h2>
            <div className="prose max-w-none text-gray-600">
              <p className="text-lg mb-4">
                Founded in 2024, Ticketooz emerged from a simple observation: finding and booking events should be as exciting as attending them. Our founders, passionate event-goers themselves, noticed the fragmented landscape of event discovery and decided to create a unified platform.
              </p>
              <p className="text-lg mb-4">
                What started as a small team with big dreams has grown into a comprehensive platform serving thousands of event organizers and attendees across the country. We've facilitated connections for concerts, workshops, conferences, and community gatherings of all sizes.
              </p>
              <p className="text-lg">
                Today, we continue to innovate and expand our services, always keeping our core mission at heart: making events accessible to everyone.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Values */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="w-10 h-10 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Community First</h3>
                <p className="text-gray-600">
                  We believe in the power of community and strive to bring people together through shared experiences.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <Heart className="w-10 h-10 text-red-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Passion Driven</h3>
                <p className="text-gray-600">
                  Every feature we build and every partnership we form is driven by our passion for creating amazing experiences.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <Target className="w-10 h-10 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Excellence</h3>
                <p className="text-gray-600">
                  We're committed to delivering exceptional service and continuously improving our platform.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Statistics */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold text-center mb-8">Our Impact</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold">10K+</div>
                <div className="text-blue-100">Events Hosted</div>
              </div>
              <div>
                <div className="text-3xl font-bold">50K+</div>
                <div className="text-blue-100">Happy Attendees</div>
              </div>
              <div>
                <div className="text-3xl font-bold">500+</div>
                <div className="text-blue-100">Event Organizers</div>
              </div>
              <div>
                <div className="text-3xl font-bold">25+</div>
                <div className="text-blue-100">Cities Covered</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AboutUs;
