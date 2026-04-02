import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import femaleSalonImg from "../assets/female-salon.png";
import maleBarberImg from "../assets/download.jpg";

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
  .lp-benefit{transition:transform .28s ease,border-color .28s ease,box-shadow .28s ease;}
  .lp-benefit:hover{transform:translateY(-6px);border-color:rgba(99,102,241,0.4)!important;box-shadow:0 20px 50px rgba(99,102,241,0.12);}
  .lp-pain{transition:transform .25s ease,border-color .25s ease;}
  .lp-pain:hover{transform:translateY(-3px);}
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
  { icon: "📍", color: "#6366f1", title: "Salons Near You",        desc: "Instantly see 500+ verified salons within 5 km. Browse ratings, services, and prices — no sign-up needed." },
  { icon: "⚡", color: "#8b5cf6", title: "Book in 30 Seconds",     desc: "Pick a service, choose your slot, confirm instantly. No phone calls, no back-and-forth, no waiting." },
  { icon: "🔔", color: "#6366f1", title: "Smart Reminders",        desc: "Automatic reminders before your appointment so you never forget. Get notified about new offers too." },
  { icon: "⭐", color: "#8b5cf6", title: "Verified Reviews",       desc: "Genuine ratings from real customers. Always choose the best salon with full confidence." },
  { icon: "🔁", color: "#6366f1", title: "One-Click Rebooking",    desc: "Book your favourite service again in one tap — no need to search again. Your history is always saved." },
  { icon: "📲", color: "#8b5cf6", title: "QR Booking",             desc: "Scan a salon's QR on their counter or WhatsApp status — land straight on their booking page instantly." },
  { icon: "🎁", color: "#6366f1", title: "Exclusive Deals",        desc: "Access coupon codes, festival offers, and weekend deals. Save money while enjoying premium services." },
  { icon: "🎯", color: "#8b5cf6", title: "Personalised for You",   desc: "The app learns your preferences and suggests services based on your visit history. Your own smart stylist guide." },
  { icon: "💳", color: "#6366f1", title: "Flexible Payments",      desc: "Pay via UPI, card, or cash at the salon. Secure, smooth, and zero last-minute payment confusion." },
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
  genderFilter = "all",
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
              Book smart, save time,<br />
              <span className="lp-shimmer">avoid waiting.</span>
            </h1>

            {/* Sub */}
            <p className="lp-u3" style={{ fontSize: "clamp(1rem,2.4vw,1.15rem)", color: "var(--t-text-2)", lineHeight: 1.8, maxWidth: 460, margin: "0 auto 36px" }}>
              Enjoy a seamless salon experience —<br className="hidden sm:block" />
              browse real reviews, pick your slot, confirm instantly.
            </p>

            {/* ── Gender Entry Tiles — premium full-gradient ── */}
            <div className="lp-u4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 640, margin: "0 auto 28px", textAlign: "left" }}>

              {/* Male tile */}
              <Link
                to="/men"
                style={{ display: "flex", borderRadius: 24, textDecoration: "none", background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)", boxShadow: "0 8px 32px rgba(99,102,241,0.38)", overflow: "hidden", minHeight: 200, transition: "all 0.28s ease", position: "relative", cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px) scale(1.015)"; e.currentTarget.style.boxShadow = "0 22px 60px rgba(99,102,241,0.55)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0) scale(1)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(99,102,241,0.38)"; }}
              >
                {/* Orb bg */}
                <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.10)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: -30, left: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
                {/* Left text */}
                <div style={{ flex: 1, padding: "26px 20px 22px", display: "flex", flexDirection: "column", justifyContent: "space-between", zIndex: 1 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", color: "rgba(255,255,255,0.65)", margin: "0 0 8px", textTransform: "uppercase" }}>Grooming</p>
                    <p style={{ fontSize: "clamp(1.3rem,3vw,1.7rem)", fontWeight: 900, color: "#fff", margin: "0 0 6px", letterSpacing: "-0.5px", lineHeight: 1.1 }}>Male</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.72)", margin: 0, lineHeight: 1.5 }}>Haircut · Beard · Spa</p>
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.28)", borderRadius: 999, padding: "6px 14px", marginTop: 18, width: "fit-content" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Explore →</span>
                  </div>
                </div>
                {/* Right — male barber image */}
                <div style={{ width: 105, display: "flex", alignItems: "center", justifyContent: "center", paddingRight: 8, zIndex: 1 }}>
                  <img
                    src={maleBarberImg}
                    alt="Male Salon"
                    style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 16, opacity: 0.88 }}
                  />
                </div>
              </Link>

              {/* Female tile */}
              <Link
                to="/women"
                style={{ display: "flex", borderRadius: 24, textDecoration: "none", background: "linear-gradient(135deg,#ec4899 0%,#f43f5e 100%)", boxShadow: "0 8px 32px rgba(236,72,153,0.38)", overflow: "hidden", minHeight: 200, transition: "all 0.28s ease", position: "relative", cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px) scale(1.015)"; e.currentTarget.style.boxShadow = "0 22px 60px rgba(236,72,153,0.55)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0) scale(1)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(236,72,153,0.38)"; }}
              >
                {/* Orb bg */}
                <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.10)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: -30, left: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
                {/* Left text */}
                <div style={{ flex: 1, padding: "26px 20px 22px", display: "flex", flexDirection: "column", justifyContent: "space-between", zIndex: 1 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", color: "rgba(255,255,255,0.65)", margin: "0 0 8px", textTransform: "uppercase" }}>Beauty</p>
                    <p style={{ fontSize: "clamp(1.3rem,3vw,1.7rem)", fontWeight: 900, color: "#fff", margin: "0 0 6px", letterSpacing: "-0.5px", lineHeight: 1.1 }}>Female</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.72)", margin: 0, lineHeight: 1.5 }}>Hair · Nails · Bridal</p>
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.28)", borderRadius: 999, padding: "6px 14px", marginTop: 18, width: "fit-content" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Explore →</span>
                  </div>
                </div>
                {/* Right — beauty salon logo */}
                <div style={{ width: 105, display: "flex", alignItems: "center", justifyContent: "center", paddingRight: 8, zIndex: 1 }}>
                  <div style={{ width: 90, height: 90, borderRadius: 18, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
                    <img
                      src={femaleSalonImg}
                      alt="Female Salon"
                      style={{ width: 90, height: 90, objectFit: "cover" }}
                    />
                  </div>
                </div>
              </Link>
            </div>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: 400, margin: "0 auto 20px" }}>
              <div style={{ flex: 1, height: 1, background: "var(--t-border)" }} />
              <span style={{ fontSize: 11, color: "var(--t-text-3)", fontWeight: 500, whiteSpace: "nowrap" }}>or search directly</span>
              <div style={{ flex: 1, height: 1, background: "var(--t-border)" }} />
            </div>

            {/* Trust line */}
            <p className="lp-u5" style={{ fontSize: 12, color: "var(--t-text-3)" }}>
              ✓ No account needed to browse &nbsp;·&nbsp; ✓ Free to book &nbsp;·&nbsp; ✓ Instant confirmation
            </p>
          </div>
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
            WHY BOOK ONLINE — PAIN POINTS
        ══════════════════════════════════════════ */}
        <section style={{ background: "var(--t-bg-2)", borderTop: "1px solid var(--t-border)", padding: "88px 20px" }}>
          <div className="max-w-5xl mx-auto">
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <div style={{ display: "inline-block", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 99, padding: "4px 16px", fontSize: 11, color: "#f87171", fontWeight: 700, letterSpacing: 1.5, marginBottom: 16 }}>
                SOUND FAMILIAR?
              </div>
              <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 900, color: "var(--t-text)", letterSpacing: "-1px", marginBottom: 12 }}>
                The old way of booking is broken
              </h2>
              <p style={{ color: "var(--t-text-2)", fontSize: 15, maxWidth: 440, margin: "0 auto", lineHeight: 1.7 }}>
                You've been putting up with this for too long. There's a better way.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { pain: "📞 Endless phone calls", fix: "Book instantly in the app — no calls, no hold music, no callbacks.", color: "#f87171" },
                { pain: "⏳ 'Come back in 30 min'", fix: "See real-time slot availability before you even step outside.", color: "#fb923c" },
                { pain: "😤 Long waits on arrival", fix: "Pick your exact time slot. Walk in, sit down, get styled.", color: "#f87171" },
                { pain: "🤷 Don't know which salon is good", fix: "100% verified ratings from real customers. No fake reviews.", color: "#fb923c" },
                { pain: "🤯 Forgetting your appointment", fix: "Auto reminders 24 hrs and 30 min before your booking. Never miss again.", color: "#f87171" },
                { pain: "💸 Surprise pricing at the counter", fix: "Every price listed clearly upfront. Zero surprises at checkout.", color: "#fb923c" },
              ].map(({ pain, fix, color }) => (
                <div
                  key={pain}
                  className="lp-pain"
                  style={{ background: "var(--t-card)", border: "1px solid var(--t-border)", borderRadius: 20, padding: "24px 22px" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = color + "40"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--t-border)"; }}
                >
                  <p style={{ fontSize: 14, fontWeight: 700, color, marginBottom: 10 }}>{pain}</p>
                  <div style={{ width: 28, height: 2, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: 99, marginBottom: 10 }} />
                  <p style={{ fontSize: 13.5, color: "var(--t-text-2)", lineHeight: 1.7 }}>✓ {fix}</p>
                </div>
              ))}
            </div>
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
              {FEATURES.map(({ icon, color, title, desc }) => (
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
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            BENEFITS — 3 PILLARS
        ══════════════════════════════════════════ */}
        <section style={{ padding: "88px 20px" }}>
          <div className="max-w-5xl mx-auto">
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <div style={{ display: "inline-block", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.22)", borderRadius: 99, padding: "4px 16px", fontSize: 11, color: "var(--t-accent)", fontWeight: 700, letterSpacing: 1.5, marginBottom: 16 }}>
                WHY CUSTOMERS LOVE IT
              </div>
              <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 900, color: "var(--t-text)", letterSpacing: "-1px", marginBottom: 12 }}>
                Three things you get. Every time.
              </h2>
              <p style={{ color: "var(--t-text-2)", fontSize: 15, maxWidth: 400, margin: "0 auto", lineHeight: 1.7 }}>
                Not a promise — a guarantee built into every booking.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                {
                  icon: "⚡", color: "#6366f1",
                  title: "Save Time",
                  headline: "Book in under 30 seconds.",
                  points: ["No phone calls or DMs", "Real-time slot availability", "Instant booking confirmation", "One-tap rebooking for regulars"],
                },
                {
                  icon: "💰", color: "#10b981",
                  title: "Save Money",
                  headline: "Always the best price.",
                  points: ["Transparent upfront pricing", "Exclusive app-only offers", "Festival & weekend deals", "No hidden charges ever"],
                },
                {
                  icon: "🎯", color: "#8b5cf6",
                  title: "Total Control",
                  headline: "Your schedule, your rules.",
                  points: ["Choose your exact time slot", "Auto reminders before visit", "Easy reschedule or cancel", "Full booking history always"],
                },
              ].map(({ icon, color, title, headline, points }) => (
                <div
                  key={title}
                  className="lp-benefit"
                  style={{ background: "var(--t-card)", border: "1px solid var(--t-border)", borderRadius: 24, padding: "32px 28px" }}
                >
                  <div style={{ width: 56, height: 56, borderRadius: 18, background: color + "14", border: `1px solid ${color}28`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 20 }}>{icon}</div>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color, marginBottom: 8 }}>{title}</p>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--t-text)", marginBottom: 18, letterSpacing: "-0.3px" }}>{headline}</h3>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                    {points.map(p => (
                      <li key={p} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13.5, color: "var(--t-text-2)", lineHeight: 1.5 }}>
                        <span style={{ color, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
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
              Book smart.<br />Save time.<br /><span className="lp-shimmer">Look amazing.</span>
            </h2>
            <p style={{ color: "var(--t-text-2)", fontSize: 15.5, lineHeight: 1.75, maxWidth: 440, margin: "0 auto 36px" }}>
              Join 50,000+ customers who stopped calling salons and started booking smarter — instantly, for free.
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
