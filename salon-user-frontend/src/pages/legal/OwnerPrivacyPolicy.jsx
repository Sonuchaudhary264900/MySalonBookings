import React from 'react';

const S = {
  page:    { background: '#09090f', minHeight: '100vh', color: '#e2e8f0', fontFamily: "'Inter', sans-serif", padding: '48px 20px 80px' },
  wrap:    { maxWidth: 820, margin: '0 auto' },
  badge:   { display: 'inline-block', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: 8, padding: '4px 12px', fontSize: 12, color: '#34d399', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 },
  h1:      { fontSize: 32, fontWeight: 900, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.03em' },
  meta:    { color: 'rgba(255,255,255,0.35)', fontSize: 13, marginBottom: 40 },
  h2:      { fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.02em' },
  h3:      { fontSize: 15, fontWeight: 700, color: '#34d399', margin: '20px 0 8px' },
  p:       { color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.8, margin: '0 0 14px' },
  ul:      { color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.8, paddingLeft: 20, margin: '0 0 14px' },
  li:      { marginBottom: 6 },
  card:    { background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px 28px', marginBottom: 28 },
  highlight: { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '16px 20px', marginBottom: 24 },
};

const Section = ({ title, children }) => (
  <div style={S.card}>
    <h2 style={S.h2}>{title}</h2>
    {children}
  </div>
);

export default function OwnerPrivacyPolicy() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <span style={S.badge}>Legal Document — Salon Owners</span>
        <h1 style={S.h1}>Privacy Policy for Salon Owners</h1>
        <p style={S.meta}>MySalonBookings &nbsp;·&nbsp; Effective Date: March 26, 2025 &nbsp;·&nbsp; Last Updated: March 26, 2025</p>

        <div style={S.highlight}>
          <p style={{ ...S.p, margin: 0, color: 'rgba(255,255,255,0.8)' }}>
            This Privacy Policy applies to <strong style={{ color: '#fff' }}>salon owners and business operators</strong> ("you", "Owner", or "Business User") who use MySalonBookings to manage their salon, accept bookings, and grow their business. Please read this carefully — it explains how we collect and use your business and personal data as a service provider on our platform.
          </p>
        </div>

        <Section title="1. Who We Are">
          <p style={S.p}>MySalonBookings is a B2B SaaS platform that provides salon owners with tools to manage bookings, customers, and their business operations. As a salon owner, you are a business user of our platform and this policy governs our relationship with you.</p>
          <p style={S.p}><strong style={{ color: '#fff' }}>Platform Name:</strong> MySalonBookings (Owner App: "My Salon Bookings")<br />
          <strong style={{ color: '#fff' }}>Android Package:</strong> com.mysalonbookings.owner<br />
          <strong style={{ color: '#fff' }}>Web Dashboard:</strong> mysalonbookings.com/dashboard<br />
          <strong style={{ color: '#fff' }}>Contact Email:</strong> support@mysalonbookings.com</p>
        </Section>

        <Section title="2. Information We Collect About You">
          <h3 style={S.h3}>2.1 Account Registration Data</h3>
          <ul style={S.ul}>
            <li style={S.li}><strong>Full Name</strong> – your personal identity as the account holder</li>
            <li style={S.li}><strong>Phone Number</strong> – for account verification, login, and communication</li>
            <li style={S.li}><strong>Email Address</strong> – for billing, account alerts, and support</li>
            <li style={S.li}><strong>Password</strong> – stored in encrypted (bcrypt) form; never stored in plain text</li>
          </ul>

          <h3 style={S.h3}>2.2 Salon Business Information</h3>
          <ul style={S.ul}>
            <li style={S.li}><strong>Salon Name</strong> – your business name displayed on the platform</li>
            <li style={S.li}><strong>Salon Address & Location</strong> – for displaying your salon to customers nearby</li>
            <li style={S.li}><strong>Services & Pricing</strong> – the services you list and their prices</li>
            <li style={S.li}><strong>Salon Photos</strong> – images you upload (stored on Cloudinary)</li>
            <li style={S.li}><strong>Business Category</strong> – barbershop, unisex salon, ladies salon, etc.</li>
            <li style={S.li}><strong>Operating Hours</strong> – your salon's schedule for customer-facing display</li>
          </ul>

          <h3 style={S.h3}>2.3 Subscription & Billing Data</h3>
          <ul style={S.ul}>
            <li style={S.li}><strong>Selected Plan</strong> – Starter (₹150/month) or Per Booking (₹1/booking)</li>
            <li style={S.li}><strong>Trial Status</strong> – start date and remaining days of your 30-day free trial</li>
            <li style={S.li}><strong>Payment History</strong> – invoices, payment status, and billing cycle dates</li>
            <li style={S.li}><strong>Monthly Booking Count</strong> – for Per Booking plan billing calculations</li>
            <li style={S.li}><strong>Razorpay Payment References</strong> – order IDs and payment verification tokens (not card/banking credentials)</li>
          </ul>

          <h3 style={S.h3}>2.4 Operational Data</h3>
          <ul style={S.ul}>
            <li style={S.li}><strong>Booking Records</strong> – all bookings made at your salon via our platform</li>
            <li style={S.li}><strong>Customer Data Accessed</strong> – names and phone numbers of customers who booked with you (see Section 5)</li>
            <li style={S.li}><strong>Device & App Data</strong> – device type, OS version, app version, and usage patterns</li>
            <li style={S.li}><strong>Push Notification Tokens</strong> – to send you real-time new booking alerts</li>
            <li style={S.li}><strong>Log Data</strong> – IP addresses, login timestamps, and API activity logs</li>
          </ul>

          <h3 style={S.h3}>2.5 Photos & Media</h3>
          <p style={S.p}>The owner app requests access to your device's photo library and camera to allow you to upload salon photos and update your profile picture. Photos are uploaded and stored securely on Cloudinary's content delivery network.</p>
        </Section>

        <Section title="3. How We Use Your Information">
          <ul style={S.ul}>
            <li style={S.li}><strong>Account Management</strong> – creating, authenticating, and maintaining your owner account</li>
            <li style={S.li}><strong>Salon Discovery</strong> – listing your salon to customers searching for nearby services</li>
            <li style={S.li}><strong>Booking Management</strong> – processing incoming bookings and notifying you in real-time</li>
            <li style={S.li}><strong>Billing & Subscription</strong> – managing your plan, generating invoices, processing payments via Razorpay, and sending billing reminders</li>
            <li style={S.li}><strong>Platform Communication</strong> – sending you important updates, billing alerts, and platform announcements</li>
            <li style={S.li}><strong>Analytics & Reporting</strong> – providing you with booking statistics and business insights within your dashboard</li>
            <li style={S.li}><strong>Support</strong> – resolving issues, answering queries, and investigating disputes</li>
            <li style={S.li}><strong>Security & Compliance</strong> – detecting fraud, preventing abuse, and complying with Indian law</li>
            <li style={S.li}><strong>Platform Improvement</strong> – using aggregated, anonymized usage data to improve MySalonBookings</li>
          </ul>
        </Section>

        <Section title="4. Subscription Billing Data Handling">
          <p style={S.p}>MySalonBookings uses <strong style={{ color: '#fff' }}>Razorpay</strong> to process all subscription payments. Here is how billing data is handled:</p>
          <ul style={S.ul}>
            <li style={S.li}>When you pay for your subscription, you interact with Razorpay's secure payment interface</li>
            <li style={S.li}>We receive only a <strong style={{ color: '#fff' }}>payment confirmation token</strong> (Razorpay Order ID, Payment ID, and Signature) — never your card number, UPI PIN, or bank details</li>
            <li style={S.li}>We store your invoice records, plan details, billing cycle dates, and payment status in our database</li>
            <li style={S.li}>Billing records are retained for 7 years to comply with Indian tax and accounting regulations (GST Act, Income Tax Act)</li>
            <li style={S.li}>Razorpay's Privacy Policy (razorpay.com/privacy) governs how your payment credentials are handled</li>
          </ul>
        </Section>

        <Section title="5. Customer Data You Access Through Our Platform">
          <p style={S.p}>As a salon owner, you will have access to your customers' personal data (name, phone number, booking details) through the MySalonBookings dashboard. This is necessary to provide your services. As a data controller for this customer data, you must:</p>
          <ul style={S.ul}>
            <li style={S.li}><strong>Use customer data only</strong> to manage and fulfill salon bookings made through our platform</li>
            <li style={S.li}><strong>Not share, sell, or transfer</strong> customer data to any third party</li>
            <li style={S.li}><strong>Not use customer contact details</strong> for unsolicited marketing or spam without explicit consent</li>
            <li style={S.li}><strong>Protect customer data</strong> you access from unauthorized disclosure or misuse</li>
            <li style={S.li}><strong>Delete or return</strong> customer data upon termination of your MySalonBookings account</li>
          </ul>
          <p style={S.p}>Violation of these obligations may result in immediate account suspension and may expose you to legal liability under applicable Indian data protection laws.</p>
        </Section>

        <Section title="6. How We Share Your Information">
          <h3 style={S.h3}>6.1 With Third-Party Service Providers</h3>
          <ul style={S.ul}>
            <li style={S.li}><strong>Razorpay</strong> – payment processing for subscription billing</li>
            <li style={S.li}><strong>Firebase (Google)</strong> – push notifications for new booking alerts</li>
            <li style={S.li}><strong>Cloudinary</strong> – storage and delivery of your salon images</li>
            <li style={S.li}><strong>MongoDB Atlas</strong> – secure cloud database for all platform data</li>
            <li style={S.li}><strong>Render.com</strong> – backend server hosting</li>
            <li style={S.li}><strong>Sentry</strong> – error monitoring and crash reporting (anonymized)</li>
          </ul>

          <h3 style={S.h3}>6.2 With Customers</h3>
          <p style={S.p}>Your salon name, location, services, photos, and business details are publicly listed to customers on the platform to enable bookings. This is the core purpose of the service.</p>

          <h3 style={S.h3}>6.3 Legal Requirements</h3>
          <p style={S.p}>We may disclose your information to government authorities, courts, or regulators if required by Indian law, including the Information Technology Act, GST authorities, or upon valid legal process.</p>

          <h3 style={S.h3}>6.4 We Do NOT Sell Your Data</h3>
          <p style={S.p}>We do not sell or rent your business or personal data to any third party for commercial purposes.</p>
        </Section>

        <Section title="7. Data Security">
          <p style={S.p}>We protect your data with industry-standard security measures:</p>
          <ul style={S.ul}>
            <li style={S.li}>All passwords are hashed using bcrypt before storage</li>
            <li style={S.li}>All API communication uses HTTPS/TLS encryption</li>
            <li style={S.li}>Authentication via JWT tokens with expiry controls</li>
            <li style={S.li}>Rate limiting and brute-force protection on all endpoints</li>
            <li style={S.li}>MongoDB Atlas encryption at rest and in transit</li>
            <li style={S.li}>Error monitoring via Sentry to detect and respond to security incidents</li>
          </ul>
        </Section>

        <Section title="8. Data Retention">
          <ul style={S.ul}>
            <li style={S.li}><strong>Account & Salon Data</strong> – retained while your account is active and for 90 days after closure</li>
            <li style={S.li}><strong>Booking Records</strong> – retained for 2 years after the booking date</li>
            <li style={S.li}><strong>Billing & Invoice Records</strong> – retained for 7 years (Indian tax law compliance)</li>
            <li style={S.li}><strong>Push Notification Tokens</strong> – deleted when you uninstall the app or revoke permissions</li>
            <li style={S.li}><strong>Uploaded Photos</strong> – deleted from Cloudinary within 30 days of account closure</li>
          </ul>
        </Section>

        <Section title="9. Your Rights as a Business User">
          <ul style={S.ul}>
            <li style={S.li}><strong>Access</strong> – request a copy of your account and billing data</li>
            <li style={S.li}><strong>Correction</strong> – update your salon information, contact details, or business information at any time through your dashboard</li>
            <li style={S.li}><strong>Account Deletion</strong> – request deletion of your account and associated data (subject to billing record retention obligations)</li>
            <li style={S.li}><strong>Data Export</strong> – request an export of your booking history and invoice records</li>
            <li style={S.li}><strong>Notification Opt-Out</strong> – manage push notification preferences through your device settings</li>
          </ul>
          <p style={S.p}>Submit requests to <strong style={{ color: '#34d399' }}>support@mysalonbookings.com</strong>. We respond within 30 business days.</p>
        </Section>

        <Section title="10. Approval Process">
          <p style={S.p}>New salon owner accounts are subject to an approval process by MySalonBookings administrators. During this review, your submitted business information is reviewed for authenticity and compliance with our platform policies. We may request additional verification documents during this process.</p>
        </Section>

        <Section title="11. Changes to This Policy">
          <p style={S.p}>We will notify you of material changes to this Privacy Policy via email or in-app notification at least 14 days before the changes take effect. Continued use of the platform after the effective date constitutes acceptance of the updated policy.</p>
        </Section>

        <Section title="12. Contact Us">
          <p style={S.p}>For privacy-related queries, data requests, or concerns:</p>
          <p style={S.p}>
            <strong style={{ color: '#fff' }}>MySalonBookings Support</strong><br />
            Email: <strong style={{ color: '#34d399' }}>support@mysalonbookings.com</strong><br />
            Platform: mysalonbookings.com<br />
            Response Time: Within 2 business days
          </p>
        </Section>
      </div>
    </div>
  );
}
