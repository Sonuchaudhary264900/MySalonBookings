import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LocateFixed, Search, X } from "lucide-react";

/* ── CSS ─────────────────────────────────────────────────────────── */
const LANDING_CSS = `
  @keyframes cu-orb1 {
    0%,100%{transform:translate(0,0) scale(1);}
    40%{transform:translate(60px,-50px) scale(1.1);}
    70%{transform:translate(-30px,30px) scale(0.93);}
  }
  @keyframes cu-orb2 {
    0%,100%{transform:translate(0,0) scale(1);}
    35%{transform:translate(-60px,45px) scale(1.08);}
    65%{transform:translate(45px,-25px) scale(0.95);}
  }
  @keyframes cu-fadeup {
    from{opacity:0;transform:translateY(28px);}
    to{opacity:1;transform:translateY(0);}
  }
  @keyframes cu-shimmer {
    0%{background-position:200% center;}
    100%{background-position:-200% center;}
  }
  @keyframes cu-pulse-dot {
    0%,100%{opacity:1;transform:scale(1);}
    50%{opacity:.5;transform:scale(1.5);}
  }
  @keyframes cu-scan {
    0%{top:-2px;} 100%{top:100%;}
  }
  .cu-orb1{animation:cu-orb1 18s ease-in-out infinite;}
  .cu-orb2{animation:cu-orb2 22s ease-in-out infinite;}
  .cu-fu1{animation:cu-fadeup .7s .0s ease both;}
  .cu-fu2{animation:cu-fadeup .7s .1s ease both;}
  .cu-fu3{animation:cu-fadeup .7s .2s ease both;}
  .cu-fu4{animation:cu-fadeup .7s .32s ease both;}
  .cu-fu5{animation:cu-fadeup .7s .44s ease both;}
  .cu-shimmer{
    background:linear-gradient(90deg,#c4b5fd,#818cf8,#67e8f9,#c4b5fd);
    background-size:300% auto;
    -webkit-background-clip:text;
    -webkit-text-fill-color:transparent;
    background-clip:text;
    animation:cu-shimmer 6s linear infinite;
  }
  .cu-pulse-dot{animation:cu-pulse-dot 2s ease-in-out infinite;}
  .cu-feat{transition:transform .28s ease,box-shadow .28s ease,border-color .28s ease;}
  .cu-feat:hover{transform:translateY(-6px);border-color:rgba(139,92,246,0.45)!important;box-shadow:0 20px 50px rgba(139,92,246,0.18);}
  .cu-step{transition:transform .28s ease,box-shadow .28s ease;}
  .cu-step:hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(0,0,0,0.4)!important;}
  .cu-review{transition:transform .28s ease,border-color .28s ease;}
  .cu-review:hover{transform:translateY(-4px);border-color:rgba(139,92,246,0.35)!important;}
  .cu-btn-p{transition:transform .2s ease,box-shadow .2s ease;}
  .cu-btn-p:hover{transform:scale(1.04);box-shadow:0 0 44px rgba(99,102,241,0.7)!important;}
  .cu-btn-s{transition:background .2s ease,transform .2s ease,border-color .2s ease;}
  .cu-btn-s:hover{background:rgba(255,255,255,0.1)!important;transform:scale(1.02);border-color:rgba(255,255,255,0.25)!important;}
  .cu-link{transition:color .18s ease;}
  .cu-link:hover{color:#a78bfa!important;}
  .cu-search-focused{border-color:rgba(99,102,241,0.55)!important;box-shadow:0 0 0 3px rgba(99,102,241,0.12),0 0 24px rgba(99,102,241,0.15)!important;background:rgba(255,255,255,0.07)!important;}
`;

/* ── Data ──────────────────────────────────────────────────────── */
const FEATURES_DATA = [
  { icon:'📍', color:'#6ee7b7', bg:'rgba(16,185,129,0.15)',  title:'Salons Near You',       desc:'Instantly see top-rated salons in your area. No sign-up needed to browse — just open and explore.' },
  { icon:'⚡', color:'#818cf8', bg:'rgba(99,102,241,0.15)',  title:'Book in Seconds',        desc:'Pick a service, choose your time slot, and confirm your booking in under 30 seconds. No calls.' },
  { icon:'🔔', color:'#fcd34d', bg:'rgba(245,158,11,0.15)',  title:'Instant Confirmation',   desc:'Get a booking confirmation the moment the salon accepts. No waiting, no uncertainty.' },
  { icon:'⭐', color:'#f9a8d4', bg:'rgba(236,72,153,0.15)',  title:'Verified Reviews',       desc:'Real ratings from real customers. Find the best-reviewed salons and book with confidence.' },
  { icon:'❤️', color:'#a78bfa', bg:'rgba(139,92,246,0.15)', title:'Save Favourites',        desc:'Save your go-to salons and rebook with a single tap. Your history is always there.' },
  { icon:'📲', color:'#67e8f9', bg:'rgba(6,182,212,0.15)',   title:'QR & Direct Links',     desc:'Scan a salon\'s QR code or tap a shared link — land straight on their booking page.' },
];

