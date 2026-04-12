import React from 'react';

const S = {
  page:    { background: '#09090f', minHeight: '100vh', color: '#e2e8f0', fontFamily: "'Inter', sans-serif", padding: '48px 20px 80px' },
  wrap:    { maxWidth: 820, margin: '0 auto' },
  badge:   { display: 'inline-block', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.35)', borderRadius: 8, padding: '4px 12px', fontSize: 12, color: '#a78bfa', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 },
  h1:      { fontSize: 32, fontWeight: 900, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.03em' },
  meta:    { color: 'rgba(255,255,255,0.35)', fontSize: 13, marginBottom: 40 },
  divider: { border: 'none', borderTop: '1px solid rgba(255,255,255,0.07)', margin: '36px 0' },
  h2:      { fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.02em' },
  h3:      { fontSize: 15, fontWeight: 700, color: '#a78bfa', margin: '20px 0 8px' },
  p:       { color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.8, margin: '0 0 14px' },
  ul:      { color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.8, paddingLeft: 20, margin: '0 0 14px' },
  li:      { marginBottom: 6 },
  card:    { background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px 28px', marginBottom: 28 },
  highlight: { background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 12, padding: '16px 20px', marginBottom: 24 },
};

const Section = ({ title, children }) => (
  <div style={S.card}>
    <h2 style={S.h2}>{title}</h2>
    {children}
  </div>
);

export default function CustomerPrivacyPolicy() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <span style={S.badge}>Legal Document</span>
        <h1 style={S.h1}>Privacy Policy for Customers</h1>
        <p style={S.meta}>GlowLoox &nbsp;·&nbsp; Effective Date: March 26, 2025 &nbsp;·&nbsp; Last Updated: March 26, 2025</p>

        <div style={S.highlight}>
          <p style={{ ...S.p, margin: 0, color: 'rgba(255,255,255,0.8)' }}>
            This Privacy Policy explains how <strong style={{ color: '#fff' }}>GlowLoox</strong> ("we", "our", or "the Platform") collects, uses,
            stores, and shares your personal information when you use our salon booking services as a customer.
            By using GlowLoox, you agree to the practices described in this policy.
          </p>
        </div>

        <Section title="1. Who We Are">
          <p style={S.p}>GlowLoox is a SaaS (Software as a Service) platform that connects customers with salons and beauty service providers across India. We provide a digital marketplace where you can discover salons, book appointments, and manage your beauty service needs.</p>
          <p style={S.p}><strong style={{ color: '#fff' }}>Platform Name:</strong> GlowLoox<br />
          <strong style={{ color: '#fff' }}>Website:</strong> glowloox.com<br />
          <strong style={{ color: '#fff' }}>Android App Package:</strong> com.mysalonbookings.user<br />
          <strong style={{ color: '#fff' }}>Contact Email:</strong> glowloox@gmail.com</p>
        </Section>

        <Section title="2. Information We Collect">
          <h3 style={S.h3}>2.1 Information You Provide Directly</h3>
          <ul style={S.ul}>
            <li style={S.li}><strong>Full Name</strong> – used to identify you and for booking records</li>
            <li style={S.li}><strong>Phone Number</strong> – used for account creation, OTP verification, and booking confirmations</li>
            <li style={S.li}><strong>Email Address</strong> – used for account management and notifications</li>
            <li style={S.li}><strong>Booking Details</strong> – service type, preferred date/time, and any special requests</li>
          </ul>

          <h3 style={S.h3}>2.2 Information Collected Automatically</h3>
          <ul style={S.ul}>
            <li style={S.li}><strong>Device Information</strong> – device type, operating system version, and app version</li>
            <li style={S.li}><strong>Location Data</strong> – approximate or precise location (with your permission) to show nearby salons</li>
            <li style={S.li}><strong>Usage Data</strong> – pages viewed, features used, booking frequency, and session duration</li>
            <li style={S.li}><strong>Push Notification Tokens</strong> – to send you booking confirmations and reminders</li>
            <li style={S.li}><strong>Log Data</strong> – IP address, browser type, timestamps, and error logs for security and debugging</li>
          </ul>

          <h3 style={S.h3}>2.3 Information We Do NOT Collect</h3>
          <ul style={S.ul}>
            <li style={S.li}>We do not store your payment card details, UPI PINs, or banking credentials</li>
            <li style={S.li}>All payment processing is handled directly by Razorpay (see Section 5)</li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Information">
          <p style={S.p}>We use your information for the following purposes:</p>
          <ul style={S.ul}>
            <li style={S.li}><strong>Account Management</strong> – creating and maintaining your GlowLoox account</li>
            <li style={S.li}><strong>Booking Services</strong> – processing, confirming, and managing your salon appointments</li>
            <li style={S.li}><strong>Notifications</strong> – sending booking confirmations, reminders, and status updates via push notifications, SMS, or email</li>
            <li style={S.li}><strong>Salon Discovery</strong> – showing you nearby salons using your location data</li>
            <li style={S.li}><strong>Customer Support</strong> – responding to your queries, complaints, or feedback</li>
            <li style={S.li}><strong>Safety & Security</strong> – detecting fraud, abuse, and unauthorized account access</li>
            <li style={S.li}><strong>Platform Improvement</strong> – analyzing usage patterns to improve the app experience</li>
            <li style={S.li}><strong>Legal Compliance</strong> – complying with applicable Indian laws and regulations</li>
          </ul>
        </Section>

        <Section title="4. How We Share Your Information">
          <h3 style={S.h3}>4.1 With Salon Owners</h3>
          <p style={S.p}>When you book an appointment, the salon owner who accepts your booking will receive your <strong style={{ color: '#fff' }}>name, phone number, and booking details</strong>. This is necessary to provide the service. Salon owners on our platform are bound by our Terms of Service to handle your data responsibly and only use it for service delivery purposes.</p>

          <h3 style={S.h3}>4.2 With Service Providers</h3>
          <ul style={S.ul}>
            <li style={S.li}><strong>Razorpay</strong> – payment processing (subject to Razorpay's own Privacy Policy)</li>
            <li style={S.li}><strong>Firebase (Google)</strong> – push notifications and analytics</li>
            <li style={S.li}><strong>Cloudinary</strong> – image hosting for salon and profile photos</li>
            <li style={S.li}><strong>MongoDB Atlas</strong> – secure cloud database storage</li>
            <li style={S.li}><strong>Render.com</strong> – backend hosting infrastructure</li>
          </ul>

          <h3 style={S.h3}>4.3 Legal Disclosures</h3>
          <p style={S.p}>We may disclose your information if required by law, court order, or government authority in India, or to protect the rights, safety, or property of GlowLoox, our users, or the public.</p>

          <h3 style={S.h3}>4.4 We Do NOT Sell Your Data</h3>
          <p style={S.p}>We do not sell, rent, or trade your personal information to any third party for marketing or advertising purposes.</p>
        </Section>

        <Section title="5. Razorpay Payment Processing">
          <p style={S.p}>Payments on GlowLoox are processed by <strong style={{ color: '#fff' }}>Razorpay Software Private Limited</strong>, a PCI-DSS compliant payment gateway. When you make a payment:</p>
          <ul style={S.ul}>
            <li style={S.li}>You are redirected to or interact with Razorpay's secure payment interface</li>
            <li style={S.li}>Your card/UPI/banking details are entered directly on Razorpay's systems</li>
            <li style={S.li}>GlowLoox only receives a payment confirmation token – never your raw payment credentials</li>
            <li style={S.li}>Razorpay's Privacy Policy governs how they handle your payment data: razorpay.com/privacy</li>
          </ul>
        </Section>

        <Section title="6. Location Data">
          <p style={S.p}>The GlowLoox app requests location permission to help you find salons near you. Location access is <strong style={{ color: '#fff' }}>optional</strong> – you can use the app without granting location permission by searching for salons manually.</p>
          <ul style={S.ul}>
            <li style={S.li}>Location data is used only to show nearby salons and is not stored permanently</li>
            <li style={S.li}>We do not track your location in the background</li>
            <li style={S.li}>You can revoke location permission at any time from your device settings</li>
          </ul>
        </Section>

        <Section title="7. Push Notifications">
          <p style={S.p}>We use Firebase Cloud Messaging (FCM) to send push notifications about your bookings. You can disable push notifications at any time from your device settings. Disabling notifications will not affect your ability to use the platform, but you may miss booking reminders.</p>
        </Section>

        <Section title="8. Data Security">
          <p style={S.p}>We implement appropriate technical and organizational security measures to protect your personal data, including:</p>
          <ul style={S.ul}>
            <li style={S.li}>HTTPS/TLS encryption for all data transmitted between your device and our servers</li>
            <li style={S.li}>Encrypted storage of sensitive account information</li>
            <li style={S.li}>JWT-based authentication with token expiry</li>
            <li style={S.li}>Rate limiting and anti-abuse protections on our APIs</li>
            <li style={S.li}>Regular security audits and monitoring via Sentry</li>
          </ul>
          <p style={S.p}>While we take reasonable precautions, no internet-based system is 100% secure. We cannot guarantee absolute security of data transmitted over the internet.</p>
        </Section>

        <Section title="9. Data Retention">
          <p style={S.p}>We retain your personal data for as long as your account is active or as needed to provide services. Specifically:</p>
          <ul style={S.ul}>
            <li style={S.li}><strong>Account Data</strong> – retained while your account is active and for 90 days after deletion</li>
            <li style={S.li}><strong>Booking Records</strong> – retained for 2 years for dispute resolution and legal compliance</li>
            <li style={S.li}><strong>Payment Records</strong> – retained for 7 years as required by Indian tax laws</li>
            <li style={S.li}><strong>Log Data</strong> – retained for 90 days for security monitoring</li>
          </ul>
        </Section>

        <Section title="10. Your Rights">
          <p style={S.p}>As a user of GlowLoox, you have the following rights regarding your personal data:</p>
          <ul style={S.ul}>
            <li style={S.li}><strong>Access</strong> – request a copy of the personal data we hold about you</li>
            <li style={S.li}><strong>Correction</strong> – request correction of inaccurate or incomplete data</li>
            <li style={S.li}><strong>Deletion</strong> – request deletion of your account and personal data (subject to legal retention obligations)</li>
            <li style={S.li}><strong>Withdrawal of Consent</strong> – withdraw consent for optional data processing (e.g., location, notifications) at any time</li>
            <li style={S.li}><strong>Portability</strong> – request your booking history in a readable format</li>
          </ul>
          <p style={S.p}>To exercise any of these rights, contact us at <strong style={{ color: '#a78bfa' }}>glowloox@gmail.com</strong>. We will respond within 30 days.</p>
        </Section>

        <Section title="11. Children's Privacy">
          <p style={S.p}>GlowLoox is not intended for children under 13 years of age. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us immediately and we will delete such information.</p>
        </Section>

        <Section title="12. Changes to This Policy">
          <p style={S.p}>We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on our platform and updating the "Last Updated" date. Your continued use of GlowLoox after changes are posted constitutes your acceptance of the updated policy.</p>
        </Section>

        <Section title="13. Contact Us">
          <p style={S.p}>If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>
          <p style={S.p}>
            <strong style={{ color: '#fff' }}>GlowLoox Support Team</strong><br />
            Email: <strong style={{ color: '#a78bfa' }}>glowloox@gmail.com</strong><br />
            Platform: glowloox.com<br />
            Response Time: Within 2 business days
          </p>
        </Section>
      </div>
    </div>
  );
}
