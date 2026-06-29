import React from 'react';

const S = {
  page:    { background: '#09090f', minHeight: '100vh', color: '#e2e8f0', fontFamily: "'Inter', sans-serif", padding: '48px 20px 80px' },
  wrap:    { maxWidth: 820, margin: '0 auto' },
  badge:   { display: 'inline-block', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.35)', borderRadius: 8, padding: '4px 12px', fontSize: 12, color: '#a78bfa', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 },
  h1:      { fontSize: 32, fontWeight: 900, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.03em' },
  meta:    { color: 'rgba(255,255,255,0.35)', fontSize: 13, marginBottom: 40 },
  h2:      { fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.02em' },
  h3:      { fontSize: 15, fontWeight: 700, color: '#a78bfa', margin: '20px 0 8px' },
  p:       { color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.8, margin: '0 0 14px' },
  ul:      { color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.8, paddingLeft: 20, margin: '0 0 14px' },
  li:      { marginBottom: 6 },
  card:    { background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px 28px', marginBottom: 28 },
  highlight: { background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 12, padding: '16px 20px', marginBottom: 24 },
  warning: { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 },
  danger:  { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 },
};

const Section = ({ title, children }) => (
  <div style={S.card}>
    <h2 style={S.h2}>{title}</h2>
    {children}
  </div>
);

export default function OwnerTerms() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <span style={S.badge}>Legal Document — Salon Owners</span>
        <h1 style={S.h1}>Terms & Conditions for Salon Owners</h1>
        <p style={S.meta}>GlowLoox &nbsp;·&nbsp; Effective Date: March 26, 2025 &nbsp;·&nbsp; Last Updated: March 26, 2025</p>

        <div style={S.highlight}>
          <p style={{ ...S.p, margin: 0, color: 'rgba(255,255,255,0.8)' }}>
            These Terms and Conditions ("Terms") govern your use of the GlowLoox platform as a <strong style={{ color: '#fff' }}>salon owner or business operator</strong>. By registering as an owner, completing the onboarding process, or using the platform, you agree to be bound by these Terms. Please read them carefully before proceeding.
          </p>
        </div>

        <Section title="1. Platform Overview">
          <p style={S.p}>GlowLoox ("we", "us", "the Platform") provides a SaaS (Software as a Service) platform that enables salon owners to:</p>
          <ul style={S.ul}>
            <li style={S.li}>List their salon and services on the GlowLoox marketplace</li>
            <li style={S.li}>Receive and manage customer bookings in real-time</li>
            <li style={S.li}>Access a dashboard for business analytics and booking management</li>
            <li style={S.li}>Communicate with customers regarding their appointments</li>
          </ul>
          <p style={S.p}>We provide the technology platform. You provide the salon services. The business relationship with your customers is yours — GlowLoox facilitates, not controls, that relationship.</p>
        </Section>

        <Section title="2. Account Registration & Approval">
          <h3 style={S.h3}>2.1 Registration Requirements</h3>
          <p style={S.p}>To register as a salon owner on GlowLoox, you must:</p>
          <ul style={S.ul}>
            <li style={S.li}>Provide accurate and truthful information about yourself and your salon</li>
            <li style={S.li}>Be the legal owner, authorized operator, or designated manager of the salon</li>
            <li style={S.li}>Be at least 18 years of age</li>
            <li style={S.li}>Have a valid phone number and email address</li>
          </ul>

          <h3 style={S.h3}>2.2 Approval Process</h3>
          <p style={S.p}>All new owner accounts are subject to review and approval by the GlowLoox team. We reserve the right to approve or reject any application at our discretion. Reasons for rejection may include incomplete information, suspected fraud, or violation of our guidelines. You will be notified of the approval status.</p>

          <h3 style={S.h3}>2.3 Account Security</h3>
          <p style={S.p}>You are solely responsible for maintaining the confidentiality of your account credentials and all activity that occurs under your account. Immediately notify us at glowloox@gmail.com if you suspect unauthorized access.</p>
        </Section>

        <Section title="3. Free Trial">
          <p style={S.p}>GlowLoox offers a <strong style={{ color: '#fff' }}>30-day free trial</strong> to all new salon owner accounts. During the trial period:</p>
          <ul style={S.ul}>
            <li style={S.li}>You have full access to all platform features at no cost</li>
            <li style={S.li}>No payment or credit card is required to start the trial</li>
            <li style={S.li}>You may optionally pre-select a paid plan — it will activate automatically when the trial ends</li>
            <li style={S.li}>If no plan is selected before trial expiry, your access to platform features will be restricted until a plan is activated and payment is completed</li>
            <li style={S.li}>The free trial is available once per business entity — creating multiple accounts to gain additional trial periods is prohibited</li>
          </ul>
        </Section>

        <Section title="4. Subscription Plans & Pricing">
          <h3 style={S.h3}>4.1 Available Plans</h3>
          <p style={S.p}>After your free trial, you must subscribe to one of the following paid plans to continue using GlowLoox:</p>

          <div style={{ background: 'rgba(124,58,237,0.08)', borderRadius: 12, padding: '16px 20px', marginBottom: 14, border: '1px solid rgba(124,58,237,0.2)' }}>
            <p style={{ ...S.p, margin: 0 }}>
              <strong style={{ color: '#a78bfa', fontSize: 15 }}>Starter Plan — ₹150/month</strong><br />
              Unlimited bookings per month for a single flat fee. Ideal for salons with consistent or high booking volume. Billed at the start of each 30-day billing cycle.
            </p>
          </div>

          <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: 12, padding: '16px 20px', marginBottom: 14, border: '1px solid rgba(16,185,129,0.2)' }}>
            <p style={{ ...S.p, margin: 0 }}>
              <strong style={{ color: '#34d399', fontSize: 15 }}>Per Booking Plan — ₹1/booking</strong><br />
              Pay only for bookings made through the platform. Billed at the end of each 30-day billing cycle based on actual booking count. No minimum charge.
            </p>
          </div>

          <h3 style={S.h3}>4.2 Billing Cycle</h3>
          <ul style={S.ul}>
            <li style={S.li}>Billing cycles are 30 days from the date your plan activates</li>
            <li style={S.li}><strong>Starter Plan:</strong> Invoice is generated at the start of each cycle; payment is due immediately</li>
            <li style={S.li}><strong>Per Booking Plan:</strong> Invoice is generated at the end of each cycle based on the total bookings that month; payment is due upon invoice generation</li>
            <li style={S.li}>Invoices and payment history are accessible from your Billing dashboard</li>
          </ul>

          <h3 style={S.h3}>4.3 Plan Switching</h3>
          <ul style={S.ul}>
            <li style={S.li}>You may request to switch your plan once per billing cycle (anti-abuse policy)</li>
            <li style={S.li}>A plan switch request is deferred — it takes effect at the start of your next billing cycle, not immediately</li>
            <li style={S.li}>Once a switch is requested, it cannot be changed until the new cycle begins</li>
            <li style={S.li}>During your free trial, you may freely change your pre-selected plan at any time</li>
          </ul>

          <h3 style={S.h3}>4.4 Price Changes</h3>
          <p style={S.p}>We reserve the right to change subscription pricing with at least <strong style={{ color: '#fff' }}>30 days' advance notice</strong> via email or in-app notification. Continued use of the platform after the effective date of a price change constitutes your acceptance of the new pricing.</p>
        </Section>

        <Section title="5. Payment Terms">
          <h3 style={S.h3}>5.1 Payment Processing</h3>
          <p style={S.p}>All subscription payments are processed by <strong style={{ color: '#fff' }}>Razorpay Software Private Limited</strong>, an RBI-licensed payment aggregator. Razorpay's Terms of Service apply to all payment transactions made through their gateway.</p>

          <h3 style={S.h3}>5.2 Payment Obligation</h3>
          <p style={S.p}>You are responsible for paying all fees associated with your subscription plan on time. Failure to pay within the due period will result in:</p>
          <ul style={S.ul}>
            <li style={S.li}><strong>Overdue Status</strong> – your account is flagged as payment overdue</li>
            <li style={S.li}><strong>Feature Restriction</strong> – access to booking management features may be restricted</li>
            <li style={S.li}><strong>Potential Suspension</strong> – persistent non-payment may result in account suspension</li>
          </ul>

          <h3 style={S.h3}>5.3 Failed Payments</h3>
          <p style={S.p}>If a payment fails (insufficient funds, expired card, etc.), you will be notified and given a grace period to update your payment method and complete the payment. GlowLoox is not responsible for payment failures caused by Razorpay, your bank, or internet connectivity issues.</p>

          <h3 style={S.h3}>5.4 Refund Policy</h3>
          <div style={S.danger}>
            <p style={{ ...S.p, margin: 0, color: 'rgba(255,255,255,0.8)' }}>
              <strong style={{ color: '#f87171' }}>No Refunds Policy:</strong> All subscription payments are <strong style={{ color: '#fff' }}>non-refundable</strong> once the billing cycle has been activated and payment has been processed. This applies to both the Starter and Per Booking plans. Partial refunds for unused portions of a billing cycle are not provided.
            </p>
          </div>
          <p style={S.p}>Exceptions may be considered on a case-by-case basis for technical failures or billing errors caused by GlowLoox. Contact glowloox@gmail.com within 7 days of the disputed charge.</p>

          <h3 style={S.h3}>5.5 Taxes</h3>
          <p style={S.p}>Subscription fees are exclusive of applicable taxes. Where required by Indian law (e.g., GST), applicable taxes will be added to your invoice. You are responsible for any local taxes applicable to your business.</p>
        </Section>

        <Section title="6. Owner Responsibilities">
          <h3 style={S.h3}>6.1 Accurate Business Information</h3>
          <ul style={S.ul}>
            <li style={S.li}>Maintain accurate, up-to-date information about your salon, services, and pricing on the platform</li>
            <li style={S.li}>Ensure your listed operating hours reflect your actual availability</li>
            <li style={S.li}>Update or remove services that are no longer offered</li>
            <li style={S.li}>Do not list services, prices, or promotions that are misleading or deceptive</li>
          </ul>

          <h3 style={S.h3}>6.2 Booking Management</h3>
          <ul style={S.ul}>
            <li style={S.li}>Respond to booking requests in a timely manner</li>
            <li style={S.li}>Honor confirmed bookings — repeated cancellations by you may result in account suspension</li>
            <li style={S.li}>Notify customers promptly if you cannot fulfill a confirmed booking</li>
            <li style={S.li}>Provide the services exactly as listed — do not substitute services without customer consent</li>
          </ul>

          <h3 style={S.h3}>6.3 Customer Data Handling</h3>
          <p style={S.p}>You will have access to customer names and phone numbers for booking fulfillment purposes. You must:</p>
          <ul style={S.ul}>
            <li style={S.li}>Use customer data <strong style={{ color: '#fff' }}>only</strong> to manage bookings made through GlowLoox</li>
            <li style={S.li}>Not contact customers for unsolicited marketing without their explicit consent</li>
            <li style={S.li}>Not sell, share, or transfer customer data to any third party</li>
            <li style={S.li}>Comply with applicable Indian data protection laws when handling customer information</li>
            <li style={S.li}>Delete customer data upon account closure or upon request from GlowLoox</li>
          </ul>

          <h3 style={S.h3}>6.4 Legal Compliance</h3>
          <p style={S.p}>You are solely responsible for operating your salon in compliance with all applicable laws, including:</p>
          <ul style={S.ul}>
            <li style={S.li}>Local business licensing and permits</li>
            <li style={S.li}>Health and safety regulations</li>
            <li style={S.li}>GST registration and tax filing obligations</li>
            <li style={S.li}>Labor laws applicable to your employees</li>
            <li style={S.li}>Consumer protection laws</li>
          </ul>
        </Section>

        <Section title="7. Prohibited Conduct">
          <p style={S.p}>As a salon owner on GlowLoox, you must not:</p>
          <ul style={S.ul}>
            <li style={S.li}>Create multiple accounts to abuse the free trial system</li>
            <li style={S.li}>List a salon or services that do not genuinely exist or that you do not operate</li>
            <li style={S.li}>Manipulate reviews or ratings (fake reviews, incentivized ratings)</li>
            <li style={S.li}>Use the platform to collect customer data for purposes outside of booking fulfillment</li>
            <li style={S.li}>Engage in misleading, deceptive, or fraudulent practices toward customers</li>
            <li style={S.li}>Attempt to circumvent our platform by directing customers to book outside GlowLoox after initial discovery</li>
            <li style={S.li}>Reverse-engineer, scrape, or copy any part of our platform or codebase</li>
            <li style={S.li}>Upload malicious content, spam, or inappropriate images to the platform</li>
            <li style={S.li}>Harass or threaten GlowLoox staff or other platform users</li>
          </ul>
        </Section>

        <Section title="8. Platform Dependency Disclaimer">
          <div style={S.warning}>
            <p style={{ ...S.p, margin: 0, color: 'rgba(255,255,255,0.8)' }}>
              <strong style={{ color: '#fde68a' }}>Important Notice:</strong> GlowLoox is a third-party platform. We cannot guarantee uninterrupted service availability. You acknowledge that your business operations should not be <em>exclusively</em> dependent on this platform.
            </p>
          </div>
          <ul style={S.ul}>
            <li style={S.li}>We strive for high uptime but cannot guarantee 100% availability at all times</li>
            <li style={S.li}>Planned maintenance will be communicated in advance where possible</li>
            <li style={S.li}>We are not liable for any business losses arising from platform downtime, technical issues, or service interruptions</li>
            <li style={S.li}>We recommend maintaining alternative booking methods (e.g., phone bookings) as a backup</li>
          </ul>
        </Section>

        <Section title="9. Intellectual Property">
          <p style={S.p}>All GlowLoox platform content, features, branding, and code are the intellectual property of GlowLoox. By listing on our platform, you grant GlowLoox a non-exclusive, royalty-free license to display your salon name, logo, photos, service descriptions, and other content on the platform for promotional purposes.</p>
          <p style={S.p}>You retain ownership of all content you upload. You represent that you have the right to use and publish any content you submit (photos, business information, etc.).</p>
        </Section>

        <Section title="10. Account Suspension & Termination">
          <h3 style={S.h3}>10.1 Termination by GlowLoox</h3>
          <p style={S.p}>We reserve the right to suspend or permanently terminate your account with or without notice if:</p>
          <ul style={S.ul}>
            <li style={S.li}>You violate these Terms or our Privacy Policy</li>
            <li style={S.li}>You fail to pay outstanding subscription fees after reasonable notice</li>
            <li style={S.li}>We detect fraudulent, abusive, or illegal activity on your account</li>
            <li style={S.li}>Your salon receives consistent negative feedback indicating harmful practices toward customers</li>
            <li style={S.li}>You provide false information during registration or ongoing operation</li>
          </ul>

          <h3 style={S.h3}>10.2 Termination by You</h3>
          <p style={S.p}>You may cancel your account at any time by contacting glowloox@gmail.com. Upon cancellation:</p>
          <ul style={S.ul}>
            <li style={S.li}>Your account access will remain active until the end of the current billing cycle (no partial refunds for unused days)</li>
            <li style={S.li}>Your salon listing will be removed from customer-facing pages within 24–48 hours of confirmed cancellation</li>
            <li style={S.li}>Booking records will be retained as required by law</li>
            <li style={S.li}>You remain liable for any outstanding payments at the time of cancellation</li>
          </ul>

          <h3 style={S.h3}>10.3 Effect of Termination</h3>
          <p style={S.p}>Upon termination, your right to use the platform immediately ends. You must cease using all GlowLoox tools, APIs, and data. We will process any pending customer bookings that were confirmed prior to termination in good faith.</p>
        </Section>

        <Section title="11. Limitation of Liability">
          <p style={S.p}>To the fullest extent permitted by Indian law, GlowLoox shall not be liable for:</p>
          <ul style={S.ul}>
            <li style={S.li}>Loss of business, revenue, or profits due to platform unavailability or technical issues</li>
            <li style={S.li}>Damages arising from customer disputes or chargebacks</li>
            <li style={S.li}>Any indirect, incidental, consequential, or punitive damages</li>
            <li style={S.li}>Actions of customers using our platform</li>
            <li style={S.li}>Third-party service failures (Razorpay downtime, Firebase notification delays, etc.)</li>
          </ul>
          <p style={S.p}>Our maximum aggregate liability to you for any claim shall not exceed the total subscription fees paid by you to GlowLoox in the 3 months preceding the claim.</p>
        </Section>

        <Section title="12. Indemnification">
          <p style={S.p}>You agree to indemnify, defend, and hold harmless GlowLoox, its founders, employees, and agents from any claims, losses, damages, liabilities, and expenses (including legal fees) arising from:</p>
          <ul style={S.ul}>
            <li style={S.li}>Your violation of these Terms</li>
            <li style={S.li}>Your salon services causing harm, injury, or dissatisfaction to customers</li>
            <li style={S.li}>Your mishandling of customer personal data</li>
            <li style={S.li}>Your violation of applicable laws or regulations</li>
            <li style={S.li}>Any third-party claims arising from your use of the GlowLoox platform</li>
          </ul>
        </Section>

        <Section title="13. Dispute Resolution">
          <h3 style={S.h3}>13.1 Internal Resolution</h3>
          <p style={S.p}>In case of any dispute, please contact us at glowloox@gmail.com. We will attempt to resolve all disputes within 15 business days through good-faith negotiation.</p>

          <h3 style={S.h3}>13.2 Governing Law</h3>
          <p style={S.p}>These Terms shall be governed by and construed in accordance with the laws of <strong style={{ color: '#fff' }}>India</strong>. Any disputes not resolved through mutual agreement shall be submitted to the exclusive jurisdiction of the competent courts in India.</p>

          <h3 style={S.h3}>13.3 Billing Disputes</h3>
          <p style={S.p}>For billing disputes, you must raise the issue within <strong style={{ color: '#fff' }}>7 days</strong> of the invoice date. Claims raised after this period may not be eligible for consideration. Razorpay payment disputes are subject to Razorpay's dispute resolution process.</p>
        </Section>

        <Section title="14. Changes to These Terms">
          <p style={S.p}>We may update these Terms to reflect changes in our services, pricing, or legal requirements. Material changes will be communicated via:</p>
          <ul style={S.ul}>
            <li style={S.li}>Email notification to your registered email address</li>
            <li style={S.li}>In-app notification on the GlowLoox dashboard</li>
          </ul>
          <p style={S.p}>Changes will take effect at least <strong style={{ color: '#fff' }}>14 days</strong> after notification. Continued use of the platform after the effective date constitutes your acceptance of the revised Terms. If you do not agree to the changes, you must close your account before the effective date.</p>
        </Section>

        <Section title="15. Contact & Support">
          <p style={S.p}>For any questions, billing issues, account support, or legal inquiries:</p>
          <p style={S.p}>
            <strong style={{ color: '#fff' }}>GlowLoox Business Support</strong><br />
            Email: <strong style={{ color: '#a78bfa' }}>glowloox@gmail.com</strong><br />
            Platform: glowloox.com/dashboard<br />
            Android App: GlowLoox (com.mysalonbookings.owner)<br />
            Response Time: Within 2 business days
          </p>
          <p style={S.p}>By registering as a salon owner on GlowLoox, you confirm that you have read, understood, and agreed to these Terms and Conditions in their entirety.</p>
        </Section>
      </div>
    </div>
  );
}
