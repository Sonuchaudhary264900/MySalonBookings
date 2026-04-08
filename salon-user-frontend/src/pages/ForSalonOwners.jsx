import { Link } from "react-router-dom";
import SEOHead from "../components/SEOHead";

const FEATURES = [
  { icon: "📅", title: "Online Appointment Booking", desc: "Let customers book 24/7 from your listing page — no phone tag, no missed bookings." },
  { icon: "👥", title: "Staff & Schedule Management", desc: "Assign services to staff members, manage working hours, and block holidays instantly." },
  { icon: "📲", title: "Owner Android App", desc: "Manage your salon from anywhere with our dedicated Android app — view bookings, update availability, and more." },
  { icon: "🔔", title: "Instant Booking Notifications", desc: "Get real-time alerts for every new booking, cancellation, or customer message." },
  { icon: "📊", title: "Business Analytics", desc: "Track bookings, revenue, and top services with a simple dashboard built for salon owners." },
  { icon: "⭐", title: "Reviews & Ratings", desc: "Build trust with verified customer reviews visible directly on your salon profile." },
  { icon: "📍", title: "Appear in Local Searches", desc: "Your salon gets listed in city and near-me search results — driving new walk-in and online customers." },
  { icon: "💬", title: "Customer Database", desc: "Every booked customer is saved automatically — view booking history and build loyalty." },
];

const STEPS = [
  { num: "1", title: "Register Free", desc: "Create your salon profile in under 2 minutes — name, services, working hours, photos." },
  { num: "2", title: "Go Live Instantly", desc: "Your salon appears in local search results on MySalonBookings immediately after verification." },
  { num: "3", title: "Accept Bookings", desc: "Customers discover and book your services online. You get notified instantly." },
];

const FAQ = [
  { q: "Is MySalonBookings free for salon owners?", a: "Yes — listing your salon and accepting bookings is completely free. We offer optional premium plans for advanced features." },
  { q: "Do I need a smartphone or computer?", a: "Our owner Android app works on any Android smartphone. A basic internet connection is all you need." },
  { q: "How long does it take to set up?", a: "Most salon owners complete their profile in under 5 minutes. You can start accepting bookings the same day." },
  { q: "Can I manage multiple staff members?", a: "Yes — you can add staff, assign services to each, and manage individual schedules." },
  { q: "Is my salon visible in my city?", a: "Yes — once verified, your salon appears in searches for your city and nearby areas across India." },
  { q: "What types of salons can join?", a: "Any beauty business — hair salons, unisex salons, spas, nail studios, barber shops, beauty parlours, bridal studios and more." },
];

const faqSchema = {
  '@type': 'FAQPage',
  mainEntity: FAQ.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};

const softwareSchema = {
  '@type': 'SoftwareApplication',
  name: 'MySalonBookings — Salon Management App',
  operatingSystem: 'Android',
  applicationCategory: 'BusinessApplication',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  description: 'Free salon management app for Indian salon owners — online bookings, staff scheduling, customer database, and business analytics.',
};

