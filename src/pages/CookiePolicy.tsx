import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';

const CookiePolicy = () => {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Ticketooz Cookie Policy</h1>
          <p className="text-gray-600">Last updated on and Effective from: 11 Aug 2025</p>
        </div>

        <Card>
          <CardContent className="p-8 prose max-w-none">
            <p className="text-gray-700 mb-6">
              This Cookie Policy explains how Ticketooz.com and our mobile applications ("Ticketooz", "we", "us",
              "our") use cookies and similar technologies on ticketooz.com and all subdomains and apps (the
              "Services"). It should be read together with our Privacy Policy. You can manage your choices at any time 
              via our preference center at <Link to="/cookie-settings" className="text-blue-600 hover:underline">/cookie-settings</Link>.
            </p>
            <p className="text-gray-700 mb-6">
              We operate primarily in India. We honor Global Privacy Control (GPC) signals and use the CookieYes
              consent platform.
            </p>

            <h2>1) What are cookies and similar technologies</h2>
            <p>Cookies are small files placed on your browser or device to store information.</p>
            <p>We also use SDKs, pixels, web beacons, and local storage for similar purposes in web and mobile apps.</p>
            <p>Cookies can be first‑party (set by Ticketooz) or third‑party (set by our partners).</p>

            <h2>2) Why we use them</h2>
            <ul>
              <li>To run core site/app features and keep you signed in.</li>
              <li>To remember your preferences.</li>
              <li>To understand usage and improve performance.</li>
              <li>To measure marketing effectiveness and show relevant content/ads (where you allow it).</li>
              <li>To protect against fraud and abuse (e.g., bot detection).</li>
            </ul>

            <h2>3) Consent, GPC, and India‑specific approach</h2>
            <p>
              In India, we seek consent for non‑essential cookies (Functional, Performance/Analytics, Advertising,
              Social Media). Strictly Necessary cookies always operate.
            </p>
            <p>You can give or withdraw consent at <Link to="/cookie-settings" className="text-blue-600 hover:underline">/cookie-settings</Link> at any time.</p>
            <p>
              We honor supported browser "Global Privacy Control" (GPC) signals by treating them as an opt‑out
              for non‑essential cookies on that browser.
            </p>
            <p>If you use multiple browsers/devices, set your preferences on each.</p>

            <h2>4) Cookie categories we use</h2>
            <p><strong>Strictly Necessary:</strong> essential for core functionality, security, and network management. Cannot be switched off.</p>
            <p><strong>Functional:</strong> remember preferences and enhance features.</p>
            <p><strong>Performance/Analytics:</strong> measure usage to improve the Services.</p>
            <p><strong>Advertising:</strong> measure campaigns and, where applicable, show more relevant content/ads.</p>
            <p><strong>Social Media:</strong> enable sharing and social features embedded on our pages.</p>

            <h2>5) Technologies and typical cookies</h2>
            <p className="mb-4">
              <em>Notes: Actual names and lifetimes can vary by deployment and partner updates. Some entries below are representative examples.
              "First/Third party" is from the perspective of ticketooz.com.</em>
            </p>

            <h3>A) Strictly Necessary</h3>
            <ul>
              <li><strong>ticketooz_session</strong> (first): maintains login/session; duration: session.</li>
              <li><strong>csrf_token / XSRF-TOKEN</strong> (first): CSRF protection; duration: session.</li>
              <li><strong>cookieyes-consent, cky-consent, cky-action, cky-active-check</strong> (first/third via CookieYes): stores your consent choices; duration: up to 12 months.</li>
              <li><strong>_GRECAPTCHA</strong> (third, reCAPTCHA by Google): bot mitigation; duration: up to 6 months.</li>
              <li><strong>Tag deployment:</strong> Google Tag Manager (third) helps manage tags; it generally does not set cookies itself.</li>
            </ul>

            <h3>B) Functional</h3>
            <ul>
              <li><strong>preferred_language / ui_prefs</strong> (first): remembers language/UI preferences; duration: up to 12 months.</li>
              <li><strong>remember_me</strong> (first): keeps you signed in if you choose; duration: configurable.</li>
            </ul>

            <h3>C) Performance/Analytics</h3>
            <p><strong>Google Analytics 4</strong> (third):</p>
            <ul>
              <li><strong>_ga, ga, _gid, _gat, gac*:</strong> usage analytics; typical durations vary; we configure analytics cookies up to 24 months maximum.</li>
            </ul>
            <p><strong>Hotjar</strong> (third):</p>
            <ul>
              <li><strong>hjSessionUser</strong> (1 year), <strong>hjSession</strong> (30 min), <strong>_hjIncludedInSessionSample</strong> (2 min): usage heatmaps and session insights.</li>
            </ul>
            <p><strong>Sentry</strong> (third): error/crash monitoring; may use cookies/local storage to correlate error events; no advertising use; duration varies, typically session or short‑term.</p>

            <h3>D) Advertising</h3>
            <p><strong>Google Ads / DoubleClick</strong> (third):</p>
            <ul>
              <li><strong>_gcl_au</strong> (3 months), <strong>IDE</strong> (13 months), <strong>test_cookie</strong> (1 day): ad conversion and measurement; retained up to 24 months where configured.</li>
            </ul>
            <p><strong>Meta Pixel</strong> (third):</p>
            <ul>
              <li><strong>_fbp</strong> (3 months), <strong>fr</strong> (3 months, on facebook.com): ad measurement and relevance; retained up to 24 months where configured.</li>
            </ul>
            <p><strong>LinkedIn Insight</strong> (third):</p>
            <ul>
              <li><strong>li_gc</strong> (2 years), <strong>bcookie</strong> (2 years), <strong>lidc</strong> (1 day), <strong>bscookie</strong> (2 years): ad measurement and relevance; retained up to 24 months where configured.</li>
            </ul>

            <h3>E) Social Media</h3>
            <p><strong>Social sharing/widgets</strong> (third): cookies may be set by the social platform when you interact with embedded features. Durations vary by provider.</p>

            <h2>6) Data retention for cookies</h2>
            <p><strong>Strictly Necessary:</strong> session or as long as required for security and core operation.</p>
            <p><strong>Non‑essential</strong> (Functional, Performance/Analytics, Advertising, Social Media): up to 24 months, unless you withdraw consent earlier.</p>
            <p>Local storage/SDK identifiers in apps follow similar retention aims; you can reset device ad IDs in OS settings.</p>

            <h2>7) Managing your choices</h2>
            <ul>
              <li>Use our preference center: <Link to="/cookie-settings" className="text-blue-600 hover:underline">/cookie-settings</Link>.</li>
              <li>Browser controls: block or delete cookies via your browser settings (may impact functionality).</li>
              <li>Mobile OS: reset/limit ad identifiers (AAID on Android, IDFA on iOS) and control app tracking permissions.</li>
              <li>GPC: if your browser sends a supported Global Privacy Control signal, we will treat it as an opt‑out for non‑essential cookies on that browser.</li>
            </ul>

            <h2>8) Third‑party cookies and links</h2>
            <p>
              Third‑party providers control their own cookies/technologies. For details or to exercise choices
              directly, visit their policies/pages (e.g., measurement and ad preferences pages for your accounts).
            </p>
            <p>
              Using third‑party features (e.g., embedded videos, social sharing) may set their cookies. We are not
              responsible for third‑party practices.
            </p>

            <h2>9) International data transfers</h2>
            <p>
              Some of our service providers and their servers may be located outside India (e.g., in the United
              States, EU/UK, or other countries).
            </p>
            <p>
              Where required for those providers, we rely on appropriate safeguards (such as Standard
              Contractual Clauses and, for the UK, the IDTA/Addendum) or other lawful mechanisms.
            </p>
            <p>See our Privacy Policy for more on data sharing and transfers.</p>

            <h2>10) reCAPTCHA notice</h2>
            <p>
              Parts of the Services are protected by reCAPTCHA to prevent abuse. Use of reCAPTCHA is subject to
              the provider's privacy policy and terms of service in addition to ours.
            </p>

            <h2>11) Changes to this Cookie Policy</h2>
            <p>
              We may update this policy from time to time. The "Last updated" date at the top shows the latest
              revision. Material changes may be communicated on‑site/in‑app.
            </p>

            <h2>12) Contact</h2>
            <p>Questions or requests about this Cookie Policy or your choices: privacy@ticketooz.com</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CookiePolicy;