
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOConfig {
  title: string;
  description: string;
  keywords: string;
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'event';
  structuredData?: any;
  noIndex?: boolean;
  additionalMeta?: Array<{ name: string; content: string; property?: boolean }>;
  securityHeaders?: boolean;
}

export const useSEO = (config: SEOConfig) => {
  const location = useLocation();
  const currentUrl = config.canonical || `https://ticketooz.com${location.pathname}`;

  useEffect(() => {
    // Update document title
    document.title = config.title;

    // Clear existing meta tags that we'll be updating
    const metaSelectors = [
      'meta[name="description"]',
      'meta[name="keywords"]',
      'meta[name="author"]',
      'meta[name="robots"]',
      'meta[name="language"]',
      'meta[name="revisit-after"]',
      'meta[name="geo.region"]',
      'meta[name="geo.placename"]',
      'meta[name="theme-color"]',
      'meta[name="msapplication-TileColor"]',
      'meta[name="application-name"]',
      'meta[property="og:title"]',
      'meta[property="og:description"]',
      'meta[property="og:type"]',
      'meta[property="og:url"]',
      'meta[property="og:image"]',
      'meta[property="og:image:secure_url"]',
      'meta[property="og:image:alt"]',
      'meta[property="og:image:width"]',
      'meta[property="og:image:height"]',
      'meta[property="og:site_name"]',
      'meta[property="og:locale"]',
      'meta[name="twitter:card"]',
      'meta[name="twitter:title"]',
      'meta[name="twitter:description"]',
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:alt"]',
      'meta[name="twitter:site"]',
      'meta[name="twitter:creator"]',
      'link[rel="canonical"]',
      'script[type="application/ld+json"]'
    ];

    metaSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => element.remove());
    });

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, property = false) => {
      const attribute = property ? 'property' : 'name';
      let meta = document.createElement('meta');
      meta.setAttribute(attribute, name);
      meta.setAttribute('content', content);
      document.head.appendChild(meta);
    };

    // Basic meta tags
    updateMetaTag('description', config.description);
    updateMetaTag('keywords', config.keywords);
    updateMetaTag('author', 'TicketooZ');
    updateMetaTag('language', 'English');
    updateMetaTag('revisit-after', '1 day');
    
    // Robots meta
    updateMetaTag('robots', config.noIndex ? 'noindex, nofollow' : 'index, follow');
    
    // Geo tags
    updateMetaTag('geo.region', 'IN');
    updateMetaTag('geo.placename', 'India');
    
    // Theme colors
    updateMetaTag('theme-color', '#1a202c');
    updateMetaTag('msapplication-TileColor', '#1a202c');
    updateMetaTag('application-name', 'TicketooZ');

    // Open Graph tags
    updateMetaTag('og:title', config.title, true);
    updateMetaTag('og:description', config.description, true);
    updateMetaTag('og:type', config.ogType || 'website', true);
    updateMetaTag('og:url', currentUrl, true);
    updateMetaTag('og:image', config.ogImage || 'https://ticketooz.com/assets/ticketooz-og-image.jpg', true);
    updateMetaTag('og:image:secure_url', config.ogImage || 'https://ticketooz.com/assets/ticketooz-og-image.jpg', true);
    updateMetaTag('og:image:alt', 'TicketooZ - Your Entertainment Gateway', true);
    updateMetaTag('og:image:width', '1200', true);
    updateMetaTag('og:image:height', '630', true);
    updateMetaTag('og:site_name', 'TicketooZ', true);
    updateMetaTag('og:locale', 'en_IN', true);

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', config.title);
    updateMetaTag('twitter:description', config.description);
    updateMetaTag('twitter:image', config.ogImage || 'https://ticketooz.com/assets/ticketooz-twitter-card.jpg');
    updateMetaTag('twitter:image:alt', 'TicketooZ - Your Entertainment Gateway');
    updateMetaTag('twitter:site', '@TicketooZ');
    updateMetaTag('twitter:creator', '@TicketooZ');

    // Additional meta tags
    if (config.additionalMeta) {
      config.additionalMeta.forEach(meta => {
        updateMetaTag(meta.name, meta.content, meta.property);
      });
    }

    // Security headers for specific pages
    if (config.securityHeaders) {
      updateMetaTag('X-Frame-Options', 'DENY');
      updateMetaTag('X-Content-Type-Options', 'nosniff');
      updateMetaTag('Referrer-Policy', 'strict-origin-when-cross-origin');
      updateMetaTag('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    }

    // Canonical URL
    const canonicalLink = document.createElement('link');
    canonicalLink.rel = 'canonical';
    canonicalLink.href = currentUrl;
    document.head.appendChild(canonicalLink);

    // Structured Data (JSON-LD)
    if (config.structuredData) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(config.structuredData);
      document.head.appendChild(script);
    }

    // DNS Prefetch links
    const dnsPrefetchUrls = [
      '//fonts.googleapis.com',
      '//cdnjs.cloudflare.com',
      'https://fonts.gstatic.com'
    ];

    dnsPrefetchUrls.forEach(url => {
      const link = document.createElement('link');
      link.rel = url.includes('gstatic') ? 'preconnect' : 'dns-prefetch';
      link.href = url;
      if (url.includes('gstatic')) {
        link.crossOrigin = 'anonymous';
      }
      document.head.appendChild(link);
    });

    // Cleanup function
    return () => {
      // Remove structured data when component unmounts
      if (config.structuredData) {
        const script = document.querySelector('script[type="application/ld+json"]');
        if (script) {
          script.remove();
        }
      }
    };
  }, [config, currentUrl]);
};

