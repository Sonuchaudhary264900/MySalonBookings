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

export default function CustomerRefundPolicy() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <span style={S.badge}>Legal Document</span>
        <h1 style={S.h1}>Cancellation & Refund Policy</h1>
        <p style={S.meta}>GlowLoox &nbsp;·&nbsp; Effective Date: June 10, 2026 &nbsp;·&nbsp; Last Updated: June 10, 2026</p>

        <div style={S.highlight}>
          <p style={{ ...S.p, margin: 0, color: 'rgba(255,255,255,0.8)' }}>
            This policy explains how appointment cancellations, no-shows, and any prepaid amounts are handled when you book a salon through GlowLoox. It should be read together with our <strong style={{ color: '#fff' }}>Terms & Conditions</strong>.
          </p>
        </div>

        <Section title="1. How Bookings Are Paid For">
          <p style={S.p}>Most appointments booked through GlowLoox are <strong style={{ color: '#fff' }}>paid directly to the salon</strong> at the time of your visit (cash, card, or UPI at the salon's counter). GlowLoox does not charge you for making a booking.</p>
          <p style={S.p}>If a salon enables <strong style={{ color: '#fff' }}>online prepayment or an advance/booking fee</strong> through GlowLoox, this will be clearly shown before you confirm the appointment, and the rules in Section 3 (Prepaid Bookings) will apply to that amount.</p>
        </Section>

        <Section title="2. Cancelling an Appointment">
          <h3 style={S.h3}>2.1 Cancelling as a Customer</h3>
          <p style={S.p}>You can cancel a confirmed booking from the "My Bookings" section of the app or website, subject to the salon's cancellation cutoff window shown at the time of booking (typically a minimum number of hours before your appointment).</p>
          <ul style={S.ul}>
            <li style={S.li}>Cancelling before the cutoff window is free and does not affect your account standing.</li>
            <li style={S.li}>Cancelling after the cutoff, or not arriving for your appointment ("no-show"), may be recorded against your account and repeated occurrences may lead to restrictions as described in our Terms & Conditions.</li>
            <li style={S.li}>If the salon charged you a prepaid/advance amount for the booking, see Section 3 for how late cancellations and no-shows affect refunds.</li>
          </ul>

          <h3 style={S.h3}>2.2 Cancelling by the Salon</h3>
          <p style={S.p}>Occasionally, a salon may need to cancel or reschedule your appointment (e.g., staff unavailability, closure). In this case:</p>
          <ul style={S.ul}>
            <li style={S.li}>You will be notified as soon as possible via the app/push notification.</li>
            <li style={S.li}>Any prepaid amount for that booking will be refunded in full — see Section 3.2.</li>
            <li style={S.li}>You are free to rebook with the same salon at a different time, or with another salon.</li>
          </ul>
        </Section>

        <Section title="3. Prepaid Bookings (Where Applicable)">
          <p style={S.p}>For salons that accept an online advance/booking fee via Razorpay, the following refund rules apply to that prepaid amount:</p>

          <h3 style={S.h3}>3.1 Customer-Initiated Cancellation</h3>
          <ul style={S.ul}>
            <li style={S.li}><strong style={{ color: '#fff' }}>Before the salon's cancellation cutoff:</strong> full refund of the prepaid amount, minus any payment-gateway fee that Razorpay does not return to us.</li>
            <li style={S.li}><strong style={{ color: '#fff' }}>After the cutoff or no-show:</strong> the prepaid amount may be forfeited to the salon as a cancellation fee, as disclosed at the time of booking.</li>
          </ul>

          <h3 style={S.h3}>3.2 Salon-Initiated Cancellation</h3>
          <p style={S.p}>If the salon cancels, declines, or fails to honor a confirmed prepaid booking, you will receive a <strong style={{ color: '#fff' }}>100% refund</strong> of the prepaid amount, including any gateway fees.</p>

          <h3 style={S.h3}>3.3 Refund Timeline</h3>
          <p style={S.p}>Approved refunds are initiated within <strong style={{ color: '#fff' }}>2 business days</strong> of approval and are credited back to your original payment method by Razorpay within <strong style={{ color: '#fff' }}>5–7 business days</strong>, depending on your bank.</p>

          <h3 style={S.h3}>3.4 How to Request a Refund</h3>
          <p style={S.p}>If you believe you are owed a refund that hasn't been processed automatically, contact us at <strong style={{ color: '#60a5fa' }}>support@mysalonbookings.com</strong> with your booking ID. We will review and respond within 2 business days.</p>
        </Section>

        <Section title="4. Service Quality Issues">
          <p style={S.p}>GlowLoox is a booking platform — the salon service itself is delivered by the independent salon. If you're unhappy with the quality of a service you received, please raise it directly with the salon first.</p>
          <p style={S.p}>If the salon is unresponsive, you can report the issue through the <strong style={{ color: '#fff' }}>Help & Feedback</strong> section of the app, and we will mediate where possible. Refunds for service-quality complaints are at the salon's discretion, except where Section 3.2 (salon-initiated cancellation) applies.</p>
        </Section>

        <Section title="5. Non-Refundable Items">
          <ul style={S.ul}>
            <li style={S.li}>Payment-gateway transaction fees retained by Razorpay are generally non-refundable.</li>
            <li style={S.li}>Promotional discounts, coupon codes, or credits used on a cancelled booking are forfeited and not reissued, unless the cancellation was salon-initiated.</li>
          </ul>
        </Section>

        <div style={S.warning}>
          <p style={{ ...S.p, margin: 0, color: 'rgba(255,255,255,0.8)' }}>
            <strong style={{ color: '#fde68a' }}>Note:</strong> Individual salons may publish their own, more specific cancellation terms (e.g., a longer cutoff window or a different cancellation fee). Where a salon's stated policy is stricter than this page, the salon's policy — as shown to you at the time of booking — applies.
          </p>
        </div>

        <Section title="6. Salon Owner Subscription Refunds">
          <p style={S.p}>This page covers refunds for <strong style={{ color: '#fff' }}>customer bookings</strong>. If you are a salon owner with questions about subscription billing or refunds for your GlowLoox business plan, please see Section 5.4 of our <a href="/legal/owner-terms" style={{ color: '#60a5fa' }}>Owner Terms & Conditions</a>.</p>
        </Section>

        <Section title="7. Contact Us">
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
