import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LocateFixed, Search, X } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

/* ─────────────────────────────────────────────
   Animations & utilities
───────────────────────────────────────────── */
const CSS = `
  @keyframes lp-orb1{0%,100%{transform:translate(0,0)scale(1);}40%{transform:translate(60px,-50px)scale(1.1);}70%{transform:translate(-30px,30px)scale(0.93);}}
  @keyframes lp-orb2{0%,100%{transform:translate(0,0)scale(1);}35%{transform:translate(-60px,45px)scale(1.08);}65%{transform:translate(45px,-25px)scale(0.95);}}
  @keyframes lp-up{from{opacity:0;transform:translateY(22px);}to{opacity:1;transform:translateY(0);}}
  @keyframes lp-shimmer{0%{background-position:200% center;}100%{background-position:-200% center;}}
  @keyframes lp-dot{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.45;transform:scale(1.6);}}
  @keyframes lp-spin{to{transform:rotate(360deg);}}
  .lp-orb1{animation:lp-orb1 18s ease-in-out infinite;}
  .lp-orb2{animation:lp-orb2 22s ease-in-out infinite;}
  .lp-u0{animation:lp-up .65s .00s ease both;}
  .lp-u1{animation:lp-up .65s .10s ease both;}
  .lp-u2{animation:lp-up .65s .20s ease both;}
  .lp-u3{animation:lp-up .65s .30s ease both;}
  .lp-u4{animation:lp-up .65s .42s ease both;}
  .lp-u5{animation:lp-up .65s .54s ease both;}
  .lp-shimmer{
    background:linear-gradient(90deg,#6366f1,#8b5cf6,#a78bfa,#6366f1);
    background-size:300% auto;
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
    animation:lp-shimmer 5s linear infinite;
  }
  .lp-dot{animation:lp-dot 2s ease-in-out infinite;}
  .lp-spin{animation:lp-spin .75s linear infinite;}
  .lp-card{transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease;}
  .lp-card:hover{transform:translateY(-6px);}
  .lp-step{transition:transform .25s ease,box-shadow .25s ease;}
  .lp-step:hover{transform:translateY(-4px);}
  .lp-review{transition:transform .25s ease,border-color .25s ease;}
  .lp-review:hover{transform:translateY(-4px);}
  .lp-btn-p{transition:transform .18s ease,box-shadow .18s ease;}
  .lp-btn-p:hover{transform:scale(1.04);}
  .lp-btn-s{transition:all .18s ease;}
  .lp-btn-s:hover{transform:scale(1.02);}
  .scrollbar-hide{scrollbar-width:none;-ms-overflow-style:none;}
  .scrollbar-hide::-webkit-scrollbar{display:none;}
`;

/* ─────────────────────────────────────────────
   Static data
───────────────────────────────────────────── */
const CATEGORIES = [
  { key: "all",                  label: "All",     icon: "✦"  },
  { key: "Hair Services",        label: "Hair",    icon: "✂️" },
  { key: "Beard & Grooming",     label: "Beard",   icon: "🧔" },
  { key: "Nail Services",        label: "Nails",   icon: "💅" },
  { key: "Skin & Face / Beauty", label: "Skin",    icon: "🧖" },
  { key: "Spa & Massage",        label: "Spa",     icon: "💆" },
  { key: "Body Grooming",        label: "Body",    icon: "🧴" },
  { key: "Bridal & Events",      label: "Bridal",  icon: "👰" },
  { key: "Kids Services",        label: "Kids",    icon: "👶" },
  { key: "At-Home Services",     label: "At-Home", icon: "🏡" },
];

const QUICK_ACTIONS = [
  { icon: "📍", label: "Near Me",   sub: "Within 5 km",     color: "#34d399", sort: "nearby" },
  { icon: "⭐", label: "Top Rated", sub: "Best salons",      color: "#fcd34d", sort: "rated"  },
  { icon: "🔥", label: "Trending",  sub: "Most booked",      color: "#f97316", sort: "booked" },
  { icon: "✂️", label: "Hair",      sub: "Hair services",    color: "#818cf8", cat: "Hair Services"    },
  { icon: "💆", label: "Spa",       sub: "Relax & refresh",  color: "#6ee7b7", cat: "Spa & Massage"    },
  { icon: "💅", label: "Nails",     sub: "Nail art & care",  color: "#f9a8d4", cat: "Nail Services"    },
];

