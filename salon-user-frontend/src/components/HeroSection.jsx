import { useRef, useState } from "react";
import { LocateFixed, Search, X, Calendar, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

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

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="flex flex-col items-center text-center">

          {/* ── CONTENT ── */}
          <div className="w-full">

            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 mx-auto"
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
                <p className="mb-6 leading-relaxed mx-auto" style={{ color: "rgba(148,163,184,0.85)", fontSize: "clamp(0.9rem,2vw,1.1rem)", maxWidth: 480 }}>
                  Ready for your next look today? Salons are waiting.
                </p>
                {/* Stats row */}
                <div className="flex gap-3 mb-7 justify-center">
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
                <p className="mb-7 leading-relaxed mx-auto" style={{ color: "rgba(148,163,184,0.85)", fontSize: "clamp(0.9rem,2vw,1.1rem)", maxWidth: 480 }}>
                  Find the best salons near you in seconds. No waiting, no phone calls — just pick, book, and look great.
                </p>
              </>
            )}

            {/* ── Search bar ── */}
            <div
              className="flex items-center gap-2 px-4 mb-6 transition-all duration-300 mx-auto w-full"
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
                maxWidth: 560,
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
            <div className="flex flex-wrap gap-3 justify-center">
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
