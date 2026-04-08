import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import femaleSalonImg from "../assets/female-salon.png";
import maleBarberImg from "../assets/download.jpg";

/* ─────────────────────────────────────────────
   CSS
───────────────────────────────────────────── */
const CSS = `
  @keyframes lp-orb1{0%,100%{transform:translate(0,0)scale(1);}40%{transform:translate(60px,-50px)scale(1.1);}70%{transform:translate(-30px,30px)scale(0.93);}}
  @keyframes lp-orb2{0%,100%{transform:translate(0,0)scale(1);}35%{transform:translate(-60px,45px)scale(1.08);}65%{transform:translate(45px,-25px)scale(0.95);}}
  @keyframes lp-up{from{opacity:0;transform:translateY(22px);}to{opacity:1;transform:translateY(0);}}
  @keyframes lp-shimmer{0%{background-position:200% center;}100%{background-position:-200% center;}}
  @keyframes lp-dot{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.45;transform:scale(1.6);}}
  @keyframes lp-pulse{0%,100%{opacity:0.6;transform:scale(1);}50%{opacity:1;transform:scale(1.04);}}
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
  .lp-card{transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease;}
  .lp-card:hover{transform:translateY(-6px);}
  .lp-hover{transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease;}
  .lp-hover:hover{transform:translateY(-4px);box-shadow:0 20px 48px rgba(99,102,241,0.12)!important;border-color:rgba(99,102,241,0.3)!important;}
  .lp-btn-p{transition:transform .18s ease,box-shadow .18s ease;}
  .lp-btn-p:hover{transform:scale(1.04);box-shadow:0 8px 32px rgba(99,102,241,0.5)!important;}
  .lp-btn-s{transition:all .18s ease;}
  .lp-btn-s:hover{transform:scale(1.02);}
  .lp-check{color:#6366f1;font-weight:700;flex-shrink:0;margin-top:1px;}
  .lp-faq-item summary{list-style:none;cursor:pointer;user-select:none;}
  .lp-faq-item summary::-webkit-details-marker{display:none;}
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

const AI_FEATURES = [
  {
    badge: "AI BOOKING",
    icon: "🤖",
    color: "#6366f1",
    title: "Smart Scheduling Engine",
    desc: "Our AI learns peak hours, staff availability, and customer preferences to surface the best slots — no manual coordination needed.",
    points: ["Real-time slot optimisation", "Reduces double-bookings to zero", "Predicts and pre-fills preferences"],
  },
  {
    badge: "AUTOMATION",
    icon: "⚡",
    color: "#8b5cf6",
    title: "Zero-Touch Operations",
    desc: "Automated reminders, confirmations, and follow-ups run in the background. Your staff focuses on clients, not admin.",
    points: ["Auto SMS + push reminders", "Instant booking confirmations", "Post-visit review requests"],
  },
  {
    badge: "ANALYTICS",
    icon: "📊",
    color: "#06b6d4",
    title: "Revenue Intelligence",
    desc: "A live dashboard showing which services drive the most revenue, your busiest hours, and which staff generate the highest repeat rate.",
    points: ["Daily revenue tracking", "No-show rate monitor", "Top service & staff reports"],
  },
  {
    badge: "GROWTH",
    icon: "📈",
    color: "#10b981",
    title: "Built-In Customer Acquisition",
    desc: "Your salon is indexed across 25+ cities and surfaced to customers actively searching near you — no ad spend required.",
    points: ["Local SEO-optimised profile", "Appear in 'near me' searches", "New customer notifications"],
  },
];

const BENEFITS = [
  {
    icon: "💰", color: "#10b981",
    metric: "+38%",
    label: "Revenue Increase",
    headline: "Salons on MySalonBookings earn more.",
    desc: "Online booking fills your calendar 24/7 — not just during working hours. Customers who find you via the platform book an average of 1.4 services per visit.",
  },
  {
    icon: "📉", color: "#6366f1",
    metric: "−67%",
    label: "No-Show Rate",
    headline: "Automated reminders that actually work.",
    desc: "Three-layer reminders — 24 hrs, 2 hrs, and 30 min before every appointment. Customers who get reminders cancel early instead of ghosting, freeing your slot for others.",
  },
  {
    icon: "⏱️", color: "#8b5cf6",
    metric: "3 hrs",
    label: "Saved Per Day",
    headline: "Stop managing bookings manually.",
    desc: "The average salon owner spends 3+ hours daily on the phone managing appointments. Automate it entirely — your staff handles zero incoming booking calls.",
  },
];

const TESTIMONIALS = [
  {
    name: "Priya Verma",
    title: "Owner, Studio Glow",
    city: "Jaipur",
    avatar: "PV",
    avatarBg: "#6366f1",
    rating: 5,
    quote: "We went from 12 bookings a week to 34 in 6 weeks — without running a single ad. The platform just brings customers in. I honestly didn't expect it to work this fast.",
  },
  {
    name: "Ananya Sharma",
    title: "Customer",
    city: "Mumbai",
    avatar: "AS",
    avatarBg: "#ec4899",
    rating: 5,
    quote: "I found a salon 400m from my house that I never knew existed. Booked in literally 10 seconds, got a reminder the morning of, walked in on time. This is what booking should always feel like.",
  },
  {
    name: "Karan Malhotra",
    title: "Owner, The Barber Room",
    city: "Delhi NCR",
    avatar: "KM",
    avatarBg: "#8b5cf6",
    rating: 5,
    quote: "My no-show rate was brutal — almost 30%. After the automated reminders kicked in, it dropped to under 8% in a month. That alone paid for everything 10x over.",
  },
  {
    name: "Divya Nair",
    title: "Customer",
    city: "Kochi",
    avatar: "DN",
    avatarBg: "#06b6d4",
    rating: 5,
    quote: "The stylist selection feature is a game-changer. I always book with the same person and I can see her availability in real time. Feels personal, not transactional.",
  },
  {
    name: "Sunita Patel",
    title: "Owner, Elegance Unisex Salon",
    city: "Ahmedabad",
    avatar: "SP",
    avatarBg: "#10b981",
    rating: 5,
    quote: "I was skeptical about putting my salon online — thought it was too complicated. Setup took me 4 minutes. Now I get 8-10 new bookings a week from customers I'd never have found otherwise.",
  },
  {
    name: "Rohan Mehta",
    title: "Customer",
    city: "Bengaluru",
    avatar: "RM",
    avatarBg: "#f97316",
    rating: 5,
    quote: "No more awkward phone calls, no more 'call back in 20 mins'. I book my haircut every week through the app. Takes 15 seconds. The reviews are legit — I've never had a bad experience.",
  },
];

const COMPARISON = [
  { feature: "Online booking for customers",      us: true,  them: "Partial" },
  { feature: "Dedicated salon owner app",         us: true,  them: false },
  { feature: "AI-powered smart scheduling",       us: true,  them: false },
  { feature: "Automated SMS + push reminders",    us: true,  them: false },
  { feature: "No-show reduction analytics",       us: true,  them: false },
  { feature: "Revenue dashboard",                 us: true,  them: false },
  { feature: "Tier 2/3 India city coverage",      us: true,  them: false },
  { feature: "Free plan (no credit card)",        us: true,  them: false },
  { feature: "Zero booking commission",           us: true,  them: false },
  { feature: "Staff & schedule management",       us: true,  them: "Partial" },
];

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    highlight: false,
    badge: null,
    desc: "Everything you need to start taking online bookings today.",
    features: [
      "Salon profile listing",
      "Up to 30 bookings / month",
      "Basic service catalog",
      "Booking notifications",
      "Appear in city searches",
      "Owner mobile app",
    ],
    cta: "Start Free — No Card Needed",
  },
  {
    name: "Growth",
    price: "₹499",
    period: "/month",
    highlight: true,
    badge: "Most Popular",
    desc: "For growing salons ready to automate and scale.",
    features: [
      "Everything in Free",
      "Unlimited bookings",
      "Staff & schedule management",
      "Automated SMS reminders",
      "Priority listing in search",
      "Revenue dashboard",
      "Customer database",
    ],
    cta: "Start Growth — 14-Day Free Trial",
  },
  {
    name: "Pro",
    price: "₹999",
    period: "/month",
    highlight: false,
    badge: null,
    desc: "For multi-staff and multi-branch salon businesses.",
    features: [
      "Everything in Growth",
      "Multi-branch management",
      "Advanced analytics & reports",
      "No-show rate tracking",
      "Bulk customer notifications",
      "Featured salon badge",
      "Priority support",
    ],
    cta: "Start Pro — 14-Day Free Trial",
  },
];

const FAQ_ITEMS = [
  {
    q: "Is MySalonBookings really free?",
    a: "Yes — the Free plan is free forever. List your salon, accept up to 30 bookings a month, and get found in local search results at zero cost. No credit card required. Growth and Pro plans are available for salons that want automation, analytics, and unlimited bookings.",
  },
  {
    q: "Do you charge commission on bookings?",
    a: "Never. We charge zero commission on any booking made through MySalonBookings. You keep 100% of your service revenue. Our revenue comes from optional paid plans, not from taking a cut of yours.",
  },
  {
    q: "How is this different from just listing on Google Maps?",
    a: "Google Maps shows you exist. MySalonBookings lets customers book a specific service, with a specific staff member, at a specific time — right from the search result. No phone calls, no back-and-forth. You also get automated reminders, a booking dashboard, and analytics that Google Maps will never give you.",
  },
  {
    q: "What cities are covered?",
    a: "We currently have 500+ verified salons across 25+ cities in India — including metros (Mumbai, Delhi, Bengaluru, Hyderabad, Chennai, Pune) and Tier 2 cities like Jaipur, Lucknow, Indore, Chandigarh, Nagpur, Surat, and more. We're expanding to every city and town in India.",
  },
  {
    q: "How long does setup take?",
    a: "Most salon owners complete their profile — name, services, working hours, photos — in under 5 minutes. Your listing goes live the same day after a quick verification check. You can start accepting bookings within hours of signing up.",
  },
  {
    q: "Does it work for small single-chair salons too?",
    a: "Absolutely — the platform was designed with Indian Tier 2/3 city salons and small parlours in mind. Whether you have 1 staff member or 20, the workflow adapts. The Free plan is specifically sized for smaller operations.",
  },
  {
    q: "Is there a mobile app for salon owners?",
    a: "Yes — there's a dedicated Android app for salon owners to manage bookings, update availability, view the day's schedule, and receive new booking alerts — all from your phone. Available on Google Play.",
  },
];

const STEPS = [
  { n: "01", icon: "🔍", title: "Search & Discover", desc: "Browse salons near you or search by service, city, or rating. Filter by gender preference.", color: "#6366f1" },
  { n: "02", icon: "📅", title: "Pick Your Slot",     desc: "Choose a service and time slot that works for you. See real-time availability instantly.",   color: "#8b5cf6" },
  { n: "03", icon: "✅", title: "Confirmed & Done",   desc: "Get an instant confirmation notification. Show up and enjoy — zero hassle.",                 color: "#6366f1" },
];

const STATS = [
  { value: "500+", label: "Verified Salons",  color: "#6366f1" },
  { value: "50K+", label: "Bookings Made",    color: "#8b5cf6" },
  { value: "4.9★", label: "Average Rating",   color: "#6366f1" },
  { value: "30s",  label: "Avg Booking Time", color: "#8b5cf6" },
];

const CITIES = [
  "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai",
  "Pune", "Jaipur", "Lucknow", "Ahmedabad", "Chandigarh",
  "Nagpur", "Indore", "Surat", "Kochi", "Bhopal",
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
  const [openFaq, setOpenFaq] = useState(null);
  const inputRef = useRef(null);

  const scrollToSalons = () =>
    document.getElementById("salons")?.scrollIntoView({ behavior: "smooth" });

  const handleInput = (val) => {
    if (onSearch) onSearch(val);
  };

  const handleSubmit = () => {
    if (onSearchSubmit) onSearchSubmit();
    setTimeout(scrollToSalons, 200);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleSubmit(); }
  };

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

  const sectionPill = (color = "#6366f1", bg = "rgba(99,102,241,0.08)", border = "rgba(99,102,241,0.22)") => ({
    display: "inline-block", background: bg, border: `1px solid ${border}`,
    borderRadius: 99, padding: "4px 16px", fontSize: 11, color, fontWeight: 700,
    letterSpacing: 1.5, marginBottom: 16,
  });

  const sectionHead = (text) => (
    <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 900, color: "var(--t-text)", letterSpacing: "-1px", marginBottom: 12 }}>
      {text}
    </h2>
  );

  return (
    <>
      <style>{CSS}</style>
      <div style={{ background: "var(--t-bg)", color: "var(--t-text)", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", overflowX: "hidden" }}>

        {/* ══════════════════════════════════════════
            HERO
        ══════════════════════════════════════════ */}
        <section style={{ position: "relative", overflow: "hidden", padding: "clamp(72px,10vh,112px) 20px clamp(56px,7vh,88px)", textAlign: "center" }}>

          {isDark && <>
            <div className="lp-orb1" style={{ position: "absolute", top: -160, left: "4%", width: 640, height: 640, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.18) 0%,transparent 68%)", pointerEvents: "none" }} />
            <div className="lp-orb2" style={{ position: "absolute", top: -80, right: "2%", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,0.13) 0%,transparent 68%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />
          </>}
          {!isDark && <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 60% at 50% -10%,rgba(99,102,241,0.07) 0%,transparent 70%)", pointerEvents: "none" }} />}

          <div className="max-w-3xl mx-auto" style={{ position: "relative", zIndex: 1 }}>

            {/* Dual CTA — top */}
            <div className="lp-u0" style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
              <Link to="/login" className="lp-btn-p"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 999, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none", boxShadow: "0 0 28px rgba(99,102,241,0.4)" }}>
                <span>✂️</span> Book a Salon
              </Link>
              <Link to="/for-salon-owners" className="lp-btn-s"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 999, background: "var(--t-card)", border: "1px solid var(--t-border)", color: "var(--t-text-2)", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
                <span>🏪</span> Grow My Salon
              </Link>
            </div>

            {/* Live badge */}
            <div className="lp-u1" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.22)", borderRadius: 99, padding: "5px 16px", fontSize: 12, color: "var(--t-accent)", fontWeight: 600 }}>
              <span className="lp-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#6366f1", display: "inline-block" }} />
              AI-powered · 500+ salons · 25+ cities across India
            </div>

            {/* Headline */}
            <h1 className="lp-u2" style={{ fontSize: "clamp(2.4rem,7vw,4.6rem)", fontWeight: 900, lineHeight: 1.06, letterSpacing: "-2.5px", marginBottom: 20 }}>
              The smarter way to book<br />
              <span className="lp-shimmer">and grow a salon.</span>
            </h1>

            {/* Subheadline */}
            <p className="lp-u3" style={{ fontSize: "clamp(1rem,2.4vw,1.18rem)", color: "var(--t-text-2)", lineHeight: 1.8, maxWidth: 520, margin: "0 auto 36px" }}>
              For customers: book top-rated salons in 30 seconds — no phone calls, no waiting.<br className="hidden sm:block" />
              For salon owners: automate bookings, reduce no-shows, and grow revenue.
            </p>

            {/* Gender tiles */}
            <div className="lp-u4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 640, margin: "0 auto 28px", textAlign: "left" }}>
              <Link to="/men"
                style={{ display: "flex", borderRadius: 24, textDecoration: "none", background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)", boxShadow: "0 8px 32px rgba(99,102,241,0.38)", overflow: "hidden", minHeight: 200, transition: "all 0.28s ease", position: "relative", cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px) scale(1.015)"; e.currentTarget.style.boxShadow = "0 22px 60px rgba(99,102,241,0.55)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0) scale(1)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(99,102,241,0.38)"; }}
              >
                <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.10)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: -30, left: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
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
                <div style={{ width: 105, display: "flex", alignItems: "center", justifyContent: "center", paddingRight: 8, zIndex: 1 }}>
                  <img src={maleBarberImg} alt="Male Salon Services" style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 16, opacity: 0.88 }} />
                </div>
              </Link>

              <Link to="/women"
                style={{ display: "flex", borderRadius: 24, textDecoration: "none", background: "linear-gradient(135deg,#ec4899 0%,#f43f5e 100%)", boxShadow: "0 8px 32px rgba(236,72,153,0.38)", overflow: "hidden", minHeight: 200, transition: "all 0.28s ease", position: "relative", cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px) scale(1.015)"; e.currentTarget.style.boxShadow = "0 22px 60px rgba(236,72,153,0.55)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0) scale(1)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(236,72,153,0.38)"; }}
              >
                <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.10)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: -30, left: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
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
                <div style={{ width: 105, display: "flex", alignItems: "center", justifyContent: "center", paddingRight: 8, zIndex: 1 }}>
                  <div style={{ width: 90, height: 90, borderRadius: 18, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
                    <img src={femaleSalonImg} alt="Female Salon Services" style={{ width: 90, height: 90, objectFit: "cover" }} />
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
              ✓ Free to book &nbsp;·&nbsp; ✓ Zero booking commission &nbsp;·&nbsp; ✓ Instant confirmation
            </p>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            STATS BAR
        ══════════════════════════════════════════ */}
        <section style={{ borderTop: "1px solid var(--t-border)", borderBottom: "1px solid var(--t-border)", padding: "48px 20px" }}>
          <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
            {STATS.map(({ value, label, color }) => (
              <div key={label} className="lp-hover"
                style={{ background: "var(--t-card)", border: "1px solid var(--t-border)", borderRadius: 20, padding: "24px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-1.5px", color, marginBottom: 6 }}>{value}</div>
                <div style={{ fontSize: 12, color: "var(--t-text-2)", fontWeight: 600 }}>{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            PAIN POINTS
        ══════════════════════════════════════════ */}
        <section style={{ background: "var(--t-bg-2)", borderBottom: "1px solid var(--t-border)", padding: "88px 20px" }}>
          <div className="max-w-5xl mx-auto">
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <div style={sectionPill("#f87171", "rgba(239,68,68,0.07)", "rgba(239,68,68,0.2)")}>THE OLD WAY IS BROKEN</div>
              {sectionHead("Booking a salon shouldn't be this painful.")}
              <p style={{ color: "var(--t-text-2)", fontSize: 15, maxWidth: 460, margin: "0 auto", lineHeight: 1.7 }}>
                Most people still book salons the same way they did in 2005. There's a better way.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { pain: "📞 Endless phone calls", fix: "Book instantly in the app — no calls, no hold music, no callbacks.", color: "#f87171" },
                { pain: "⏳ 'Come back in 30 min'", fix: "See real-time slot availability before you even step outside.", color: "#fb923c" },
                { pain: "😤 Long waits on arrival", fix: "Pick your exact time slot. Walk in, sit down, get styled.", color: "#f87171" },
                { pain: "🤷 No idea which salon is good", fix: "100% verified ratings from real customers. No fake reviews.", color: "#fb923c" },
                { pain: "🤯 Forgetting your appointment", fix: "Auto reminders 24 hrs and 30 min before your booking.", color: "#f87171" },
                { pain: "💸 Surprise pricing at the counter", fix: "Every price listed upfront. Zero surprises at checkout.", color: "#fb923c" },
              ].map(({ pain, fix, color }) => (
                <div key={pain} className="lp-hover"
                  style={{ background: "var(--t-card)", border: "1px solid var(--t-border)", borderRadius: 20, padding: "24px 22px" }}>
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
              <div style={sectionPill()}>HOW IT WORKS</div>
              {sectionHead("Book a salon in 3 steps.")}
              <p style={{ color: "var(--t-text-2)", fontSize: 15, lineHeight: 1.7 }}>No calls, no waiting — tap, pick, confirm.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {STEPS.map(({ n, icon, title, desc, color }) => (
                <div key={n} className="lp-hover"
                  style={{ background: "var(--t-card)", border: "1px solid var(--t-border)", borderRadius: 22, padding: "30px 26px", position: "relative", overflow: "hidden" }}>
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
            AI FEATURES
        ══════════════════════════════════════════ */}
        <section style={{ background: "var(--t-bg-2)", borderTop: "1px solid var(--t-border)", borderBottom: "1px solid var(--t-border)", padding: "88px 20px" }}>
          <div className="max-w-6xl mx-auto">
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <div style={sectionPill("#a78bfa", "rgba(139,92,246,0.08)", "rgba(139,92,246,0.22)")}>PLATFORM</div>
              {sectionHead("Not just a booking app. A growth engine.")}
              <p style={{ color: "var(--t-text-2)", fontSize: 15, maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>
                AI scheduling, zero-touch automation, and revenue intelligence — built for Indian salons.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {AI_FEATURES.map(({ badge, icon, color, title, desc, points }) => (
                <div key={title} className="lp-hover"
                  style={{ background: "var(--t-card)", border: "1px solid var(--t-border)", borderRadius: 24, padding: "32px 28px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: color + "14", border: `1px solid ${color}28`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{icon}</div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color, textTransform: "uppercase", marginBottom: 4 }}>{badge}</div>
                      <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--t-text)", lineHeight: 1.2 }}>{title}</h3>
                    </div>
                  </div>
                  <p style={{ fontSize: 14, color: "var(--t-text-2)", lineHeight: 1.75, marginBottom: 20 }}>{desc}</p>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                    {points.map(p => (
                      <li key={p} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13.5, color: "var(--t-text-2)", lineHeight: 1.5 }}>
                        <span className="lp-check" style={{ color }}>✓</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            BENEFITS — METRICS
        ══════════════════════════════════════════ */}
        <section style={{ padding: "88px 20px" }}>
          <div className="max-w-5xl mx-auto">
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <div style={sectionPill("#10b981", "rgba(16,185,129,0.08)", "rgba(16,185,129,0.22)")}>RESULTS</div>
              {sectionHead("The numbers speak for themselves.")}
              <p style={{ color: "var(--t-text-2)", fontSize: 15, maxWidth: 440, margin: "0 auto", lineHeight: 1.7 }}>
                Real outcomes reported by salons on the MySalonBookings platform.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {BENEFITS.map(({ icon, color, metric, label, headline, desc }) => (
                <div key={label} className="lp-hover"
                  style={{ background: "var(--t-card)", border: "1px solid var(--t-border)", borderRadius: 24, padding: "32px 28px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    <div style={{ fontSize: 36, fontWeight: 900, color, lineHeight: 1 }}>{metric}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t-text-2)", lineHeight: 1.4 }}>{label}</div>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--t-text)", marginBottom: 10, lineHeight: 1.3 }}>{headline}</h3>
                  <p style={{ fontSize: 13.5, color: "var(--t-text-2)", lineHeight: 1.75 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            TESTIMONIALS
        ══════════════════════════════════════════ */}
        <section style={{ background: "var(--t-bg-2)", borderTop: "1px solid var(--t-border)", borderBottom: "1px solid var(--t-border)", padding: "88px 20px" }}>
          <div className="max-w-6xl mx-auto">
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <div style={sectionPill()}>TESTIMONIALS</div>
              {sectionHead("Trusted by owners and customers across India.")}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <span style={{ color: "#f59e0b", fontSize: 17, letterSpacing: 2 }}>★★★★★</span>
                <span style={{ color: "var(--t-text-2)", fontSize: 14, fontWeight: 600 }}>4.9 / 5 · 1,000+ reviews</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {TESTIMONIALS.map(({ name, title, city, avatar, avatarBg, rating, quote }) => (
                <div key={name} className="lp-hover"
                  style={{ background: "var(--t-card)", border: "1px solid var(--t-border)", borderRadius: 22, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
                  <div style={{ display: "flex", gap: 2 }}>
                    {Array(rating).fill(0).map((_, i) => (
                      <span key={i} style={{ color: "#f59e0b", fontSize: 14 }}>★</span>
                    ))}
                  </div>
                  <p style={{ fontSize: 14, color: "var(--t-text-2)", lineHeight: 1.8, flex: 1, fontStyle: "italic" }}>"{quote}"</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: avatarBg, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{avatar}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t-text)" }}>{name}</div>
                      <div style={{ fontSize: 12, color: "var(--t-text-3)" }}>{title} · {city}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            COMPARISON TABLE
        ══════════════════════════════════════════ */}
        <section style={{ padding: "88px 20px" }}>
          <div className="max-w-3xl mx-auto">
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <div style={sectionPill()}>COMPARISON</div>
              {sectionHead("Why salons choose MySalonBookings.")}
              <p style={{ color: "var(--t-text-2)", fontSize: 15, lineHeight: 1.7 }}>
                A booking widget is table stakes. We're the only platform built specifically for Indian salon growth.
              </p>
            </div>
            <div style={{ background: "var(--t-card)", border: "1px solid var(--t-border)", borderRadius: 24, overflow: "hidden" }}>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 140px", background: "rgba(99,102,241,0.06)", borderBottom: "1px solid var(--t-border)", padding: "16px 24px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t-text-3)", textTransform: "uppercase", letterSpacing: 1 }}>Feature</div>
                <div style={{ textAlign: "center", fontSize: 13, fontWeight: 800, color: "#6366f1" }}>MySalonBookings</div>
                <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: "var(--t-text-3)" }}>Others</div>
              </div>
              {COMPARISON.map(({ feature, us, them }, idx) => (
                <div key={feature} style={{ display: "grid", gridTemplateColumns: "1fr 140px 140px", padding: "14px 24px", borderBottom: idx < COMPARISON.length - 1 ? "1px solid var(--t-border)" : "none", alignItems: "center" }}>
                  <div style={{ fontSize: 14, color: "var(--t-text-2)" }}>{feature}</div>
                  <div style={{ textAlign: "center", fontSize: 18 }}>{us ? "✅" : "❌"}</div>
                  <div style={{ textAlign: "center", fontSize: them === true ? 18 : 13, color: them === "Partial" ? "#f59e0b" : "var(--t-text-3)", fontWeight: them === "Partial" ? 600 : 400 }}>
                    {them === true ? "✅" : them === false ? "❌" : them}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            PRICING
        ══════════════════════════════════════════ */}
        <section id="pricing" style={{ background: "var(--t-bg-2)", borderTop: "1px solid var(--t-border)", borderBottom: "1px solid var(--t-border)", padding: "88px 20px" }}>
          <div className="max-w-5xl mx-auto">
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <div style={sectionPill()}>PRICING</div>
              {sectionHead("Start free. Scale when you're ready.")}
              <p style={{ color: "var(--t-text-2)", fontSize: 15, maxWidth: 460, margin: "0 auto", lineHeight: 1.7 }}>
                No credit card required to start. No commissions on bookings — ever. Cancel anytime.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 24, alignItems: "start" }}>
              {PLANS.map(({ name, price, period, highlight, badge, desc, features, cta }) => (
                <div key={name} className={highlight ? "" : "lp-hover"}
                  style={{
                    background: highlight ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "var(--t-card)",
                    border: highlight ? "none" : "1px solid var(--t-border)",
                    borderRadius: 20, padding: "32px 28px", position: "relative",
                    boxShadow: highlight ? "0 20px 60px rgba(99,102,241,0.3)" : undefined,
                    color: highlight ? "#fff" : "inherit",
                  }}>
                  {badge && (
                    <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#f59e0b", color: "#fff", fontWeight: 700, fontSize: 11, padding: "4px 14px", borderRadius: 20, whiteSpace: "nowrap", letterSpacing: "0.05em" }}>{badge}</div>
                  )}
                  <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", opacity: highlight ? 0.85 : 1, color: highlight ? "#fff" : "#6366f1", marginBottom: 10 }}>{name}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
                    <span style={{ fontSize: 40, fontWeight: 900, lineHeight: 1 }}>{price}</span>
                    <span style={{ fontSize: 14, opacity: 0.75 }}>{period}</span>
                  </div>
                  <p style={{ fontSize: 13, opacity: 0.75, lineHeight: 1.5, marginBottom: 4 }}>{desc}</p>
                  <div style={{ height: 1, background: highlight ? "rgba(255,255,255,0.2)" : "var(--t-border)", margin: "18px 0" }} />
                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {features.map(f => (
                      <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13.5, color: highlight ? "#fff" : "var(--t-text-2)", opacity: highlight ? 0.95 : 1 }}>
                        <span style={{ color: highlight ? "#a5f3fc" : "#6366f1", fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/register"
                    style={{ display: "block", textAlign: "center", padding: "13px 0", borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: "none", background: highlight ? "#fff" : "linear-gradient(135deg,#6366f1,#8b5cf6)", color: highlight ? "#4f46e5" : "#fff" }}>
                    {cta}
                  </Link>
                </div>
              ))}
            </div>
            <p style={{ textAlign: "center", color: "var(--t-text-3)", fontSize: 13, marginTop: 24 }}>
              All plans include zero booking commissions · Pay annually, save 17%
            </p>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            CITIES
        ══════════════════════════════════════════ */}
        <section style={{ padding: "72px 20px" }}>
          <div className="max-w-5xl mx-auto" style={{ textAlign: "center" }}>
            <div style={sectionPill()}>COVERAGE</div>
            <h2 style={{ fontSize: "clamp(1.5rem,3.5vw,2.2rem)", fontWeight: 900, color: "var(--t-text)", letterSpacing: "-0.5px", marginBottom: 12 }}>
              Available across India — metros and beyond.
            </h2>
            <p style={{ color: "var(--t-text-2)", fontSize: 15, marginBottom: 36, lineHeight: 1.7 }}>
              The only salon platform that covers Tier 2 and Tier 3 cities — not just metros.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
              {CITIES.map(city => (
                <span key={city} className="lp-hover"
                  style={{ background: "var(--t-card)", border: "1px solid var(--t-border)", borderRadius: 999, padding: "7px 18px", fontSize: 13, fontWeight: 600, color: "var(--t-text-2)", cursor: "default" }}>
                  📍 {city}
                </span>
              ))}
              <span style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.22)", borderRadius: 999, padding: "7px 18px", fontSize: 13, fontWeight: 700, color: "#6366f1" }}>
                + 10 more cities
              </span>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            FAQ
        ══════════════════════════════════════════ */}
        <section style={{ background: "var(--t-bg-2)", borderTop: "1px solid var(--t-border)", borderBottom: "1px solid var(--t-border)", padding: "88px 20px" }}>
          <div className="max-w-2xl mx-auto">
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <div style={sectionPill()}>FAQ</div>
              {sectionHead("Everything you need to know.")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {FAQ_ITEMS.map(({ q, a }, i) => (
                <div key={q} className="lp-hover"
                  style={{ background: "var(--t-card)", border: "1px solid var(--t-border)", borderRadius: 16, overflow: "hidden" }}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "18px 22px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--t-text)", lineHeight: 1.4 }}>{q}</span>
                    <span style={{ fontSize: 20, color: "var(--t-text-3)", flexShrink: 0, transform: openFaq === i ? "rotate(45deg)" : "none", transition: "transform 0.2s ease" }}>+</span>
                  </button>
                  {openFaq === i && (
                    <div style={{ padding: "0 22px 18px" }}>
                      <p style={{ fontSize: 14, color: "var(--t-text-2)", lineHeight: 1.75 }}>{a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            BOTTOM CTA
        ══════════════════════════════════════════ */}
        <section style={{ padding: "100px 20px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          {isDark && <>
            <div className="lp-orb1" style={{ position: "absolute", top: -100, left: "10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.15) 0%,transparent 68%)", pointerEvents: "none" }} />
            <div className="lp-orb2" style={{ position: "absolute", bottom: -80, right: "8%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,0.12) 0%,transparent 68%)", pointerEvents: "none" }} />
          </>}
          <div style={{ position: "relative", zIndex: 1, maxWidth: 600, margin: "0 auto" }}>
            <h2 style={{ fontSize: "clamp(2rem,5vw,3.6rem)", fontWeight: 900, color: "var(--t-text)", letterSpacing: "-1.5px", marginBottom: 16, lineHeight: 1.1 }}>
              Ready to grow<br />
              <span className="lp-shimmer">your salon business?</span>
            </h2>
            <p style={{ color: "var(--t-text-2)", fontSize: "clamp(15px,2.2vw,17px)", maxWidth: 460, margin: "0 auto 40px", lineHeight: 1.7 }}>
              Join 500+ salons already using MySalonBookings. Free forever to start — takes under 5 minutes.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/register" className="lp-btn-p"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 36px", borderRadius: 14, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 16, fontWeight: 800, textDecoration: "none", boxShadow: "0 4px 28px rgba(99,102,241,0.45)" }}>
                List My Salon — It's Free →
              </Link>
              <Link to="/login" className="lp-btn-s"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 28px", borderRadius: 14, background: "var(--t-card)", border: "1px solid var(--t-border)", color: "var(--t-text-2)", fontSize: 16, fontWeight: 700, textDecoration: "none" }}>
                Book a Salon
              </Link>
            </div>
            <p style={{ fontSize: 12, color: "var(--t-text-3)", marginTop: 20 }}>
              No credit card required · Zero booking commissions · Cancel anytime
            </p>
          </div>
        </section>

      </div>
    </>
  );
}