const FEATURES = [
  { icon: "📍", title: "Salons Near You",      desc: "Instantly see verified salons in your area. No sign-up needed to browse — just open and explore." },
  { icon: "⚡", title: "Book in Seconds",       desc: "Pick a service, choose your slot, confirm instantly. No phone calls, no back-and-forth." },
  { icon: "🔔", title: "Live Notifications",    desc: "Real-time booking confirmations and status updates sent directly to your device." },
  { icon: "⭐", title: "Verified Reviews",      desc: "Genuine ratings from real customers. Book every time with full confidence." },
  { icon: "❤️", title: "Save Favourites",       desc: "Save your go-to salons and rebook with one tap. Your history is always there." },
  { icon: "📲", title: "QR Booking",            desc: "Scan a salon's QR code and land straight on their booking page instantly." },
];

const STEPS = [
  { n: "01", icon: "🔍", title: "Search & Discover", desc: "Browse salons near you or search by service, city, or rating. Filter by gender preference.", color: "#6366f1" },
  { n: "02", icon: "📅", title: "Pick Your Slot",     desc: "Choose a service and time slot that works for you. See real-time availability instantly.",   color: "#8b5cf6" },
  { n: "03", icon: "✅", title: "Confirmed & Done",   desc: "Get an instant confirmation notification. Show up and enjoy — zero hassle.",                 color: "#6366f1" },
];

const REVIEWS = [
  { name: "Ananya Sharma", city: "Mumbai",    rating: 5, text: "Found a great salon 500m from home in literally 10 seconds. Booked, confirmed, done. This app is magic." },
  { name: "Rohan Mehta",   city: "Bangalore", rating: 5, text: "No more awkward phone calls. I book my haircut every weekend through the app. Super smooth." },
  { name: "Divya Nair",    city: "Kochi",     rating: 5, text: "The stylist selection feature is brilliant. I always go to the same person and see her availability instantly." },
];

const STATS = [
  { value: "500+", label: "Verified Salons",   color: "#6366f1" },
  { value: "50K+", label: "Bookings Made",      color: "#8b5cf6" },
  { value: "4.9★", label: "Average Rating",     color: "#6366f1" },
  { value: "30s",  label: "Avg Booking Time",   color: "#8b5cf6" },
];

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
const MALE_ONLY_CATS   = ["Beard & Grooming", "Body Grooming"];
const FEMALE_ONLY_CATS = ["Bridal & Events"];