export default function ForSalonOwners() {
  return (
    <>
      <SEOHead
        title="Salon Management Software India — Free Online Booking for Salons | MySalonBookings"
        description="Grow your salon with India's free salon management software. Accept online bookings, manage staff, track revenue — trusted by 500+ salons across every city in India."
        canonical="https://mysalonbookings.com/for-salon-owners"
        schema={[faqSchema, softwareSchema]}
      />

      <div style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: 'var(--t-text, #0f172a)' }}>

        {/* ── HERO ── */}
        <section style={{ background: 'linear-gradient(135deg,#3730a3 0%,#6366f1 45%,#7c3aed 100%)', padding: '72px 24px 80px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
            For Salon Owners
          </p>
          <h1 style={{ color: '#fff', fontSize: 'clamp(28px,5vw,48px)', fontWeight: 800, lineHeight: 1.15, maxWidth: 680, margin: '0 auto 20px' }}>
            India's Free Salon Management Software — Grow Your Business Online
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 'clamp(15px,2.5vw,18px)', maxWidth: 540, margin: '0 auto 36px', lineHeight: 1.6 }}>
            Join 500+ verified salons already using MySalonBookings to accept online bookings, manage staff, and attract new customers — completely free.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            <Link
              to="/register"
              style={{ background: '#fff', color: '#4f46e5', fontWeight: 700, fontSize: 16, padding: '14px 32px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
            >
              List My Salon — It's Free
            </Link>
            <a
              href="#how-it-works"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, fontSize: 16, padding: '14px 32px', borderRadius: 12, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.3)' }}
            >
              See How It Works
            </a>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 20 }}>
            No credit card required · No commission on bookings · Free forever
          </p>
        </section>

        {/* ── STATS BAR ── */}
        <section style={{ background: '#f8faff', borderBottom: '1px solid #e2e8f0', padding: '28px 24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '32px 56px', maxWidth: 900, margin: '0 auto' }}>
            {[['500+', 'Verified Salons'], ['25+', 'Cities Covered'], ['1,000+', 'Happy Customers'], ['4.9★', 'Average Rating']].map(([val, label]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#4f46e5', lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" style={{ padding: '64px 24px', maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(22px,3.5vw,32px)', fontWeight: 800, marginBottom: 48 }}>
            Start Getting Online Bookings in 3 Steps
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 24 }}>
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} style={{ background: 'var(--t-card,#fff)', border: '1px solid #e2e8f0', borderRadius: 16, padding: '28px 24px', position: 'relative' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18, marginBottom: 16 }}>{num}</div>
                <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section style={{ background: '#f8faff', padding: '64px 24px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', fontSize: 'clamp(22px,3.5vw,32px)', fontWeight: 800, marginBottom: 12 }}>
              Everything Your Salon Needs to Grow Online
            </h2>
            <p style={{ textAlign: 'center', color: '#64748b', fontSize: 16, marginBottom: 48, maxWidth: 540, margin: '0 auto 48px' }}>
              Built specifically for Indian salons — from single-chair parlours to multi-staff studios.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 20 }}>
              {FEATURES.map(({ icon, title, desc }) => (
                <div key={title} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px 20px' }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
                  <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{title}</h3>
                  <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING TEASER ── */}
        <section style={{ padding: '64px 24px', maxWidth: 780, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(22px,3.5vw,32px)', fontWeight: 800, marginBottom: 16 }}>
            Free to Start — Upgrade When You're Ready
          </h2>
          <p style={{ color: '#64748b', fontSize: 16, marginBottom: 36, lineHeight: 1.6 }}>
            List your salon and accept bookings for free — forever. Unlock advanced features when your business is ready to scale.
          </p>
          <Link
            to="/pricing"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 16, padding: '14px 36px', borderRadius: 12, textDecoration: 'none', display: 'inline-block' }}
          >
            View Pricing Plans
          </Link>
        </section>

        {/* ── FAQ ── */}
        <section style={{ background: '#f8faff', padding: '64px 24px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', fontSize: 'clamp(22px,3.5vw,32px)', fontWeight: 800, marginBottom: 48 }}>
              Frequently Asked Questions
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {FAQ.map(({ q, a }) => (
                <div key={q} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 24px' }}>
                  <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{q}</h3>
                  <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.65 }}>{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── BOTTOM CTA ── */}
        <section style={{ padding: '72px 24px', textAlign: 'center', background: 'linear-gradient(135deg,#3730a3 0%,#6366f1 100%)' }}>
          <h2 style={{ color: '#fff', fontSize: 'clamp(22px,4vw,36px)', fontWeight: 800, marginBottom: 16 }}>
            Ready to Grow Your Salon?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, marginBottom: 36, maxWidth: 480, margin: '0 auto 36px' }}>
            Join 500+ salons across India already using MySalonBookings — takes less than 5 minutes to get started.
          </p>
          <Link
            to="/register"
            style={{ background: '#fff', color: '#4f46e5', fontWeight: 700, fontSize: 16, padding: '14px 36px', borderRadius: 12, textDecoration: 'none', display: 'inline-block', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
          >
            List My Salon Free — Get Started
          </Link>
        </section>

      </div>
    </>
  );
}
