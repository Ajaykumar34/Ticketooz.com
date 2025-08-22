
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';

const TermsOfUse = () => {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Ticketooz Terms of Use</h1>
          <p className="text-gray-600">Last updated on and Effective from: 11 Aug 2025</p>
        </div>

        <Card>
          <CardContent className="p-8 prose max-w-none">
            <p className="text-gray-700 mb-6">
              These Terms of Use ("Terms") govern your access to and use of Ticketooz.com and the Ticketooz
              mobile applications (together, "Ticketooz," "we," "us," or "our"), including browsing events, creating
              an account, purchasing tickets, and using related features. By accessing or using Ticketooz, you agree
              to be bound by these Terms and all policies referenced here (including our Privacy Policy). If you do
              not agree, do not use Ticketooz.
            </p>
            <p className="text-gray-700 mb-6">
              <em>Note: Depending on your location, additional region‑specific terms may apply.</em>
            </p>

            <h2>1) Acceptance of Terms; Modifications</h2>
            <p>By using Ticketooz, you accept these Terms without modification.</p>
            <p>
              We may update these Terms, fees, or processes from time to time. The "Last updated" date reflects
              the latest revision. Material changes may be notified on‑site/in‑app or by email. Your continued use
              after changes constitutes acceptance.
            </p>

            <h2>2) About Ticketooz and Role</h2>
            <p>
              Ticketooz is an online platform that lists events and facilitates the sale and distribution of tickets on
              behalf of independent event organizers, venues, promoters, producers, and similar partners ("Event
              Partners").
            </p>
            <p>
              Unless stated otherwise, Ticketooz acts as an intermediary/agent for Event Partners. Event Partners
              are responsible for the event and related services.
            </p>
            <p>
              Your purchase forms: (i) a contract with the Event Partner for event entry/services, and (ii) a
              contract with Ticketooz for platform/transactional services (e.g., convenience/processing fees).
            </p>

            <h2>3) Eligibility and Account</h2>
            <p>
              You must be at least 18 to purchase or transact. If under 18, you may use Ticketooz only under the
              supervision and consent of a parent or legal guardian.
            </p>
            <p>
              Keep your credentials confidential. You are responsible for all activity under your account. Notify us
              promptly of any unauthorized use.
            </p>
            <p>Provide accurate, current, and complete information and keep it updated.</p>

            <h2>4) Privacy</h2>
            <p>
              Our Privacy Policy explains how we collect, use, and share information. By using Ticketooz, you
              acknowledge and accept the Privacy Policy (which forms part of these Terms).
            </p>

            <h2>5) Platform Access, Acceptable Use, and Access/Interference</h2>
            <p>Personal, non‑commercial use only unless expressly authorized.</p>
            <p><strong>You must not:</strong></p>
            <ul>
              <li>defame, abuse, harass, stalk, threaten, or violate legal rights;</li>
              <li>upload or distribute content that infringes IP rights unless you own/control the rights or have necessary consents;</li>
              <li>upload/distribute viruses, corrupted files, or harmful code;</li>
              <li>advertise or offer to sell/buy goods/services for business purposes unless the feature allows it;</li>
              <li>conduct or forward surveys, contests, pyramid schemes, chain letters, or spam through our services;</li>
              <li>download files you know or reasonably should know cannot be legally distributed;</li>
              <li>falsify/delete author attributions, legal notices, proprietary designations, or labels regarding source or origin;</li>
              <li>violate any code of conduct, venue rules, or applicable laws;</li>
              <li>scrape, harvest, or deep‑link to transactional pages for commercial purposes without authorization;</li>
              <li>use robots, spiders, or automation to access transactional pages, or refresh/"hammer" transactional pages at abnormal rates (including sending repetitive requests or page refreshes at a rate exceeding roughly one request every three seconds);</li>
              <li>bypass, probe, or interfere with security, authentication, rate limits, or availability; or attempt to gain unauthorized access to accounts, systems, or data.</li>
            </ul>
            <p>
              We may monitor for abuse, limit or disable access, remove content, or suspend/terminate accounts
              in case of violations, fraud, abuse, or risk.
            </p>

            <h2>6) Communication Services (Email, Chat, Forums, WhatsApp/SMS, In‑App)</h2>
            <p>Use communication features only to post/send/receive messages and materials proper to that service.</p>
            <p>
              We may (but are not obligated to) monitor, review, and remove materials in our discretion. We may
              disclose information to comply with law or respond to legal requests.
            </p>
            <p>
              Materials may be subject to posted limitations on usage/reproduction/dissemination; you must
              comply with those.
            </p>

            <h2>7) Event Listings, Pricing, Availability, and Classifications</h2>
            <p>
              Ticket availability, seat maps, age ratings/censor guidance, entry restrictions, schedules, and pricing
              are provided/controlled by Event Partners and may change.
            </p>
            <p>
              Dynamic/real‑time pricing may apply. Displayed prices may include or exclude taxes, venue charges,
              convenience fees, and order processing fees (disclosed at checkout).
            </p>
            <p>
              We do not guarantee the accuracy of seating charts, views, or acoustics. Minor seat relocations of
              equivalent or better value may occur.
            </p>

            <h2>8) Purchase Policy</h2>
            <h3>Payment methods and billing:</h3>
            <p>
              Accepted methods are shown at checkout (e.g., credit/debit cards, net‑banking, UPI, wallets). Orders may require billing verification, OTP/strong authentication, or KYC.
              We may cancel orders we cannot verify. You authorize charges for the total amount (including
              taxes/fees). Chargebacks/payment disputes may result in suspension or ticket reversal.
            </p>
            
            <h3>Order confirmation:</h3>
            <p>
              After payment, you should receive confirmation (on‑screen and/or email/SMS/app) with a booking ID. If not received, check order history or contact support. You must verify whether your order was placed.
            </p>
            
            <h3>Delivery:</h3>
            <p>
              Delivery options may include e‑tickets/QR in app/email, SMS, or venue pickup. Options vary by event and are shown at checkout. A valid photo ID and, if requested, the payment card used (or permitted authorization letter) may be required for pickup. Safeguard your tickets/QR/booking ID. Anyone in possession may gain entry.
            </p>
            
            <h3>Ticket limits:</h3>
            <p>
              Limits per event/transaction may apply. Circumventing limits (e.g., multiple accounts/devices) may lead to cancellation and suspension.
            </p>
            
            <h3>Age/classifications and entry:</h3>
            <p>
              Comply with age ratings/censor warnings and venue rules. Under‑age attendees may be refused entry for restricted content. Children may require their own ticket if specified.
            </p>
            
            <h3>Pre‑booking (if offered):</h3>
            <p>
              Indicates your intent to buy when sales open and does not guarantee seats until we confirm. Eligibility for pre-booking will be mentioned on the event page and pre-booking made only by eligible individuals will be considered valid. Seats will generally be allocated based on first booked first serve basis. If seats cannot be allocated, we will cancel and refund per the event policy. Any price differences will be reconciled per the policy shown at checkout. Refund (if any) will generally be processed within 10 – 15 business days after we receive funds/authorization from the Event Partner.
            </p>
            
            <h3>No‑show/late arrival:</h3>
            <p>
              Late arrival may lead to delayed/refused entry. No‑shows are not eligible for refunds. Re‑admission may be restricted.
            </p>

            <h2>9) Cancellations, Exchanges, Refunds, and Errors</h2>
            <p>
              Unless explicitly stated for a specific event or required by law, all sales are final and non‑refundable;
              tickets are non‑exchangeable and non‑cancellable after purchase.
            </p>
            <p>Convenience/processing fees and applicable charges are generally non‑refundable.</p>
            <p>
              If an event is cancelled or postponed, the Event Partner's policy applies. We will attempt to notify
              you and facilitate refunds/exchanges if offered by the Event Partner. Refunds (if any) are typically
              processed to the original payment method generally within 10 – 15 business days after we receive
              funds/authorization from the Event Partner.
            </p>
            <p>
              <strong>Pricing/availability errors:</strong> We may cancel and refund if an amount or availability is incorrect or a
              ticket is released in error or ahead of schedule.
            </p>
            <p>If vouchers/credits/coupons were used, any refund will be adjusted per voucher/credit terms.</p>

            <h2>10) Resale, Transfer, and Unauthorized Use</h2>
            <p>
              Unless expressly permitted by the Event Partner and Ticketooz, tickets may not be resold, traded,
              transferred for premium, or used for promotions. Unauthorized resale may result in cancellation or
              denial of entry without refund.
            </p>
            <p>
              Do not buy from unauthorized sellers. Ticketooz is not responsible for counterfeit, void, or invalid
              tickets obtained from third parties.
            </p>

            <h2>11) Venue and Event Rules; Prohibited Items; Assumption of Risk</h2>
            <p>
              Comply with venue/event rules, including security checks, frisking, and restrictions. Prohibited items
              commonly include professional cameras, laptops, tablets, large bags, recording devices, weapons,
              hazardous materials, alcohol/drugs, and outside food/beverage (where prohibited), subject to venue
              policy.
            </p>
            <p>
              Events may involve inherent risks (e.g., loud sound, strobe lighting, pyrotechnics, crowding, physical
              activity). By attending, you voluntarily assume all risks associated with attendance, to the extent
              permitted by law.
            </p>

            <h2>12) Promotions, Credits, Gift Cards, and Wallets</h2>
            <p>
              Promotional offers, coupon codes, referral bonuses, gift cards, and wallet credits are subject to
              specific terms disclosed at issuance or on relevant pages. Unless stated otherwise, they are
              non‑transferable, have no cash value, may expire, and may be reversed in case of misuse/fraud.
            </p>
            <p>
              Ticketooz gift cards/credits are redeemable only on Ticketooz, not at venues, and are not
              replaceable if lost/stolen except as required by law.
            </p>

            <h2>13) Intellectual Property; Complaints</h2>
            <p>
              Ticketooz, its interfaces, and content are protected by IP laws. Except as expressly allowed, you may
              not copy, modify, distribute, or create derivative works.
            </p>
            <p>
              If you believe content infringes your rights, email legal@ticketooz.com with details (rights asserted,
              URLs, your contact, and a good‑faith statement). We may disable/remove content and, where
              appropriate, suspend repeat infringers.
            </p>

            <h2>14) Third‑Party Links, Content, and Services</h2>
            <p>
              Ticketooz may link to or integrate with third‑party sites/services (APIs, payment gateways,
              messaging, maps, identity verification, social platforms, advertisers). We do not control or endorse
              third‑party content and are not responsible for their policies or practices. Your use is at your own
              risk and subject to their terms.
            </p>

            <h2>15) Software, Mobile Apps, and Updates</h2>
            <p>
              We grant a limited, non‑exclusive, revocable license to use our apps/site for personal,
              non‑commercial purposes.
            </p>
            <p>The app may download/install updates automatically. You consent to receive updates.</p>
            <p>
              App Store/Google Play terms apply in addition to these Terms. Platform providers are third‑party
              beneficiaries of the app license.
            </p>

            <h2>16) Fees, Taxes, and Charges</h2>
            <p>
              We may charge listing fees and transaction/convenience/processing fees. We may modify fees from
              time to time.
            </p>
            <p>
              You are responsible for all applicable charges, duties, taxes, levies, and assessments (e.g., GST/VAT)
              related to your purchases. We will disclose applicable fees/taxes at checkout.
            </p>

            <h2>17) Disclaimers</h2>
            <p>
              Ticketooz provides the platform "as is" and "as available." To the maximum extent permitted by law,
              we disclaim all warranties (express, implied, statutory), including merchantability, fitness for a
              particular purpose, title, and non‑infringement.
            </p>
            <p>
              We endeavor to keep information accurate but do not warrant completeness, accuracy, or that
              content is free of errors. Event details are provided by Event Partners and may change.
            </p>
            <p>
              We are not the event service provider and are not responsible for event standards, safety, timing,
              seating, visibility, acoustics, or audience behavior.
            </p>
            <p>
              We are not liable for service interruptions, scheduled maintenance, unplanned outages, data loss, or
              harmful code. Downloading/viewing content is at your discretion and risk.
            </p>

            <h2>18) Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Ticketooz is not liable for indirect, incidental, special,
              punitive, or consequential damages; loss of profits, data, goodwill; or cost of substitute services.
            </p>
            <p>
              Our maximum aggregate liability relating to the services or a transaction shall not exceed the total
              amount of Ticketooz platform fees and charges we received from you for the relevant order,
              excluding the ticket face value and taxes paid to Event Partners or authorities.
            </p>
            <p>Nothing herein excludes liability that cannot be excluded under applicable law.</p>

            <h2>19) Indemnity</h2>
            <p>
              You agree to indemnify and hold harmless Ticketooz, its affiliates, and their officers, directors,
              employees, and agents from and against claims, losses, liabilities, damages, costs, and expenses
              (including reasonable legal fees) arising out of or related to: your breach of these Terms; misuse of
              Ticketooz; violation of law or third‑party rights; or your conduct at an event.
            </p>

            <h2>20) Breach and Remedies</h2>
            <p>
              We may limit your activity, cancel orders, warn other users, suspend/terminate registration, and/or
              refuse access if: you breach these Terms or policies; we cannot verify or authenticate information; or
              we believe your actions may infringe rights, violate laws, or pose liability/risk.
            </p>
            <p>We may reinstate at our discretion. We may recover amounts due and take legal action as necessary.</p>

            <h2>21) Suspension, Termination, and Effect</h2>
            <p>
              We may suspend/terminate your access and remove content immediately for violations,
              fraud/abuse, or risk.
            </p>
            <p>
              You may discontinue use at any time. Upon termination: your right to use Ticketooz ends
              immediately; we may delete data stored on Ticketooz and are not obligated to execute uncompleted
              tasks.
            </p>

            <h2>22) Notices</h2>
            <p>
              Official notices to Ticketooz should be sent to legal@ticketooz.com and to our mailing address
              below.
            </p>
            <p>
              Notices to you may be sent via email to your registered address, in‑app messages, on‑site postings,
              or SMS (where applicable).
            </p>
            <p>
              Unless a different time is required by law, notices are deemed given 48 hours after dispatch (or
              immediately for on‑site display), except that email is deemed given when sent unless the sender is
              notified the address is invalid.
            </p>

            <h2>23) Governing Law; Dispute Resolution; Venue</h2>
            <h3>Governing Law</h3>
            <p>
              These Terms and any dispute, claim, or controversy arising out of or relating to these
              Terms, the Ticketooz services, any ticket purchase, or your use of Ticketooz (collectively, "Disputes")
              shall be governed by and construed in accordance with the laws of India, without giving effect to any
              conflict of laws principles.
            </p>
            
            <h3>Courts and Venue</h3>
            <p>
              Subject to any non-excludable consumer protections under applicable law, the
              courts at Kolkata, West Bengal, India shall have exclusive jurisdiction over all Disputes. You and
              Ticketooz agree to submit to the exclusive jurisdiction and venue of the courts at Kolkata and waive
              any objection to venue or forum, including on the grounds of forum non conveniens. Where
              applicable under law, the High Court at Calcutta shall have jurisdiction.
            </p>
            
            <h3>Interim Relief</h3>
            <p>
              Notwithstanding the foregoing, either party may seek interim, injunctive, or equitable
              relief from any court of competent jurisdiction to protect its intellectual property or confidential
              information, pending final resolution by the courts at Kolkata.
            </p>

            <h2>24) Relationship; Assignment; Headings; Interpretation; Severability; Waiver; Entire Agreement</h2>
            <p>No partnership, employment, or agency relationship is created by these Terms or your use of Ticketooz.</p>
            <p>
              You may not assign/transfer your rights or obligations. We may assign to an affiliate or as part of a
              merger, acquisition, or sale.
            </p>
            <p>Headings are for convenience only.</p>
            <p>
              Words in the singular include the plural and vice versa; any gender includes all genders; "including"
              means "including without limitation."
            </p>
            <p>If any provision is invalid or unenforceable, the remainder remains in effect.</p>
            <p>Failure to enforce a provision is not a waiver.</p>
            <p>
              These Terms, together with policies incorporated by reference, are the entire agreement between
              you and Ticketooz and supersede prior agreements regarding the services.
            </p>

            <h2>25) Buyer Beware; Security</h2>
            <p>Keep booking IDs, QR codes, and confirmations secure. Anyone in possession may gain entry.</p>
            <p>Do not purchase printouts/SMS screenshots/QR codes from third parties or unauthorized resellers.</p>
            <p>
              We display prices set by Event Partners and may charge clearly disclosed fees; we do not mark up
              the ticket face value beyond disclosed fees.
            </p>
            <p>
              We will never ask for your card PIN, full CVV, or one‑time passwords by phone, chat, or email. Enter
              payment details only on secure Ticketooz checkout screens within our website/app.
            </p>
            <p>Report suspected fraud or unauthorized use immediately to support@ticketooz.com.</p>

            <h2>26) Contact</h2>
            <ul>
              <li><strong>General Support:</strong> support@ticketooz.com</li>
              <li><strong>Legal Notices/Intellectual Property:</strong> legal@ticketooz.com</li>
              <li><strong>Privacy:</strong> privacy@ticketooz.com</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfUse;
