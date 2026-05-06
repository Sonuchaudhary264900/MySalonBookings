import React from 'react';

const S = {
  page:    { background: '#09090f', minHeight: '100vh', color: '#e2e8f0', fontFamily: "'Inter', sans-serif", padding: '48px 20px 80px' },
  wrap:    { maxWidth: 820, margin: '0 auto' },
  badge:   { display: 'inline-block', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.35)', borderRadius: 8, padding: '4px 12px', fontSize: 12, color: '#60a5fa', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 },
  h1:      { fontSize: 32, fontWeight: 900, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.03em' },
  meta:    { color: 'rgba(255,255,255,0.35)', fontSize: 13, marginBottom: 40 },
  h2:      { fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.02em' },
  h3:      { fontSize: 15, fontWeight: 700, color: '#60a5fa', margin: '20px 0 8px' },
  p:       { color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.8, margin: '0 0 14px' },
  ul:      { color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.8, paddingLeft: 20, margin: '0 0 14px' },
  li:      { marginBottom: 6 },
  card:    { background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px 28px', marginBottom: 28 },
  highlight: { background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: '16px 20px', marginBottom: 24 },
  warning: { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: '16px 20px', marginBottom: 24 },
};

const Section = ({ title, children }) => (
  <div style={S.card}>
    <h2 style={S.h2}>{title}</h2>
    {children}
  </div>
);

export default function CustomerTerms() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <span style={S.badge}>Legal Document</span>
        <h1 style={S.h1}>Terms & Conditions for Customers</h1>
        <p style={S.meta}>GlowLoox &nbsp;·&nbsp; Effective Date: March 26, 2025 &nbsp;·&nbsp; Last Updated: March 26, 2025</p>

        <div style={S.highlight}>
          <p style={{ ...S.p, margin: 0, color: 'rgba(255,255,255,0.8)' }}>
            Please read these Terms and Conditions ("Terms") carefully before using the GlowLoox platform. By creating an account or booking an appointment, you agree to be legally bound by these Terms. If you do not agree, please do not use our services.
          </p>
        </div>

        <Section title="1. About GlowLoox">
          <p style={S.p}>GlowLoox ("we", "us", "the Platform") is an online marketplace that connects customers with salon service providers across India. We provide the technology platform — we are not a salon and do not directly provide beauty or grooming services.</p>
          <p style={S.p}><strong style={{ color: '#fff' }}>Important:</strong> The actual salon service is provided by independent salon owners listed on our platform. GlowLoox facilitates the booking — the quality and delivery of the service is the responsibility of the salon.</p>
        </Section>

        <Section title="2. Eligibility">
          <p style={S.p}>To use GlowLoox as a customer:</p>
          <ul style={S.ul}>
            <li style={S.li}>You must be at least <strong style={{ color: '#fff' }}>13 years of age</strong></li>
            <li style={S.li}>If you are between 13 and 18, you must have parental or guardian consent</li>
            <li style={S.li}>You must provide accurate and genuine personal information during registration</li>
            <li style={S.li}>One person may maintain only one active customer account</li>
          </ul>
        </Section>

        <Section title="3. Account Registration">
          <p style={S.p}>When you create a GlowLoox account:</p>
          <ul style={S.ul}>
            <li style={S.li}>You agree to provide truthful, accurate, and current information</li>
            <li style={S.li}>You are responsible for maintaining the confidentiality of your account credentials</li>
            <li style={S.li}>You are responsible for all activity that occurs under your account</li>
            <li style={S.li}>You must notify us immediately at support@mysalonbookings.com if you suspect unauthorized access to your account</li>
            <li style={S.li}>We reserve the right to suspend accounts that provide false information</li>
          </ul>
        </Section>

        <Section title="4. Booking Services">
          <h3 style={S.h3}>4.1 How Bookings Work</h3>
          <p style={S.p}>GlowLoox enables you to browse salons, view services and pricing, and book appointments. When you submit a booking request:</p>
          <ul style={S.ul}>
            <li style={S.li}>The booking is sent to the salon for confirmation</li>
            <li style={S.li}>A confirmed booking creates a commitment between you and the salon</li>
            <li style={S.li}>You will receive a notification once the salon confirms or declines your booking</li>
          </ul>

          <h3 style={S.h3}>4.2 Customer Responsibilities for Bookings</h3>
          <ul style={S.ul}>
            <li style={S.li}><strong>Punctuality</strong> – arrive at the salon at or before your scheduled appointment time</li>
            <li style={S.li}><strong>Accuracy</strong> – ensure the booking details (service, date, time) are correct before confirming</li>
            <li style={S.li}><strong>Cancellation</strong> – if you need to cancel, please do so as early as possible to allow the salon to accommodate other customers</li>
            <li style={S.li}><strong>No-shows</strong> – repeated no-shows without cancellation may result in account restrictions</li>
            <li style={S.li}><strong>Respectful conduct</strong> – treat salon staff and other customers with respect; abusive behavior will result in account termination</li>
          </ul>

          <h3 style={S.h3}>4.3 Cancellation Policy</h3>
          <p style={S.p}>Cancellation policies for individual bookings are set by each salon owner. GlowLoox displays the salon's cancellation terms at the time of booking. Please review these before confirming your appointment. GlowLoox is not responsible for any cancellation fees charged by salons.</p>
        </Section>

        <Section title="5. Data Sharing with Salons">
          <p style={S.p}>When you book a salon service, your <strong style={{ color: '#fff' }}>name, phone number, and booking details</strong> are shared with the salon owner to enable service delivery. By booking, you explicitly consent to this data sharing.</p>
          <p style={S.p}>Salon owners are contractually required to use your information only for fulfilling your booking and not for unsolicited contact or marketing. If you experience data misuse by a salon, please report it to support@mysalonbookings.com.</p>
        </Section>

        <Section title="6. Payments">
          <h3 style={S.h3}>6.1 Payment Processing</h3>
          <p style={S.p}>Payments on GlowLoox are processed by <strong style={{ color: '#fff' }}>Razorpay</strong>, a licensed payment aggregator regulated by the Reserve Bank of India. Razorpay's Terms of Service and Privacy Policy apply to all payment transactions.</p>

          <h3 style={S.h3}>6.2 Security</h3>
          <p style={S.p}>GlowLoox never stores your payment card details, UPI ID, or bank account information. All sensitive payment data is handled exclusively by Razorpay's PCI-DSS compliant systems.</p>

          <h3 style={S.h3}>6.3 Payment Disputes</h3>
          <p style={S.p}>For any payment-related issues (failed payments, unauthorized charges), contact us at support@mysalonbookings.com. We will investigate and coordinate with Razorpay on your behalf. For disputes regarding service quality, please contact the salon directly first.</p>
        </Section>

        <Section title="7. Service Limitations & Platform Role">
          <div style={S.warning}>
            <p style={{ ...S.p, margin: 0, color: 'rgba(255,255,255,0.8)' }}>
              <strong style={{ color: '#fde68a' }}>Important Disclaimer:</strong> GlowLoox is a technology marketplace — we connect customers with salons but do not control, employ, or supervise salon staff. We cannot guarantee the quality, safety, or outcome of any salon service.
            </p>
          </div>
          <ul style={S.ul}>
            <li style={S.li}>Service quality is the sole responsibility of the individual salon</li>
            <li style={S.li}>Salon information (pricing, hours, services) is provided by the salon owner and may occasionally be inaccurate or outdated</li>
            <li style={S.li}>We do not guarantee salon availability — a salon may reject a booking if they are fully booked or unavailable</li>
            <li style={S.li}>GlowLoox is not liable for any injury, damage, dissatisfaction, or loss arising from salon services</li>
          </ul>
        </Section>

        <Section title="8. Prohibited Conduct">
          <p style={S.p}>As a customer, you must not:</p>
          <ul style={S.ul}>
            <li style={S.li}>Make fake or fraudulent bookings to harass or disrupt salon operations</li>
            <li style={S.li}>Use another person's account without their permission</li>
            <li style={S.li}>Attempt to hack, reverse-engineer, or disrupt the platform</li>
            <li style={S.li}>Post false, defamatory, or misleading reviews or content</li>
            <li style={S.li}>Use the platform to collect salon or customer data for unauthorized purposes</li>
            <li style={S.li}>Engage in any unlawful activity through the platform</li>
            <li style={S.li}>Harass, threaten, or abuse salon owners or platform staff</li>
          </ul>
          <p style={S.p}>Violation of these rules may result in immediate account suspension or permanent termination.</p>
        </Section>

        <Section title="9. Reviews & Ratings">
          <p style={S.p}>If GlowLoox offers a review feature, you agree that:</p>
          <ul style={S.ul}>
            <li style={S.li}>Reviews must be based on genuine, personal experiences</li>
            <li style={S.li}>Reviews must not contain offensive language, hate speech, or personal attacks</li>
            <li style={S.li}>Fake or incentivized reviews are strictly prohibited</li>
            <li style={S.li}>We reserve the right to remove reviews that violate these guidelines</li>
          </ul>
        </Section>

        <Section title="10. Intellectual Property">
          <p style={S.p}>All content on GlowLoox — including the logo, app design, code, and platform features — is owned by GlowLoox and protected by applicable intellectual property laws. You may not copy, reproduce, or distribute any part of our platform without written permission.</p>
        </Section>

        <Section title="11. Account Suspension & Termination">
          <p style={S.p}>GlowLoox reserves the right to suspend or terminate your account without prior notice if:</p>
          <ul style={S.ul}>
            <li style={S.li}>You violate these Terms or our Privacy Policy</li>
            <li style={S.li}>We detect fraudulent, abusive, or illegal activity</li>
            <li style={S.li}>You provide false information during registration</li>
            <li style={S.li}>You repeatedly fail to show up for confirmed bookings</li>
          </ul>
          <p style={S.p}>You may also close your account at any time by contacting support@mysalonbookings.com.</p>
        </Section>

        <Section title="12. Limitation of Liability">
          <p style={S.p}>To the maximum extent permitted by applicable Indian law, GlowLoox shall not be liable for:</p>
          <ul style={S.ul}>
            <li style={S.li}>Any indirect, incidental, or consequential damages arising from your use of the platform</li>
            <li style={S.li}>Loss of data, business, or revenue resulting from platform downtime or technical issues</li>
            <li style={S.li}>Any damages resulting from salon services, including injury, dissatisfaction, or property damage</li>
            <li style={S.li}>Unauthorized access to your account due to your failure to secure your credentials</li>
          </ul>
          <p style={S.p}>Our aggregate liability to you for any claim shall not exceed the amount (if any) you paid to GlowLoox in the 3 months preceding the claim.</p>
        </Section>

        <Section title="13. Dispute Resolution">
          <h3 style={S.h3}>13.1 With Salons</h3>
          <p style={S.p}>If you have a dispute with a salon (e.g., service quality, overcharging), please first contact the salon directly. If unresolved, you may escalate to GlowLoox support and we will mediate where possible.</p>

          <h3 style={S.h3}>13.2 With GlowLoox</h3>
          <p style={S.p}>For disputes with GlowLoox, please contact support@mysalonbookings.com. We will attempt to resolve the matter within 15 business days. If unresolved, disputes shall be subject to the jurisdiction of courts in India, governed by Indian law.</p>
        </Section>

        <Section title="14. Changes to These Terms">
          <p style={S.p}>We may update these Terms from time to time. Material changes will be communicated via in-app notification or email at least 7 days before taking effect. Continued use after the effective date means you accept the updated Terms.</p>
        </Section>

        <Section title="15. Contact Us">
          <p style={S.p}>
            <strong style={{ color: '#fff' }}>GlowLoox Support</strong><br />
            Email: <strong style={{ color: '#60a5fa' }}>support@mysalonbookings.com</strong><br />
            Platform: mysalonbookings.com<br />
            Response Time: Within 2 business days
          </p>
        </Section>
      </div>
    </div>
  );
}
