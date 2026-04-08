import { Link } from "react-router-dom";
import SEOHead from "../components/SEOHead";

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    highlight: false,
    badge: null,
    features: [
      "Salon profile listing",
      "Up to 30 bookings/month",
      "Basic service catalog",
      "Customer booking notifications",
      "Appear in city search results",
      "MySalonBookings owner app",
    ],
    cta: "Get Started Free",
    ctaTo: "/register",
  },
  {
    name: "Growth",
    price: "₹499",
    period: "/month",
    highlight: true,
    badge: "Most Popular",
    features: [
      "Everything in Free",
      "Unlimited bookings",
      "Staff management",
      "Customer SMS reminders",
      "Priority listing in search",
      "Business analytics dashboard",
      "Customer database & history",
    ],
    cta: "Start Growth Plan",
    ctaTo: "/register",
  },
  {
    name: "Pro",
    price: "₹999",
    period: "/month",
    highlight: false,
    badge: null,
    features: [
      "Everything in Growth",
      "Multi-branch management",
      "Custom booking page URL",
      "Advanced analytics & reports",
      "Bulk customer notifications",
      "Dedicated support",
      "Featured salon badge",
    ],
    cta: "Start Pro Plan",
    ctaTo: "/register",
  },
];

const FAQ = [
  { q: "Is there really a free plan?", a: "Yes — the Free plan lets you list your salon and accept up to 30 bookings per month at no cost, forever. No credit card required." },
  { q: "Can I switch plans anytime?", a: "Yes — upgrade or downgrade anytime. Changes take effect from your next billing cycle." },
  { q: "Are there any booking commissions?", a: "No. MySalonBookings charges zero commission on bookings. You keep 100% of your service revenue." },
  { q: "Is there an annual discount?", a: "Yes — pay annually and get 2 months free (equivalent to 17% off). Contact us to activate." },
  { q: "What payment methods are accepted?", a: "UPI, debit/credit card, net banking — all major Indian payment methods via Razorpay." },
];

const faqSchema = {
  '@type': 'FAQPage',
  mainEntity: FAQ.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};

export default function Pricing() {
  return (
    <>
      <SEOHead
        title="Salon Booking Software Pricing India — Free Plan Available | MySalonBookings"
        description="Simple, transparent pricing for Indian salon owners. Free plan available — no commissions, no setup fees. Upgrade to Growth (₹499/mo) or Pro (₹999/mo) anytime."
        canonical="https://mysalonbookings.com/pricing"
        schema={faqSchema}
      />

      <div style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>

        {/* ── HERO ── */}
        <section style={{ padding: '64px 24px 48px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(26px,5vw,44px)', fontWeight: 800, marginBottom: 16, lineHeight: 1.2 }}>
            Simple Pricing for Every Salon in India
          </h1>
          <p style={{ color: '#64748b', fontSize: 'clamp(15px,2.5vw,18px)', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
            Start free — no credit card, no commission on bookings. Upgrade only when your business needs more.
          </p>
        </section>

        {/* ── PLAN CARDS ── */}
        <section style={{ padding: '0 24px 64px', maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 24, alignItems: 'start' }}>
            {PLANS.map(({ name, price, period, highlight, badge, features, cta, ctaTo }) => (
              <div
                key={name}
                style={{
                  background: highlight ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--t-card,#fff)',
                  border: highlight ? 'none' : '1px solid #e2e8f0',
                  borderRadius: 20,
                  padding: '32px 28px',
                  position: 'relative',
                  boxShadow: highlight ? '0 20px 60px rgba(99,102,241,0.3)' : '0 2px 12px rgba(0,0,0,0.05)',
                  color: highlight ? '#fff' : 'inherit',
                }}
              >
                {badge && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#f59e0b', color: '#fff', fontWeight: 700, fontSize: 11, padding: '4px 14px', borderRadius: 20, whiteSpace: 'nowrap', letterSpacing: '0.05em' }}>
                    {badge}
                  </div>
                )}
                <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: highlight ? 0.85 : 1, color: highlight ? '#fff' : '#6366f1', marginBottom: 12 }}>{name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 40, fontWeight: 900, lineHeight: 1 }}>{price}</span>
                  <span style={{ fontSize: 14, opacity: 0.75 }}>{period}</span>
                </div>
                <div style={{ height: 1, background: highlight ? 'rgba(255,255,255,0.2)' : '#f1f5f9', margin: '20px 0' }} />
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, opacity: highlight ? 0.95 : 1, color: highlight ? '#fff' : '#334155' }}>
                      <span style={{ color: highlight ? '#a5f3fc' : '#6366f1', fontWeight: 700, flexShrink: 0 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={ctaTo}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '13px 0',
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 15,
                    textDecoration: 'none',
                    background: highlight ? '#fff' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    color: highlight ? '#4f46e5' : '#fff',
                  }}
                >
                  {cta}
                </Link>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, marginTop: 24 }}>
            All plans include zero booking commissions · Cancel anytime
          </p>
        </section>

        {/* ── FAQ ── */}
        <section style={{ background: '#f8faff', padding: '64px 24px' }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', fontSize: 'clamp(20px,3vw,28px)', fontWeight: 800, marginBottom: 40 }}>
              Pricing FAQs
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {FAQ.map(({ q, a }) => (
                <div key={q} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 22px' }}>
                  <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{q}</h3>
                  <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.65 }}>{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── BOTTOM CTA ── */}
        <section style={{ padding: '64px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(20px,3.5vw,32px)', fontWeight: 800, marginBottom: 16 }}>
            Start Free Today — No Credit Card Needed
          </h2>
          <p style={{ color: '#64748b', fontSize: 16, marginBottom: 32, maxWidth: 440, margin: '0 auto 32px', lineHeight: 1.6 }}>
            Join 500+ salons across India growing their business with MySalonBookings.
          </p>
          <Link
            to="/register"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 16, padding: '14px 36px', borderRadius: 12, textDecoration: 'none', display: 'inline-block' }}
          >
            List My Salon Free
          </Link>
        </section>

      </div>
    </>
  );
}
