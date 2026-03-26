import { useRef, useState } from "react";
import { LocateFixed, Search, X, Calendar, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

/* ── Phone Mockup ──────────────────────────────────────────────── */
function PhoneMockup() {
  return (
    <div className="relative mx-auto float-anim" style={{ width: 220, height: 400 }}>
      {/* Glow behind phone */}
      <div
        className="absolute inset-0 rounded-[38px] blur-2xl scale-110 opacity-40"
        style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)" }}
      />
      {/* Phone shell */}
      <div
        className="absolute inset-0 rounded-[38px]"
        style={{
          background: "linear-gradient(145deg, #1a1a2e, #0d0d1a)",
          boxShadow: "0 40px 80px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.08)",
        }}
      />
      {/* Dynamic island */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 rounded-full z-10" style={{ background: "#0a0a14" }} />
      {/* Screen */}
      <div className="absolute inset-[4px] rounded-[34px] overflow-hidden" style={{ background: "#0a0a14" }}>
        {/* App header */}
        <div style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }} className="px-3 pt-7 pb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white text-[10px] font-extrabold tracking-wide">My Salon Bookings</span>
            <span className="text-white/60 text-[8px]">📍 Mumbai</span>
          </div>
          <div className="rounded-xl px-2.5 py-2 flex items-center gap-1.5" style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}>
            <Search className="w-3 h-3 text-white/60 shrink-0" />
            <span className="text-[9px] text-white/50">Search salons, services...</span>
          </div>
        </div>
        {/* Category pills */}
        <div className="flex gap-1.5 px-2 pt-2 pb-1 overflow-hidden" style={{ background: "#0d0d1a" }}>
          {["All ✓", "Hair ✂", "Spa 💆", "Beard 🧔"].map((c, i) => (
            <span
              key={c}
              className="text-[7.5px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0"
              style={i === 0
                ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" }
                : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }
              }
            >{c}</span>
          ))}
        </div>
        {/* Section label */}
        <div className="px-2 pb-1" style={{ background: "#0d0d1a" }}>
          <span className="text-[8.5px] font-bold text-white/70">Salons Near You</span>
        </div>
        {/* Salon cards */}
        <div className="px-2 space-y-2" style={{ background: "#0d0d1a" }}>
          {[
            { name: "Sharma Cuts", tag: "Barber", rating: "4.9", dist: "0.8 km", gr: "from-indigo-700 to-violet-700", open: true },
            { name: "Glam Studio", tag: "Unisex", rating: "4.7", dist: "1.2 km", gr: "from-rose-700 to-pink-700", open: true },
            { name: "Royal Shave", tag: "Men",   rating: "4.6", dist: "2.1 km", gr: "from-amber-700 to-orange-700", open: false },
          ].map(({ name, tag, rating, dist, gr, open }) => (
            <div key={name} className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className={`h-14 bg-gradient-to-br ${gr} relative flex items-center justify-center`}>
                <span className="text-xl">✂</span>
                <span className={`absolute top-1.5 left-1.5 text-[7px] font-bold px-1.5 py-0.5 rounded-full ${open ? "bg-green-500" : "bg-red-500"} text-white`}>{open ? "Open" : "Closed"}</span>
                <span className="absolute top-1.5 right-1.5 text-[7px] font-bold text-white px-1.5 py-0.5 rounded-full" style={{ background: "rgba(0,0,0,0.4)" }}>{tag}</span>
              </div>
              <div className="px-2 py-1.5 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div>
                  <p className="text-[9px] font-bold text-white/90">{name}</p>
                  <p className="text-[7.5px] text-white/40">📍 {dist}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[8px] text-amber-400 font-bold">⭐ {rating}</span>
                  <span className="text-[7.5px] font-bold text-white px-1.5 py-0.5 rounded-full" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>Book</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Home bar */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-14 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
    </div>
  );
}

/* ── Hero Section ──────────────────────────────────────────────── */
export default function HeroSection({
  searchText, onSearch, onLocate, locLoading, searching,
  isLoggedIn = false, userName = "there", nearbyCount = 0, upcomingCount = 0,
}) {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);

  const PAGE_BG = "#050509";
  const ORB_1   = "rgba(99,102,241,0.18)";
  const ORB_2   = "rgba(139,92,246,0.14)";
  const ORB_3   = "rgba(6,182,212,0.10)";

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: `linear-gradient(160deg, ${PAGE_BG} 0%, #0a0814 50%, ${PAGE_BG} 100%)`, minHeight: 600 }}
    >
      {/* ── Animated background orbs ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="orb-anim absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-3xl" style={{ background: ORB_1 }} />
        <div className="orb-anim-r absolute -bottom-32 -right-32 w-[450px] h-[450px] rounded-full blur-3xl" style={{ background: ORB_2 }} />
        <div className="orb-anim absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full blur-3xl" style={{ background: ORB_3 }} />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)", backgroundSize: "60px 60px" }}
        />
        {/* Scan line */}
        <div className="absolute inset-x-0 h-[1px] opacity-10" style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.8), transparent)", animation: "scan-line 8s linear infinite" }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-18">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* ── LEFT ── */}
          <div className="text-center lg:text-left order-2 lg:order-1">

            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6"
              style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              {isLoggedIn
                ? <span className="text-indigo-300 text-xs font-semibold">Your personal salon assistant</span>
                : <span className="text-indigo-300 text-xs font-semibold">1,000+ happy customers across India</span>}
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
            </div>

            {/* Headline */}
            {isLoggedIn ? (
              <>
                <h1 className="font-black tracking-tight leading-[1.05] mb-4" style={{ fontSize: "clamp(2.2rem,5.5vw,3.8rem)", color: "#f8fafc" }}>
                  Welcome back,<br />
                  <span className="text-neon-gradient">{userName} 👋</span>
                </h1>
                <p className="mb-6 leading-relaxed" style={{ color: "rgba(148,163,184,0.85)", fontSize: "clamp(0.9rem,2vw,1.1rem)", maxWidth: 480 }}>
                  Ready for your next look today? Salons are waiting.
                </p>
                {/* Stats row */}
                <div className="flex gap-3 mb-7 justify-center lg:justify-start">
                  {nearbyCount > 0 && (
                    <div className="glass-dark rounded-2xl px-4 py-3 text-center">
                      <p className="text-white font-black text-2xl leading-none">{nearbyCount}</p>
                      <p className="text-indigo-300 text-xs mt-1">Salons Nearby</p>
                    </div>
                  )}
                  <div className="glass-dark rounded-2xl px-4 py-3 text-center">
                    <p className="text-white font-black text-2xl leading-none">{upcomingCount}</p>
                    <p className="text-indigo-300 text-xs mt-1">Upcoming</p>
                  </div>
                  <div className="glass-dark rounded-2xl px-4 py-3 text-center">
                    <p className="font-black text-2xl leading-none text-neon-gradient">4.9⭐</p>
                    <p className="text-indigo-300 text-xs mt-1">Avg Rating</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h1 className="font-black tracking-tight leading-[1.05] mb-4" style={{ fontSize: "clamp(2.4rem,6vw,4.2rem)", color: "#f8fafc" }}>
                  Discover &amp; Book<br />
                  <span className="text-neon-gradient">Top Salons</span><br />
                  Near You
                </h1>
                <p className="mb-7 leading-relaxed" style={{ color: "rgba(148,163,184,0.85)", fontSize: "clamp(0.9rem,2vw,1.1rem)", maxWidth: 460 }}>
                  Find the best salons near you in seconds. No waiting, no phone calls — just pick, book, and look great.
                </p>
              </>
            )}

            {/* ── Search bar ── */}
            <div
              className="flex items-center gap-2 px-4 mb-6 transition-all duration-300"
              style={{
                height: 54,
                background: focused ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.05)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: focused
                  ? "1px solid rgba(99,102,241,0.55)"
                  : "1px solid rgba(255,255,255,0.10)",
                borderRadius: 16,
                boxShadow: focused ? "0 0 0 3px rgba(99,102,241,0.12), 0 0 24px rgba(99,102,241,0.15)" : "none",
                maxWidth: 500,
              }}
            >
              <Search className="w-4 h-4 shrink-0" style={{ color: focused ? "#818cf8" : "rgba(148,163,184,0.6)" }} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search salons, services, city..."
                value={searchText}
                onChange={(e) => onSearch(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={{ fontSize: 16, background: "transparent", color: "#f1f5f9", flex: 1, outline: "none", minWidth: 0 }}
                className="placeholder-slate-500"
              />
              {searchText && !searching && (
                <button onClick={() => onSearch("")} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
              {searching && <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />}
              <button
                onClick={onLocate}
                disabled={locLoading}
                title="Use my location"
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 disabled:opacity-50"
                style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.35)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(99,102,241,0.2)"; }}
              >
                {locLoading
                  ? <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  : <LocateFixed className="w-4 h-4" />}
              </button>
            </div>

            {/* ── CTA buttons ── */}
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
              <a
                href="#salons"
                className="neon-btn inline-flex items-center gap-2 font-bold px-8 py-3.5 rounded-2xl text-white text-sm"
              >
                🔍 Find Salons
              </a>
              {isLoggedIn ? (
                <Link
                  to="/dashboard"
                  className="glass-btn inline-flex items-center gap-2 font-semibold px-8 py-3.5 rounded-2xl text-white/90 text-sm"
                >
                  <Calendar className="w-4 h-4" /> My Bookings
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="glass-btn inline-flex items-center gap-2 font-semibold px-8 py-3.5 rounded-2xl text-white/90 text-sm"
                >
                  Join as Salon Owner →
                </Link>
              )}
            </div>
          </div>

          {/* ── RIGHT — phone mockup ── */}
          <div className="flex justify-center lg:justify-end order-1 lg:order-2">
            <div className="relative">
              <PhoneMockup />

              {/* Floating badge — Top Rated */}
              <div
                className="float-anim-slow absolute -left-4 sm:-left-8 top-14 rounded-2xl px-3 py-2.5 flex items-center gap-2"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm" style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>⭐</div>
                <div>
                  <p className="text-xs font-bold text-white leading-tight">Top Rated</p>
                  <p className="text-[10px]" style={{ color: "rgba(148,163,184,0.7)" }}>4.9 avg rating</p>
                </div>
              </div>

              {/* Floating badge — Verified */}
              <div
                className="float-anim absolute -right-4 sm:-right-8 bottom-24 rounded-2xl px-3 py-2.5 flex items-center gap-2"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  animationDelay: "1s",
                }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm" style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}>✅</div>
                <div>
                  <p className="text-xs font-bold text-white leading-tight">Verified</p>
                  <p className="text-[10px]" style={{ color: "rgba(148,163,184,0.7)" }}>500+ salons</p>
                </div>
              </div>

              {/* Floating badge — Book Now */}
              <div
                className="float-anim-slow absolute -left-2 sm:-left-6 bottom-10 rounded-2xl px-3 py-2 flex items-center gap-2"
                style={{
                  background: "rgba(99,102,241,0.15)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid rgba(99,102,241,0.3)",
                  boxShadow: "0 0 20px rgba(99,102,241,0.2)",
                  animationDelay: "2s",
                }}
              >
                <span className="text-base">🚀</span>
                <span className="text-xs font-bold text-indigo-300">Instant Booking</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom fade */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-24"
        style={{ background: "linear-gradient(to bottom, transparent, #050509)" }}
      />
    </section>
  );
}