export default function LandingPage({
  searchText = "", onSearch, onSearchSubmit, onLocate, locLoading = false, searching = false,
  selectedCats = [], onCategorySelect, sort = "nearby", onSortChange,
  genderFilter = "all", salonGrid = null,
}) {
  const { isDark } = useTheme();
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  const scrollToSalons = () =>
    document.getElementById("salons")?.scrollIntoView({ behavior: "smooth" });

  const handleInput = (val) => {
    if (onSearch) onSearch(val);
    if (!val) return; // clearing — no scroll
  };

  const handleSubmit = () => {
    if (onSearchSubmit) onSearchSubmit();
    setTimeout(scrollToSalons, 200);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
  };

  /* ── shared token styles ── */
  const chip = (active) => ({
    display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
    padding: "7px 14px", borderRadius: 999,
    fontSize: 12, fontWeight: 700, cursor: "pointer",
    transition: "all 0.18s ease", whiteSpace: "nowrap",
    background: active ? "rgba(99,102,241,0.14)" : "transparent",
    border: active ? "1px solid rgba(99,102,241,0.38)" : "1px solid var(--t-border)",
    color: active ? "var(--t-accent)" : "var(--t-text-3)",
    boxShadow: active ? "0 0 12px rgba(99,102,241,0.15)" : "none",
  });

  const sectionLabel = {
    fontSize: 11, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.08em", color: "var(--t-text-3)", marginBottom: 14,
  };

  return (
    <>
      <style>{CSS}</style>
      <div style={{ background: "var(--t-bg)", color: "var(--t-text)", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", overflowX: "hidden" }}>

        {/* ══════════════════════════════════════════
            HERO
        ══════════════════════════════════════════ */}
        <section style={{ position: "relative", overflow: "hidden", padding: "clamp(72px,10vh,108px) 20px clamp(56px,7vh,80px)", textAlign: "center" }}>

          {/* Background orbs — dark only */}
          {isDark && <>
            <div className="lp-orb1" style={{ position: "absolute", top: -160, left: "4%", width: 640, height: 640, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.18) 0%,transparent 68%)", pointerEvents: "none" }} />
            <div className="lp-orb2" style={{ position: "absolute", top: -80, right: "2%", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,0.13) 0%,transparent 68%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 50% at 50% 0%,rgba(99,102,241,0.07) 0%,transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
          </>}
          {!isDark && <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 60% at 50% -10%,rgba(99,102,241,0.07) 0%,transparent 70%)", pointerEvents: "none" }} />}

          <div className="max-w-3xl mx-auto" style={{ position: "relative", zIndex: 1 }}>

            {/* ── Two home page entry buttons ── */}
            <div className="lp-u0" style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
              <Link
                to="/login"
                className="lp-btn-p"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 999, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none", boxShadow: "0 0 28px rgba(99,102,241,0.4)" }}
              >
                <span>✂️</span> Customer Home
              </Link>
              <a
                href="https://owner.mysalonbookings.com"
                className="lp-btn-s"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 999, background: "var(--t-card)", border: "1px solid var(--t-border)", color: "var(--t-text-2)", fontSize: 14, fontWeight: 700, textDecoration: "none" }}
              >
                <span>🏪</span> Salon Owner Home
              </a>
            </div>

            {/* Live badge */}
            <div className="lp-u1" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.22)", borderRadius: 99, padding: "5px 16px", fontSize: 12, color: "var(--t-accent)", fontWeight: 600 }}>
              <span className="lp-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#6366f1", display: "inline-block" }} />
              500+ verified salons across India
            </div>

            {/* Headline */}
            <h1 className="lp-u2" style={{ fontSize: "clamp(2.6rem,7vw,4.8rem)", fontWeight: 900, lineHeight: 1.06, letterSpacing: "-2.5px", marginBottom: 20 }}>
              Book the Perfect Salon,<br />
              <span className="lp-shimmer">Instantly.</span>
            </h1>

            {/* Sub */}
            <p className="lp-u3" style={{ fontSize: "clamp(1rem,2.4vw,1.15rem)", color: "var(--t-text-2)", lineHeight: 1.8, maxWidth: 460, margin: "0 auto 36px" }}>
              Hair, spa, beard, nails &amp; more —<br className="hidden sm:block" />
              browse real reviews, pick your slot, confirm instantly.
            </p>

            {/* Search bar */}
            <div className="lp-u4 mx-auto" style={{ maxWidth: 540, marginBottom: 16 }}>
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "0 16px", height: 60, borderRadius: 999,
                  background: focused ? "var(--t-card)" : "var(--t-input-bg)",
                  border: focused ? "1.5px solid rgba(99,102,241,0.55)" : "1.5px solid var(--t-border)",
                  boxShadow: focused ? "0 0 0 4px rgba(99,102,241,0.1), 0 8px 32px rgba(99,102,241,0.12)" : "0 4px 24px rgba(0,0,0,0.06)",
                  transition: "all 0.25s ease",
                }}
              >
                <button onClick={handleSubmit} style={{ display: "flex", background: "none", border: "none", cursor: searchText ? "pointer" : "default", padding: 0, flexShrink: 0 }} title="Search">
                  <Search style={{ width: 18, height: 18, color: focused ? "var(--t-accent)" : "var(--t-text-3)", transition: "color 0.2s" }} />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search salons, services, city…"
                  value={searchText}
                  onChange={e => handleInput(e.target.value)}
                  onKeyDown={handleKey}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 16, color: "var(--t-text)", minWidth: 0 }}
                />
                {searchText && !searching && (
                  <button onClick={() => handleInput("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", opacity: 0.6 }}>
                    <X style={{ width: 15, height: 15, color: "var(--t-text-2)" }} />
                  </button>
                )}
                {searching && <span className="lp-spin" style={{ width: 16, height: 16, border: "2px solid var(--t-accent)", borderTopColor: "transparent", borderRadius: "50%", display: "block", flexShrink: 0 }} />}
                <div style={{ width: 1, height: 20, background: "var(--t-border)", flexShrink: 0 }} />
                <button
                  onClick={onLocate}
                  disabled={locLoading}
                  title="Use my location"
                  style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "var(--t-accent)", fontSize: 12, fontWeight: 600, flexShrink: 0, opacity: locLoading ? 0.5 : 1 }}
                >
                  {locLoading
                    ? <span className="lp-spin" style={{ width: 14, height: 14, border: "2px solid var(--t-accent)", borderTopColor: "transparent", borderRadius: "50%", display: "block" }} />
                    : <LocateFixed style={{ width: 15, height: 15 }} />}
                  <span className="hidden sm:inline">Locate</span>
                </button>
              </div>
            </div>

            {/* CTA row */}
            <div className="lp-u4" style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginBottom: 16 }}>
              <a
                href="#salons"
                onClick={e => { e.preventDefault(); scrollToSalons(); }}
                className="lp-btn-p"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px", borderRadius: 16, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontWeight: 700, fontSize: 15, textDecoration: "none", boxShadow: "0 0 40px rgba(99,102,241,0.5)" }}
              >
                🔍 Browse Salons
              </a>
              <Link
                to="/register"
                className="lp-btn-s"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px", borderRadius: 16, background: "var(--t-card)", border: "1px solid var(--t-border)", color: "var(--t-text-2)", fontWeight: 600, fontSize: 15, textDecoration: "none" }}
              >
                Create Free Account →
              </Link>
            </div>

            {/* Trust line */}
            <p className="lp-u5" style={{ fontSize: 12, color: "var(--t-text-3)" }}>
              ✓ No account needed to browse &nbsp;·&nbsp; ✓ Free to book &nbsp;·&nbsp; ✓ Instant confirmation
            </p>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            APP SECTION — Categories + Quick Actions
        ══════════════════════════════════════════ */}
        <section style={{ background: "var(--t-bg-2)", borderTop: "1px solid var(--t-border)", padding: "40px 20px" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>

            {/* What would you like */}
            <p style={sectionLabel}>What would you like?</p>
            <div className="scrollbar-hide" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 8, width: "max-content", paddingBottom: 2 }}>
                {CATEGORIES.filter(({ key }) => {
                  if (genderFilter === "female" && MALE_ONLY_CATS.includes(key)) return false;
                  if (genderFilter === "male"   && FEMALE_ONLY_CATS.includes(key)) return false;
                  return true;
                }).map(({ key, label, icon }) => {
                  const active = key === "all" ? selectedCats.length === 0 : selectedCats.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (onCategorySelect) onCategorySelect(key);
                        setTimeout(scrollToSalons, 80);
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "9px 16px", borderRadius: 999,
                        fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                        transition: "all 0.18s ease",
                        background: active ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "var(--t-input-bg)",
                        border: active ? "1px solid rgba(139,92,246,0.45)" : "1px solid var(--t-border)",
                        color: active ? "#fff" : "var(--t-text-2)",
                        boxShadow: active ? "0 0 18px rgba(99,102,241,0.32)" : "none",
                      }}
                    >
                      <span style={{ fontSize: 15 }}>{icon}</span>{label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sort suggestions */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
              {[
                { key: "nearby", label: "Near You",  icon: "📍" },
                { key: "rated",  label: "Top Rated",  icon: "⭐" },
                { key: "booked", label: "Trending",   icon: "🔥" },
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => { if (onSortChange) onSortChange(key); setTimeout(scrollToSalons, 80); }}
                  style={chip(sort === key)}
                >
                  {icon} {label}
                </button>
              ))}
            </div>

            {/* Quick Access */}
            <p style={sectionLabel}>Quick Access</p>
            <div className="scrollbar-hide" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <div style={{ display: "flex", gap: 10, width: "max-content", paddingBottom: 4 }}>
                {QUICK_ACTIONS.map(action => (
                  <button
                    key={action.label}
                    onClick={() => {
                      if (action.sort && onSortChange) onSortChange(action.sort);
                      if (action.cat && onCategorySelect) onCategorySelect(action.cat);
                      setTimeout(scrollToSalons, 80);
                    }}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 16, background: "var(--t-card)", border: "1px solid var(--t-border)", cursor: "pointer", minWidth: 140, transition: "transform 0.2s ease,box-shadow 0.2s ease,border-color 0.2s ease" }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 24px ${action.color}28`; e.currentTarget.style.borderColor = `${action.color}44`; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--t-border)"; }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: action.color + "1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 }}>{action.icon}</div>
                    <div style={{ textAlign: "left" }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "var(--t-text)", whiteSpace: "nowrap", marginBottom: 1 }}>{action.label}</p>
                      <p style={{ fontSize: 10, color: "var(--t-text-3)", whiteSpace: "nowrap" }}>{action.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* ── Nearby Salons — full-width responsive grid ── */}
          {salonGrid && (
            <div style={{ maxWidth: 1280, margin: "28px auto 0" }}>
              {salonGrid}
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════
            STATS
        ══════════════════════════════════════════ */}
        <section style={{ borderTop: "1px solid var(--t-border)", borderBottom: "1px solid var(--t-border)", padding: "48px 20px" }}>
          <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
            {STATS.map(({ value, label, color }) => (
              <div
                key={label}
                className="lp-step"
                style={{ background: "var(--t-card)", border: "1px solid var(--t-border)", borderRadius: 20, padding: "24px 20px", textAlign: "center" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = color + "50"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--t-border)"; }}
              >
                <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-1.5px", color, marginBottom: 6 }}>{value}</div>
                <div style={{ fontSize: 12, color: "var(--t-text-2)", fontWeight: 600 }}>{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            HOW IT WORKS
        ══════════════════════════════════════════ */}
        <section style={{ padding: "88px 20px" }}>
          <div className="max-w-5xl mx-auto">
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <div style={{ display: "inline-block", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.22)", borderRadius: 99, padding: "4px 16px", fontSize: 11, color: "var(--t-accent)", fontWeight: 700, letterSpacing: 1.5, marginBottom: 16 }}>
                HOW IT WORKS
              </div>
              <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 900, color: "var(--t-text)", letterSpacing: "-1px", marginBottom: 12 }}>
                Book a salon in 3 steps
              </h2>
              <p style={{ color: "var(--t-text-2)", fontSize: 15, lineHeight: 1.7 }}>No calls, no waiting — just tap, pick, and confirm.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {STEPS.map(({ n, icon, title, desc, color }) => (
                <div
                  key={n}
                  className="lp-step"
                  style={{ background: "var(--t-card)", border: "1px solid var(--t-border)", borderRadius: 22, padding: "30px 26px", position: "relative", overflow: "hidden" }}
                >
                  <div style={{ position: "absolute", top: 14, right: 18, fontSize: 56, fontWeight: 900, color: color + "0e", lineHeight: 1, userSelect: "none", pointerEvents: "none" }}>{n}</div>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: color + "15", border: `1px solid ${color}28`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 20 }}>{icon}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--t-text)", marginBottom: 10 }}>{title}</h3>
                  <p style={{ fontSize: 13.5, color: "var(--t-text-2)", lineHeight: 1.75 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            FEATURES
        ══════════════════════════════════════════ */}
        <section style={{ background: "var(--t-bg-2)", borderTop: "1px solid var(--t-border)", borderBottom: "1px solid var(--t-border)", padding: "88px 20px" }}>
          <div className="max-w-6xl mx-auto">
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <div style={{ display: "inline-block", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.22)", borderRadius: 99, padding: "4px 16px", fontSize: 11, color: "#a78bfa", fontWeight: 700, letterSpacing: 1.5, marginBottom: 16 }}>
                FEATURES
              </div>
              <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 900, color: "var(--t-text)", letterSpacing: "-1px", marginBottom: 12 }}>
                Everything you need to look great
              </h2>
              <p style={{ color: "var(--t-text-2)", fontSize: 15, maxWidth: 440, margin: "0 auto", lineHeight: 1.7 }}>
                One app for discovering, booking, and managing all your salon visits.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map(({ icon, title, desc }, i) => {
                const color = i % 2 === 0 ? "#6366f1" : "#8b5cf6";
                return (
                  <div
                    key={title}
                    className="lp-card"
                    style={{ background: "var(--t-card)", border: "1px solid var(--t-border)", borderRadius: 22, padding: "28px 24px", cursor: "default" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = color + "40"; e.currentTarget.style.boxShadow = `0 16px 40px ${color}15`; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--t-border)"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <div style={{ width: 52, height: 52, borderRadius: 15, background: color + "12", border: `1px solid ${color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 18 }}>{icon}</div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--t-text)", marginBottom: 8 }}>{title}</h3>
                    <p style={{ fontSize: 13.5, color: "var(--t-text-2)", lineHeight: 1.75 }}>{desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            REVIEWS
        ══════════════════════════════════════════ */}
        <section style={{ padding: "88px 20px" }}>
          <div className="max-w-5xl mx-auto">
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <div style={{ display: "inline-block", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.22)", borderRadius: 99, padding: "4px 16px", fontSize: 11, color: "var(--t-accent)", fontWeight: 700, letterSpacing: 1.5, marginBottom: 16 }}>
                REVIEWS
              </div>
              <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 900, color: "var(--t-text)", letterSpacing: "-1px", marginBottom: 10 }}>
                Loved by customers across India
              </h2>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <span style={{ color: "#f59e0b", fontSize: 17, letterSpacing: 2 }}>★★★★★</span>
                <span style={{ color: "var(--t-text-2)", fontSize: 14, fontWeight: 600 }}>4.9 / 5 · 1,000+ reviews</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {REVIEWS.map(({ name, city, rating, text }) => (
                <div
                  key={name}
                  className="lp-review"
                  style={{ background: "var(--t-card)", border: "1px solid var(--t-border)", borderRadius: 20, padding: "24px 22px" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.35)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--t-border)"; }}
                >
                  <div style={{ color: "#f59e0b", fontSize: 15, marginBottom: 14, letterSpacing: 2 }}>{"★".repeat(rating)}</div>
                  <p style={{ fontSize: 13.5, color: "var(--t-text-2)", lineHeight: 1.75, marginBottom: 18, fontStyle: "italic" }}>"{text}"</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                      {name[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--t-text)" }}>{name}</div>
                      <div style={{ fontSize: 11, color: "var(--t-text-3)" }}>{city}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            FINAL CTA
        ══════════════════════════════════════════ */}
        <section style={{ position: "relative", overflow: "hidden", borderTop: "1px solid var(--t-border)", padding: "96px 20px" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 70% at 50% 50%,rgba(99,102,241,0.08) 0%,transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "60%", height: 1, background: "linear-gradient(90deg,transparent,rgba(99,102,241,0.4),transparent)", pointerEvents: "none" }} />

          <div className="max-w-2xl mx-auto text-center" style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>✂</div>
            <h2 style={{ fontSize: "clamp(1.8rem,4.5vw,3rem)", fontWeight: 900, color: "var(--t-text)", letterSpacing: "-1.2px", marginBottom: 14, lineHeight: 1.15 }}>
              Your perfect look<br />is one tap away.
            </h2>
            <p style={{ color: "var(--t-text-2)", fontSize: 15.5, lineHeight: 1.75, maxWidth: 400, margin: "0 auto 36px" }}>
              Join 50,000+ customers already booking salons smarter with Salon Bookings.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
              <Link
                to="/register"
                className="lp-btn-p"
                style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "16px 36px", borderRadius: 16, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", boxShadow: "0 0 52px rgba(99,102,241,0.45)", fontSize: 16, fontWeight: 700, textDecoration: "none" }}
              >
                🚀 Create Free Account
              </Link>
              <Link
                to="/login"
                className="lp-btn-s"
                style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "16px 36px", borderRadius: 16, background: "var(--t-card)", border: "1px solid var(--t-border)", color: "var(--t-text-2)", fontSize: 16, fontWeight: 600, textDecoration: "none" }}
              >
                Sign In →
              </Link>
            </div>
            <p style={{ fontSize: 12, color: "var(--t-text-3)", marginTop: 18 }}>
              ✓ Free to use &nbsp;·&nbsp; ✓ No hidden charges &nbsp;·&nbsp; ✓ Book in seconds
            </p>
          </div>
        </section>

      </div>
    </>
  );
}
