
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';

const PrivacyPolicy = () => {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Ticketooz Privacy Policy</h1>
          <p className="text-gray-600">Last updated on and Effective from: 11 Aug 2025</p>
        </div>

        <Card>
          <CardContent className="p-8 prose max-w-none">
            <p className="text-gray-700 mb-6">
              Ticketooz.com and its mobile applications (collectively, "Ticketooz," "we," "us," or "our") provide an
              online platform for browsing, discovering, and purchasing tickets to events. We respect your privacy
              and are committed to protecting your personal information. This Privacy Policy explains what we
              collect, how we use it, how we share it, your choices and rights, and how to contact us. It forms part
              of the Ticketooz Terms of Use. If you do not agree with this policy, please do not use Ticketooz.
            </p>

            <h2>1) Scope and Roles</h2>
            <p>
              Ticketooz provides services directly to consumers and also facilitates transactions with event
              organizers, venues, promoters, and other partners ("Event Partners").
            </p>
            <p>
              When we determine the purposes and means of processing, we act as a "controller" (or equivalent).
              When we process personal information solely on behalf of Event Partners (e.g., attendee lists, entry
              validation), we act as a "processor"/"service provider."
            </p>

            <h2>2) Eligibility and Children</h2>
            <p>
              You must be at least 18 years old to purchase tickets or conduct transactions on Ticketooz. If you are
              under 18, you are not authorized to use any services or create a user account on Ticketooz.
            </p>
            <p>
              We do not knowingly collect personal information from children under 18 or any person with
              disability who has a lawful guardian. If you believe any such person has provided personal
              information, contact privacy@ticketooz.com.
            </p>

            <h2>3) Browsing Without Identification</h2>
            <p>
              You may browse certain Ticketooz pages without telling us who you are. We may still collect limited
              device and log information (see below) for security, analytics, and service performance. To the
              extent such data is maintained in a manner that identifies you, we treat it as personal data;
              otherwise, it is treated as non‑personal data.
            </p>

            <h2>4) Information We Collect</h2>
            
            <h3>A) Information you provide directly</h3>
            <p><strong>Account and profile:</strong> name, email, phone number, password, preferences (language, time zone),
            interests, favorites, profile photo, etc.</p>
            
            <p><strong>Purchases and transactions:</strong> contact, billing, delivery details, ticket selections, applied offers, gift
            redemptions, communications about orders.</p>
            
            <p><strong>Identity/compliance (if applicable):</strong> government ID/KYC data and selfies for liveness checks (only
            where required by law, venue rules, or fraud prevention).</p>
            
            <p><strong>Communications:</strong> support requests, feedback, surveys, promotions/contests, beta programs;
            preferences for notifications/marketing.</p>
            
            <p><strong>User‑generated content (UGC):</strong> ratings, reviews, photos, comments, lists, likes, and other content
            you make public.</p>
            
            <p><strong>Social sign‑in/referrals:</strong> if you use third‑party sign‑in (e.g., Google, Apple), we receive information
            you authorize (e.g., name, email). If you invite friends, we use their contacts only to send the
            invitation.</p>
            
            <p><strong>Messages:</strong> if you exchange messages through Ticketooz, we process and store them to deliver,
            manage, and investigate potential misuse.</p>

            <h3>B) Information we collect automatically</h3>
            <p><strong>Device and log data:</strong> IP address, device IDs, OS and version, browser type/settings, app version,
            crash/diagnostic logs, access times, pages viewed, referrer and referrer domain, last URL visited,
            clickstream, session metadata, error logs.</p>
            
            <p><strong>Usage data:</strong> search queries, content viewed, features used, time spent, add‑to‑cart and similar
            actions, which push or in‑app messages/pop‑ups you saw and engaged with, mobile app
            online/offline status.</p>
            
            <p><strong>Location data:</strong> approximate location (IP‑based) or precise location if you grant permission in your
            device/app settings.</p>
            
            <p><strong>Stored information and files (mobile):</strong> with your permission, metadata related to photos, videos,
            audio, contacts used for specific features (e.g., uploading an image).</p>

            <h3>C) Information from third parties</h3>
            <p><strong>Event Partners/service providers:</strong> attendance confirmations, fulfillment status, venue entry
            validations, fraud/risk signals.</p>
            
            <p><strong>Payment partners:</strong> payment status (success/failure) and tokens to complete payments. Ticketooz
            does not store full card numbers or CVV.</p>
            
            <p><strong>Analytics, advertising, attribution, and anti‑fraud partners:</strong> signals for measurement, personalization,
            and fraud prevention.</p>
            
            <p><strong>Social media platforms:</strong> information you authorize when interacting with Ticketooz content or using
            social login.</p>
            
            <p><strong>De‑identified/aggregated data:</strong> We may aggregate or de‑identify data so it can no longer reasonably
            identify you. We may use and share such data for any lawful purpose.</p>

            <h2>5) Cookies and Tracking Technologies</h2>
            <p>We and our partners use cookies, SDKs, pixels, web beacons, device IDs, and similar technologies to:</p>
            <ul>
              <li>Authenticate you and keep you signed in;</li>
              <li>Remember preferences;</li>
              <li>Analyze traffic, usage, and performance;</li>
              <li>Measure campaign effectiveness and attribution (including through search engines and analytics providers);</li>
              <li>Personalize content and ads.</li>
            </ul>
            
            <p><strong>Controls:</strong></p>
            <ul>
              <li>Use our cookie banner/preferences center (where available);</li>
              <li>Adjust browser settings (may limit functionality);</li>
              <li>Manage mobile OS ad preferences and push notification permissions.</li>
            </ul>
            
            <p>
              For interest‑based advertising, opt out via our cookie settings and/or industry/device tools (e.g.,
              device "Limit Ad Tracking," youradchoices.com, youronlinechoices.eu). These choices are
              browser/device‑specific.
            </p>

            <h2>6) How We Use Your Information</h2>
            <ul>
              <li>Provide, operate, and support Ticketooz (account creation, ticketing, order processing, delivery, customer support).</li>
              <li>Facilitate transactions with Event Partners (attendance/entry validation, seating/attendee management).</li>
              <li>Personalize experience (content, recommendations, offers).</li>
              <li>Send transactional messages (confirmations, receipts, notices).</li>
              <li>Send marketing communications with your consent or where permitted; you can unsubscribe anytime.</li>
              <li>Analytics, research, product development, and service improvement.</li>
              <li>Detect, prevent, and investigate fraud, abuse, and security incidents; enforce our Terms.</li>
              <li>Comply with legal obligations (e.g., tax, accounting, KYC where applicable).</li>
              <li>Enable push notifications and in‑app messages (manage via device/app settings).</li>
            </ul>
            
            <p><strong>Legal bases where required:</strong> Contract; legitimate interests; consent; legal obligations; vital interests (rare, e.g., safety).</p>

            <h2>7) How We Share Information</h2>
            <p><strong>Event Partners:</strong> to fulfill your orders, validate entry, manage attendance/seating, provide event
            services, and comply with legal obligations.</p>
            
            <p><strong>Service providers (processors):</strong> hosting, storage, analytics, anti‑fraud, support tooling, email/SMS,
            marketing tools, identity verification, payment processing—subject to contractual confidentiality,
            security, and use limitations.</p>
            
            <p><strong>Payment processing:</strong> handled by PCI DSS–compliant processors. Ticketooz does not store full card
            numbers or CVV; we receive tokens/status to complete transactions.</p>
            
            <p><strong>Advertising/analytics/search partners:</strong> to measure and improve campaigns and show more relevant
            content/ads. We do not share information that directly identifies you (such as your name or email)
            with these partners unless you explicitly consent; we may share pseudonymous identifiers, device
            data, and events subject to your choices.</p>
            
            <p><strong>Corporate transactions:</strong> in a merger, acquisition, financing, or sale of all/part of our business, subject
            to confidentiality and applicable law.</p>
            
            <p><strong>Legal and safety:</strong> to comply with laws, respond to lawful requests (e.g., court orders), and protect
            the rights, privacy, safety, or property of Ticketooz, users, Event Partners, or the public; to
            detect/prevent fraud/security issues.</p>
            
            <p><strong>With your consent/direction:</strong> when you authorize sharing or post information publicly (e.g., reviews).</p>

            <h2>8) No Obligation to Provide Data</h2>
            <p>
              You may choose not to provide certain information. If you decline to provide data needed to deliver
              specific features (e.g., payment details, account info, precise location), some services may be
              unavailable or limited.
            </p>

            <h2>9) Retention</h2>
            <p>
              We retain personal information as long as necessary to provide services, comply with
              legal/tax/accounting requirements, resolve disputes, enforce agreements, and protect rights.
            </p>
            <p>Criteria include:</p>
            <ul>
              <li>Nature/sensitivity of data and purpose;</li>
              <li>Statutory limitation periods;</li>
              <li>Account activity status;</li>
              <li>Legitimate business needs.</li>
            </ul>
            <p>
              Examples: order and tax records may be kept up to 7 years; security logs
              typically 12–24 months; support tickets 24 months (subject to legal holds). De‑identified/aggregated
              data may be retained indefinitely.
            </p>

            <h2>10) Security</h2>
            <p>We implement administrative, technical, and physical safeguards designed to protect personal information, including:</p>
            <ul>
              <li>Encryption in transit and, where appropriate, at rest;</li>
              <li>Access controls and least‑privilege with MFA for sensitive systems;</li>
              <li>Network segmentation, logging, and monitoring;</li>
              <li>Secure development and vulnerability management.</li>
            </ul>
            <p>
              No method is 100% secure. If you suspect unauthorized access, contact security@ticketooz.com. Use a strong, unique password and keep it
              confidential; you are responsible for activity under your account if you share credentials.
            </p>

            <h2>11) International Data Transfers</h2>
            <p>
              We may process/store information in countries other than where you reside. Where required, we
              use appropriate safeguards (e.g., EU Standard Contractual Clauses, UK IDTA/Addendum, or other
              approved mechanisms) and ensure a comparable level of protection required by applicable laws.
            </p>

            <h2>12) Your Rights and Choices</h2>
            <p>Subject to your location and applicable law, you may have the right to:</p>
            <ul>
              <li>Access and obtain a copy of your personal information;</li>
              <li>Correct inaccurate or incomplete data;</li>
              <li>Delete your information;</li>
              <li>Restrict or object to processing (including direct marketing);</li>
              <li>Withdraw consent where processing is based on consent;</li>
              <li>Data portability;</li>
              <li>Lodge a complaint with a regulator.</li>
            </ul>
            
            <p><strong>Exercising rights:</strong></p>
            <p>
              Contact privacy@ticketooz.com or use in‑app/web tools (if available).
              We will verify your identity and respond within the time limits required by law (with possible
              extension where permitted).
            </p>
            <p>
              We may decline requests as permitted by law (e.g., manifestly unfounded/excessive, or where
              disclosure would adversely affect others' rights), and we will explain our reasons where required.
            </p>
            
            <p><strong>Marketing choices:</strong></p>
            <p>Unsubscribe via the link in our emails, in‑app settings, or by contacting us. You may still receive transactional/service messages.</p>
            
            <p><strong>Cookies/ads:</strong></p>
            <p>Manage via our cookie banner/preferences, browser controls, and device settings.</p>

            <h2>13) Precise Location Information and Opt‑Out</h2>
            <p>
              If you enable location features, we may collect/process your device's precise location
              (latitude/longitude/altitude) to provide location‑based services (e.g., events nearby, venue‑specific
              features). You can withdraw permission at any time via your device/app settings. We retain location
              data no longer than reasonably necessary for the feature(s) you use.
            </p>

            <h2>14) User‑Generated Content and Public Posts</h2>
            <p>
              Information you post publicly (reviews, ratings, photos, comments, lists, likes, profile photo) is visible
              to others. Do not include sensitive data in public posts. We cannot control how others use content
              you share publicly.
            </p>

            <h2>15) Automated Decision‑Making and Profiling</h2>
            <p>
              We may use automated systems to help detect fraud/abuse and to personalize content or offers.
              Where required by law, you may request human review of decisions that produce legal or similarly
              significant effects and/or object to such processing.
            </p>

            <h2>16) Third‑Party Links and Services</h2>
            <p>
              Ticketooz may link to third‑party websites, apps, or services (e.g., identity verification, social media,
              mapping). We are not responsible for their privacy practices. Review their policies before providing
              personal information.
            </p>

            <h2>17) Do Not Track</h2>
            <p>
              Some browsers send "Do Not Track" signals. We do not currently respond to such signals. Manage
              cookies/ads as described above.
            </p>

            <h2>18) Payment Information</h2>
            <p>
              Payments are processed by third‑party processors that are PCI DSS compliant. Ticketooz does not
              store full card numbers or CVV. We may share necessary transaction information with payment
              partners (and, if applicable, banks/UPI networks) to complete, refund, or investigate transactions.
            </p>

            <h2>19) Data Minimization and Accuracy</h2>
            <p>
              We collect only what is necessary for stated purposes and take reasonable steps to keep data
              accurate and up to date. You can review/update your account information in profile settings or by
              contacting us.
            </p>

            <h2>20) Data Portability and Export</h2>
            <p>
              Where applicable, you may request a machine‑readable copy of certain personal data you provided.
              We will provide it in a commonly used format, subject to verification and legal limitations.
            </p>

            <h2>21) Law Enforcement and Emergency Requests</h2>
            <p>
              Law enforcement requests must include valid legal process (e.g., subpoena, court order). Submit to
              legal@ticketooz.com. For emergencies involving imminent harm, include "Emergency Disclosure
              Request" in the subject; we will assess per applicable law.
            </p>

            <h2>22) Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. The "Last updated" date shows the latest
              revision. Where appropriate, we will notify you of material changes via the service or email. Your
              continued use after changes indicates acceptance.
            </p>

            <h2>23) Contact Us</h2>
            <ul>
              <li>Privacy requests: privacy@ticketooz.com</li>
              <li>Security issues: security@ticketooz.com</li>
              <li>General support: support@ticketooz.com</li>
            </ul>
            <p>
              You may lodge a complaint with your local data protection authority if you believe your rights have
              been infringed.
            </p>

            <h2>24) Jurisdiction‑Specific Notices</h2>
            
            <h3>A) India (DPDP Act, 2023)</h3>
            <p>
              Where the DPDP applies, Ticketooz may be a "Data Fiduciary." By using Ticketooz, you consent to
              processing for lawful purposes consistent with this policy. You may withdraw consent where
              applicable by contacting privacy@ticketooz.com (past processing remains lawful; services may be
              limited after withdrawal).
            </p>
            <p>
              <strong>Grievance Officer:</strong> Kaberi Dey, Grievance Officer, grievance@ticketooz.com, Tentulberia, Garia,
              Kolkata 700084. We will endeavor to respond within timelines prescribed by law.
            </p>

            <h2>25) Effective Agreement</h2>
            <p>
              By accessing or using Ticketooz, creating an account, or purchasing tickets, you acknowledge that
              you have read and understood this Privacy Policy and agree to its terms.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