// SEO configurations for different pages
export const seoConfigs = {
  home: {
    title: 'TicketooZ - Your Entertainment Gateway | The Smarter Way to Book Tickets Online',
    description: 'TicketooZ - Your Entertainment Gateway. Book tickets for drama shows, concerts, sports events, comedy shows, dance performances, workshops, and cultural events. India\'s premier online ticket booking platform.',
    keywords: 'book tickets online, drama tickets, concert tickets, sports tickets, comedy show tickets, dance performance tickets, theatre tickets, music festival tickets, cultural event tickets, entertainment tickets, workshop registration, seminar tickets, event booking platform, live events, book drama tickets, book concert tickets, book sports tickets, book entertainment tickets, ticket booking India, online ticket booking, event tickets India, TicketooZ',
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "TicketooZ",
      "url": "https://ticketooz.com",
      "description": "TicketooZ - Your Entertainment Gateway. India's premier platform to book drama, concert, sports, comedy, dance and cultural event tickets online",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://ticketooz.com/events?search={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    }
  },
  events: {
    title: 'Browse All Events - Drama, Concerts, Sports, Comedy Shows | TicketooZ - Your Entertainment Gateway',
    description: 'Browse and discover all upcoming events - drama shows, concerts, sports matches, comedy shows, dance performances, theatre, workshops, cultural events and more. Book tickets instantly on TicketooZ - Your Entertainment Gateway.',
    keywords: 'all events, upcoming events, drama shows, concert listings, sports events, comedy shows, dance performances, theatre shows, entertainment events, cultural events, workshops, seminars, music festivals, art exhibitions, fitness classes, adventure activities, business conferences, lifestyle events, virtual events, event calendar, book tickets, book drama tickets, book concert tickets, book sports tickets, book comedy tickets'
  },
  login: {
    title: 'Login to Your Account | TicketooZ - Your Entertainment Gateway',
    description: 'Login to your TicketooZ account - Your Entertainment Gateway. Book drama, concert, sports and entertainment tickets, manage bookings, and access exclusive offers.',
    keywords: 'login, sign in, user account, ticket booking account, TicketooZ login',
    noIndex: true
  },
  register: {
    title: 'Create Account - Join TicketooZ | Your Entertainment Gateway for Drama, Concert & Sports Tickets',
    description: 'Create your free TicketooZ account - Your Entertainment Gateway. Book drama, concert, sports, comedy and entertainment event tickets with exclusive member benefits.',
    keywords: 'register, sign up, create account, join TicketooZ, event booking account, free registration, book drama tickets, book concert tickets, book sports tickets, book entertainment tickets, comedy show tickets, dance performance tickets, theatre tickets',
    noIndex: true
  },
  checkout: {
    title: 'Checkout - Complete Your Booking | TicketooZ',
    description: 'Complete your ticket booking securely. Review your order details and proceed with payment on TicketooZ.',
    keywords: 'checkout, ticket booking, secure payment, order review, complete booking',
    noIndex: true,
    securityHeaders: true
  },
  payment: {
    title: 'Secure Payment - TicketooZ',
    description: 'Secure payment gateway for your ticket booking. Multiple payment options available with 256-bit SSL encryption.',
    keywords: 'secure payment, ticket payment, online payment, payment gateway, secure checkout',
    noIndex: true,
    securityHeaders: true
  },
  bookingSuccess: {
    title: 'Booking Confirmed - Thank You | TicketooZ',
    description: 'Your ticket booking has been confirmed successfully. Check your email for booking details and e-tickets.',
    keywords: 'booking confirmed, ticket confirmation, booking success, e-tickets',
    noIndex: true
  },
  dashboard: {
    title: 'My Dashboard - Manage Bookings | TicketooZ',
    description: 'Manage your ticket bookings, view upcoming events, download e-tickets and track your booking history on your personal dashboard.',
    keywords: 'user dashboard, my bookings, ticket management, booking history, e-tickets',
    noIndex: true
  },
  profile: {
    title: 'My Profile - Account Settings | TicketooZ',
    description: 'Manage your account settings, update personal information, change password and configure preferences on TicketooZ.',
    keywords: 'user profile, account settings, personal information, profile management',
    noIndex: true
  },
  eventRequest: {
    title: 'Request Event Listing - Organizers | TicketooZ',
    description: 'Event organizers can request to list their events on TicketooZ. Submit your event details for review and approval.',
    keywords: 'event request, list event, event organizers, submit event, event listing, organizer portal'
  },
  about: {
    title: 'About TicketooZ - Your Entertainment Gateway | India\'s Premier Drama, Concert & Sports Ticket Booking Platform',
    description: 'Learn about TicketooZ - Your Entertainment Gateway. India\'s trusted platform for booking drama, concert, sports, comedy and entertainment event tickets across the country.',
    keywords: 'about TicketooZ, entertainment gateway, event booking platform, company information, our mission, team, event discovery, drama tickets, concert tickets, sports tickets, comedy tickets, entertainment tickets, theatre tickets, dance performance tickets'
  },
  contact: {
    title: 'Contact Us - Get Support | TicketooZ',
    description: 'Get in touch with TicketooZ support team. Contact us for booking assistance, technical support, partnerships or general inquiries.',
    keywords: 'contact TicketooZ, customer support, help, technical support, partnerships, contact information'
  },
  terms: {
    title: 'Terms of Use - TicketooZ',
    description: 'Read TicketooZ terms of use, conditions of service, user responsibilities and platform guidelines for event booking services.',
    keywords: 'terms of use, terms and conditions, service terms, user agreement, platform guidelines'
  },
  privacy: {
    title: 'Privacy Policy - TicketooZ',
    description: 'TicketooZ privacy policy explaining how we collect, use, and protect your personal information and data security measures.',
    keywords: 'privacy policy, data protection, personal information, data security, user privacy'
  },
  resetPassword: {
    title: 'Reset Password - TicketooZ',
    description: 'Reset your TicketooZ account password securely. Enter your email to receive password reset instructions.',
    keywords: 'reset password, forgot password, password recovery, account recovery',
    noIndex: true
  },
  verifyTicket: {
    title: 'Verify Ticket - TicketooZ',
    description: 'Verify the authenticity of your TicketooZ ticket. Check ticket validity and booking details.',
    keywords: 'verify ticket, ticket verification, authentic ticket, booking verification',
    noIndex: true
  },
  admin: {
    title: 'Admin Panel - TicketooZ',
    description: 'TicketooZ administrative panel for managing events, bookings, and platform operations.',
    keywords: 'admin panel, administration, event management, booking management',
    noIndex: true,
    securityHeaders: true
  },
  createAdmin: {
    title: 'Create Admin Account - TicketooZ',
    description: 'Create administrative account for TicketooZ platform management.',
    keywords: 'create admin, admin account, administrative access',
    noIndex: true,
    securityHeaders: true
  },
  workshops: {
    title: 'Workshops & Training Sessions - TicketooZ | Your Entertainment Gateway',
    description: 'Discover and book workshops, training sessions, skill development programs, and educational events on TicketooZ - Your Entertainment Gateway. Learn new skills with expert instructors.',
    keywords: 'workshops, training sessions, skill development, educational events, learning programs, professional development, book workshop tickets, workshop registration, training program booking, skill development workshops, educational workshop tickets, professional training tickets, learning workshop booking'
  },
  notFound: {
    title: 'Page Not Found - TicketooZ',
    description: 'The page you are looking for could not be found. Return to TicketooZ homepage to discover amazing events.',
    keywords: 'page not found, 404 error, TicketooZ',
    noIndex: true
  }
};
