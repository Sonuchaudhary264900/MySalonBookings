import { LocateFixed, Search, X, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

function PhoneMockup() {
  return (
    <div className="relative mx-auto" style={{ width: 220, height: 400 }}>
      {/* Phone shell */}
      <div className="absolute inset-0 bg-slate-900 rounded-[38px] shadow-2xl" style={{ boxShadow: "0 40px 80px rgba(0,0,0,0.45), inset 0 0 0 2px rgba(255,255,255,0.06)" }} />
      {/* Dynamic island */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-900 rounded-full z-10" />
      {/* Screen */}
      <div className="absolute inset-[4px] rounded-[34px] overflow-hidden bg-white">
        {/* App header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-3 pt-7 pb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white text-[10px] font-extrabold tracking-wide">My Salon Bookings</span>
            <span className="text-white/70 text-[8px]">📍 Mumbai</span>
          </div>
          <div className="bg-white rounded-xl px-2.5 py-2 flex items-center gap-1.5 shadow-sm">
            <Search className="w-3 h-3 text-indigo-400 shrink-0" />
            <span className="text-[9px] text-slate-400">Search salons, services...</span>
          </div>
        </div>
        {/* Category pills */}
        <div className="flex gap-1.5 px-2 pt-2 pb-1 overflow-hidden">
          {["All ✓", "Hair ✂", "Spa 💆", "Beard 🧔"].map((c, i) => (
            <span key={c} className={`text-[7.5px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${i === 0 ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>{c}</span>
          ))}
        </div>
        {/* Section label */}
        <div className="px-2 pb-1">
          <span className="text-[8.5px] font-bold text-slate-700">Salons Near You</span>
        </div>
        {/* Salon cards */}
        <div className="px-2 space-y-2">
          {[
            { name: "Sharma Cuts", tag: "Barber", rating: "4.9", dist: "0.8 km", color: "from-indigo-200 to-violet-200", open: true },
            { name: "Glam Studio", tag: "Unisex", rating: "4.7", dist: "1.2 km", color: "from-rose-200 to-pink-200", open: true },
            { name: "Royal Shave", tag: "Men", rating: "4.6", dist: "2.1 km", color: "from-amber-200 to-orange-200", open: false },
          ].map(({ name, tag, rating, dist, color, open }) => (
            <div key={name} className="rounded-xl overflow-hidden border border-slate-100 shadow-sm">
              <div className={`h-14 bg-gradient-to-br ${color} relative flex items-center justify-center`}>
                <span className="text-xl">✂</span>
                <span className={`absolute top-1.5 left-1.5 text-[7px] font-bold px-1.5 py-0.5 rounded-full ${open ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>{open ? "Open" : "Closed"}</span>
                <span className="absolute top-1.5 right-1.5 text-[7px] font-bold bg-black/40 text-white px-1.5 py-0.5 rounded-full">{tag}</span>
              </div>
              <div className="px-2 py-1.5 bg-white flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold text-slate-900">{name}</p>
                  <p className="text-[7.5px] text-slate-400">📍 {dist}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[8px] text-amber-500 font-bold">⭐ {rating}</span>
                  <span className="text-[7.5px] font-bold text-white bg-indigo-600 px-1.5 py-0.5 rounded-full">Book</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Home bar */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-14 h-1 bg-white/30 rounded-full" />
    </div>
  );
}

export default function HeroSection({
  searchText, onSearch, onLocate, locLoading, searching,
  isLoggedIn = false, userName = "there", nearbyCount = 0, upcomingCount = 0,
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -left-16 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/3 w-64 h-64 bg-indigo-400/10 rounded-full blur-2xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">

          {/* ── LEFT ── */}
          <div className="text-center lg:text-left order-2 lg:order-1">

            {isLoggedIn ? (
              /* ── LOGGED-IN STATE ── */
              <>
                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-4">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shrink-0" />
                  <span className="text-white/90 text-xs sm:text-sm font-medium">Your personal salon assistant</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight mb-2">
                  Welcome back,<br />
                  <span className="text-yellow-300">{userName} 👋</span>
                </h1>
                <p className="text-indigo-100 text-sm sm:text-base leading-relaxed mb-5 max-w-md mx-auto lg:mx-0">
                  Ready for your next look today?
                </p>
                {/* Quick stats row */}
                <div className="flex gap-3 mb-6 justify-center lg:justify-start">
                  {nearbyCount > 0 && (
                    <div className="bg-white/10 border border-white/20 rounded-2xl px-4 py-2.5 text-center">
                      <p className="text-white font-extrabold text-xl leading-tight">{nearbyCount}</p>
                      <p className="text-indigo-200 text-xs mt-0.5">Salons Nearby</p>
                    </div>
                  )}
                  <div className="bg-white/10 border border-white/20 rounded-2xl px-4 py-2.5 text-center">
                    <p className="text-white font-extrabold text-xl leading-tight">{upcomingCount}</p>
                    <p className="text-indigo-200 text-xs mt-0.5">Upcoming</p>
                  </div>
                  <div className="bg-white/10 border border-white/20 rounded-2xl px-4 py-2.5 text-center">
                    <p className="text-white font-extrabold text-xl leading-tight">4.9⭐</p>
                    <p className="text-indigo-200 text-xs mt-0.5">Avg Rating</p>
                  </div>
                </div>
              </>
            ) : (
              /* ── LOGGED-OUT STATE ── */
              <>
                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-5">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shrink-0" />
                  <span className="text-white/90 text-xs sm:text-sm font-medium">1,000+ happy customers across India</span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-[2.85rem] font-extrabold text-white leading-[1.1] tracking-tight mb-4">
                  Discover &amp; Book<br />
                  <span className="text-yellow-300">Top Salons</span><br />
                  Near You
                </h1>
                <p className="text-indigo-100 text-sm sm:text-base leading-relaxed mb-7 max-w-md mx-auto lg:mx-0">
                  Find the best salons near you in seconds. No waiting, no phone calls — just pick, book, and look great.
                </p>
              </>
            )}

            {/* ── Search bar — always shown ── */}
            <div
              className="flex items-center gap-2 bg-white rounded-2xl px-4 shadow-xl shadow-indigo-900/25 mb-5 max-w-lg mx-auto lg:mx-0"
              style={{ height: 52 }}
            >
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search salons, services, city..."
                value={searchText}
                onChange={(e) => onSearch(e.target.value)}
                style={{ fontSize: 16 }}
                className="flex-1 text-slate-800 placeholder-slate-400 outline-none bg-transparent min-w-0"
              />
              {searchText && !searching && (
                <button onClick={() => onSearch("")} className="shrink-0">
                  <X className="w-4 h-4 text-slate-400 hover:text-slate-600 transition" />
                </button>
              )}
              {searching && (
                <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
              )}
              <button
                onClick={onLocate}
                disabled={locLoading}
                title="Use my location"
                className="w-9 h-9 bg-indigo-50 hover:bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 transition shrink-0 disabled:opacity-50"
              >
                {locLoading
                  ? <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  : <LocateFixed className="w-4 h-4" />}
              </button>
            </div>

            {/* ── CTA buttons ── */}
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
              <a
                href="#salons"
                className="inline-flex items-center gap-2 bg-white text-indigo-700 font-bold px-7 py-3 rounded-xl hover:bg-yellow-300 hover:text-indigo-800 transition-all shadow-lg shadow-indigo-900/20 text-sm"
              >
                🔍 Find Salons
              </a>
              {isLoggedIn ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 bg-white/10 border border-white/25 text-white font-semibold px-7 py-3 rounded-xl hover:bg-white/20 transition-all text-sm"
                >
                  <Calendar className="w-4 h-4" /> My Bookings
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 bg-white/10 border border-white/25 text-white font-semibold px-7 py-3 rounded-xl hover:bg-white/20 transition-all text-sm"
                >
                  Join as Salon Owner →
                </Link>
              )}
            </div>
          </div>

          {/* ── RIGHT — phone mockup ── */}
          <div className="flex justify-center lg:justify-end order-1 lg:order-2">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-400/20 rounded-full blur-3xl scale-90" />
              <PhoneMockup />
              {/* Floating badge — top rated */}
              <div
                className="absolute -left-2 sm:-left-6 top-16 bg-white rounded-2xl shadow-xl px-3 py-2 flex items-center gap-2 animate-bounce"
                style={{ animationDuration: "3s" }}
              >
                <span className="text-xl">⭐</span>
                <div>
                  <p className="text-xs font-bold text-slate-800 leading-tight">Top Rated</p>
                  <p className="text-[10px] text-slate-500">4.9 avg rating</p>
                </div>
              </div>
              {/* Floating badge — verified */}
              <div
                className="absolute -right-2 sm:-right-6 bottom-28 bg-white rounded-2xl shadow-xl px-3 py-2 flex items-center gap-2 animate-bounce"
                style={{ animationDuration: "4s", animationDelay: "1s" }}
              >
                <span className="text-xl">✅</span>
                <div>
                  <p className="text-xs font-bold text-slate-800 leading-tight">Verified</p>
                  <p className="text-[10px] text-slate-500">500+ salons</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