const REVIEWS = [
  { name:'Ananya Sharma', city:'Mumbai', rating:5, text:'Found a great salon 500m from home in literally 10 seconds. Booked, confirmed, done. This app is magic.' },
  { name:'Rohan Mehta',   city:'Bangalore', rating:5, text:'No more awkward phone calls. I book my haircut every weekend through the app. The reminders are super helpful.' },
  { name:'Divya Nair',    city:'Kochi', rating:5, text:'The stylist selection feature is brilliant. I always go to the same person and can see her availability instantly.' },
];

/* ── LandingPage ────────────────────────────────────────────────── */
export default function LandingPage({ searchText = "", onSearch, onLocate, locLoading = false, searching = false }) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  const handleSearchInput = (val) => {
    if (onSearch) onSearch(val);
    if (val) setTimeout(() => document.getElementById("salons")?.scrollIntoView({ behavior: "smooth" }), 300);
  };

  return (
    <>
      <style>{LANDING_CSS}</style>
      <div style={{ background: '#050509', color: '#e2e8f0', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>

        {/* ── HERO ──────────────────────────────────────────────── */}
        <section style={{ position: 'relative', overflow: 'hidden', padding: '96px 20px 76px', textAlign: 'center' }}>
          {/* Orbs */}
          <div className="cu-orb1" style={{ position: 'absolute', top: -140, left: '5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.2) 0%,transparent 68%)', pointerEvents: 'none' }} />
          <div className="cu-orb2" style={{ position: 'absolute', top: -60, right: '2%', width: 680, height: 680, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,0.15) 0%,transparent 68%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 50% at 50% 0%,rgba(99,102,241,0.08) 0%,transparent 70%)', pointerEvents: 'none' }} />
          {/* Grid */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)', backgroundSize: '60px 60px', opacity: 0.022, pointerEvents: 'none' }} />

          <div className="max-w-3xl mx-auto relative" style={{ zIndex: 1 }}>
            {/* Live badge */}
            <div className="cu-fu1 inline-flex items-center gap-2 mb-7" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)', borderRadius: 99, padding: '5px 16px', fontSize: 12, color: '#6ee7b7', fontWeight: 600 }}>
              <span className="cu-pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              500+ verified salons across India
            </div>

            {/* Headline */}
            <h1 className="cu-fu2" style={{ fontSize: 'clamp(2.4rem,6vw,4.4rem)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-2.5px', color: '#f8fafc', marginBottom: 20 }}>
              Find &amp; Book the Best<br />
              Salons Near You.<br />
              <span className="cu-shimmer">Look Your Best.</span>
            </h1>

            {/* Subheading */}
            <p className="cu-fu3 mx-auto" style={{ fontSize: 'clamp(1rem,2.4vw,1.15rem)', color: '#64748b', lineHeight: 1.8, maxWidth: 480, marginBottom: 40 }}>
              Hair, spa, beard, nails &amp; more —<br className="hidden sm:block" />
              browse real reviews, pick your slot, confirm instantly.
            </p>

            {/* Search bar */}
            <div className="cu-fu4 mx-auto mb-4" style={{ maxWidth: 520 }}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px',
                  height: 56, borderRadius: 18,
                  background: focused ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.05)',
                  border: focused ? '1px solid rgba(99,102,241,0.55)' : '1px solid rgba(255,255,255,0.10)',
                  boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.12),0 0 24px rgba(99,102,241,0.15)' : 'none',
                  transition: 'all 0.25s ease',
                }}
              >
                <Search style={{ width: 18, height: 18, flexShrink: 0, color: focused ? '#818cf8' : 'rgba(148,163,184,0.6)' }} />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search salons, services, city..."
                  value={searchText}
                  onChange={e => handleSearchInput(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 16, color: '#f1f5f9', minWidth: 0 }}
                />
                {searchText && !searching && (
                  <button onClick={() => handleSearchInput("")} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', opacity: 0.6 }}>
                    <X style={{ width: 16, height: 16, color: '#94a3b8' }} />
                  </button>
                )}
                {searching && <span style={{ width: 16, height: 16, border: '2px solid #818cf8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />}
                <button
                  onClick={onLocate}
                  disabled={locLoading}
                  title="Use my location"
                  style={{ width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s', opacity: locLoading ? 0.5 : 1 }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.35)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.2)'; }}
                >
                  {locLoading
                    ? <span style={{ width: 14, height: 14, border: '2px solid #818cf8', borderTopColor: 'transparent', borderRadius: '50%', display: 'block', animation: 'spin 0.7s linear infinite' }} />
                    : <LocateFixed style={{ width: 16, height: 16 }} />}
                </button>
              </div>
            </div>

            {/* CTA row */}
            <div className="cu-fu4 flex flex-wrap gap-3 justify-center mb-3">
              <a
                href="#salons"
                onClick={e => { e.preventDefault(); document.getElementById('salons')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="cu-btn-p px-8 py-4 font-bold rounded-2xl text-base inline-flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', boxShadow: '0 0 36px rgba(99,102,241,0.55)', textDecoration: 'none' }}
              >
                🔍&nbsp; Browse Salons
              </a>
              <Link
                to="/register"
                className="cu-btn-s px-8 py-4 font-semibold rounded-2xl text-base inline-flex items-center gap-2"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.13)', color: '#94a3b8', textDecoration: 'none' }}
              >
                Create Free Account →
              </Link>
            </div>
            <p className="cu-fu5" style={{ fontSize: 11.5, color: '#1e293b', marginBottom: 0 }}>
              ✓ No account needed to browse &nbsp;·&nbsp; ✓ Free to book &nbsp;·&nbsp; ✓ Instant confirmation
            </p>
          </div>
        </section>

        {/* ── STATS BAR ─────────────────────────────────────────── */}
        <section style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '48px 20px' }}>
          <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { value: '500+',  label: 'Verified Salons',   sub: 'across India',   color: '#818cf8', glow: 'rgba(99,102,241,0.3)' },
              { value: '50K+',  label: 'Bookings Made',     sub: 'and counting',   color: '#6ee7b7', glow: 'rgba(16,185,129,0.3)' },
              { value: '4.9★',  label: 'Average Rating',    sub: 'by customers',   color: '#fcd34d', glow: 'rgba(245,158,11,0.3)' },
              { value: '30s',   label: 'Avg Booking Time',  sub: 'start to confirm', color: '#f9a8d4', glow: 'rgba(236,72,153,0.3)' },
            ].map(({ value, label, sub, color, glow }) => (
              <div key={label}
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '24px 20px', textAlign: 'center', transition: 'transform .3s ease,border-color .3s ease', cursor: 'default' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = `${color}40`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
              >
                <div style={{ fontSize: 30, fontWeight: 900, color, letterSpacing: '-1.5px', textShadow: `0 0 30px ${glow}`, marginBottom: 4 }}>{value}</div>
                <div style={{ fontSize: 12.5, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 10, color: '#334155' }}>{sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ──────────────────────────────────────── */}
        <section style={{ padding: '96px 20px' }}>
          <div className="max-w-5xl mx-auto">
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
              <div style={{ display: 'inline-block', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 99, padding: '4px 16px', fontSize: 11, color: '#818cf8', fontWeight: 700, letterSpacing: 1.5, marginBottom: 18 }}>HOW IT WORKS</div>
              <h2 style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-1px', marginBottom: 12 }}>Book a salon in 3 steps</h2>
              <p style={{ color: '#475569', fontSize: 15, lineHeight: 1.7 }}>No calls, no waiting — just tap, pick, and confirm.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { step: '01', icon: '🔍', title: 'Search & Discover',   desc: 'Browse salons near you or search by service. Filter by ratings, gender preference, and category.',    color: '#818cf8' },
                { step: '02', icon: '📅', title: 'Pick Your Slot',      desc: 'Choose a service, select a date and time that works for you. See real-time availability instantly.',  color: '#a78bfa' },
                { step: '03', icon: '✅', title: 'Confirmed & Done',    desc: 'Get an instant confirmation notification. Show up and enjoy your appointment — zero hassle.',       color: '#67e8f9' },
              ].map(({ step, icon, title, desc, color }) => (
                <div key={step} className="cu-step" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 22, padding: '30px 26px', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
                  <div style={{ position: 'absolute', top: 16, right: 18, fontSize: 52, fontWeight: 900, color: 'rgba(255,255,255,0.04)', lineHeight: 1, userSelect: 'none' }}>{step}</div>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 20, boxShadow: `0 0 24px ${color}25` }}>{icon}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 10 }}>{title}</h3>
                  <p style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.75 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ──────────────────────────────────────────── */}
        <section style={{ padding: '0 20px 96px' }}>
          <div className="max-w-6xl mx-auto">
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
              <div style={{ display: 'inline-block', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 99, padding: '4px 16px', fontSize: 11, color: '#818cf8', fontWeight: 700, letterSpacing: 1.5, marginBottom: 18 }}>FEATURES</div>
              <h2 style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-1px', marginBottom: 12 }}>Everything you need to look great</h2>
              <p style={{ color: '#475569', fontSize: 15, maxWidth: 440, margin: '0 auto', lineHeight: 1.7 }}>One app for discovering, booking, and managing all your salon visits.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES_DATA.map(({ icon, color, bg, title, desc }) => (
                <div key={title} className="cu-feat" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 22, padding: '28px 24px', cursor: 'default' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 15, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 18, boxShadow: `0 0 26px ${color}30` }}>{icon}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>{title}</h3>
                  <p style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.75 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── REVIEWS ───────────────────────────────────────────── */}
        <section style={{ padding: '0 20px 96px' }}>
          <div className="max-w-5xl mx-auto">
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={{ display: 'inline-block', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 99, padding: '4px 16px', fontSize: 11, color: '#818cf8', fontWeight: 700, letterSpacing: 1.5, marginBottom: 18 }}>REVIEWS</div>
              <h2 style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-1px', marginBottom: 12 }}>Loved by customers across India</h2>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 }}>
                <span style={{ color: '#fcd34d', fontSize: 18, letterSpacing: 2 }}>★★★★★</span>
                <span style={{ color: '#94a3b8', fontSize: 14, fontWeight: 600 }}>4.9 / 5 · 1,000+ reviews</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {REVIEWS.map(({ name, city, rating, text }) => (
                <div key={name} className="cu-review" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '24px 22px' }}>
                  <div style={{ color: '#fcd34d', fontSize: 15, marginBottom: 14, letterSpacing: 2 }}>{'★'.repeat(rating)}</div>
                  <p style={{ fontSize: 13.5, color: '#94a3b8', lineHeight: 1.75, marginBottom: 18, fontStyle: 'italic' }}>"{text}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {name[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{name}</div>
                      <div style={{ fontSize: 11, color: '#475569' }}>{city}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ─────────────────────────────────────────── */}
        <section style={{ padding: '96px 20px', position: 'relative', overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 70% at 50% 50%,rgba(99,102,241,0.14) 0%,transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '70%', height: 1, background: 'linear-gradient(90deg,transparent,rgba(99,102,241,0.45),transparent)', pointerEvents: 'none' }} />
          <div className="max-w-2xl mx-auto text-center relative" style={{ zIndex: 1 }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>✂</div>
            <h2 style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 900, color: '#f1f5f9', letterSpacing: '-1.2px', marginBottom: 14, lineHeight: 1.15 }}>
              Your perfect look<br />is one tap away.
            </h2>
            <p style={{ color: '#475569', fontSize: 15.5, lineHeight: 1.75, maxWidth: 400, margin: '0 auto 36px' }}>
              Join 50,000+ customers already booking salons smarter with Salon Bookings.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
              <Link
                to="/register"
                className="cu-btn-p px-10 py-4 font-bold rounded-2xl inline-flex items-center gap-3"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', boxShadow: '0 0 52px rgba(99,102,241,0.55)', fontSize: 16, textDecoration: 'none' }}
              >
                🚀&nbsp; Create Free Account
              </Link>
              <Link
                to="/login"
                className="cu-btn-s px-10 py-4 font-semibold rounded-2xl inline-flex items-center gap-3"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.13)', color: '#94a3b8', fontSize: 16, textDecoration: 'none' }}
              >
                Sign In →
              </Link>
            </div>
            <p style={{ fontSize: 12, color: '#1e293b', marginTop: 18 }}>
              ✓ Free to use &nbsp;·&nbsp; ✓ No hidden charges &nbsp;·&nbsp; ✓ Book in seconds
            </p>
          </div>
        </section>

      </div>
    </>
  );
}
