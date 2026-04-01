import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { LocateFixed, Search, X, SearchX } from "lucide-react";
import API from "../services/api";
import SalonCard from "../components/SalonCard";
import LandingPage from "./LandingPage";

// ── Helpers ──────────────────────────────────────────────────────
function getUserName() {
  try {
    const token = localStorage.getItem("customerToken");
    if (!token) return "there";
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.name || payload.firstName || payload.username || "there";
  } catch { return "there"; }
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

// ── Data ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: "all",                  label: "All",     icon: "✦" },
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

const CATEGORY_ALIASES = {
  "Hair Services":        ["Hair Services", "Hair Services (Men)", "Hair Services (Women)"],
  "Skin & Face / Beauty": ["Skin & Face / Beauty", "Skin & Face (Men Grooming)", "Skin & Beauty"],
  "Spa & Massage":        ["Spa & Massage", "Spa & Relaxation"],
};

const MALE_ONLY_CHIPS   = ["Beard & Grooming", "Body Grooming"];
const FEMALE_ONLY_CHIPS = ["Bridal & Events"];

const GENDER_FILTERS = [
  { key: "all",    label: "All" },
  { key: "male",   label: "👨 Men" },
  { key: "female", label: "👩 Women" },
  { key: "unisex", label: "👥 Unisex" },
];

const SORT_OPTIONS = [
  { key: "nearby", label: "Near You",   icon: "📍" },
  { key: "rated",  label: "Top Rated",  icon: "⭐" },
  { key: "booked", label: "Trending",   icon: "🔥" },
];

const QUICK_ACTIONS = [
  { key: "bookings",  icon: "📅", label: "Book Again",  sub: "Your history",  to: "/dashboard",  color: "#818cf8" },
  { key: "top-rated", icon: "⭐", label: "Top Rated",   sub: "Best salons",   sort: "rated",     color: "#fcd34d" },
  { key: "nearby",    icon: "📍", label: "Near Me",     sub: "Within 5 km",   sort: "nearby",    color: "#34d399" },
  { key: "trending",  icon: "🔥", label: "Trending",    sub: "Most booked",   sort: "booked",    color: "#f97316" },
  { key: "favorites", icon: "❤️", label: "Saved",       sub: "Your wishlist", to: "/favorites",  color: "#f472b6" },
];

// ── Skeleton ─────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: "var(--t-card)", border: "1px solid var(--t-border)" }}>
      <div className="h-44 skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-4 skeleton rounded-lg w-3/4" />
        <div className="h-3 skeleton rounded-lg w-1/2" />
        <div className="h-9 skeleton rounded-xl w-full mt-2" />
      </div>
    </div>
  );
}

// ── Shared search input ───────────────────────────────────────────
function SearchInput({ value, onChange, onSearch, onFocus, onBlur, focused, onClear, onLocate, locLoading, searching, compact }) {
  const handleKey = e => { if (e.key === 'Enter') { e.preventDefault(); onSearch?.(); } };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 10 : 12,
        padding: compact ? "0 16px" : "0 20px",
        height: compact ? 46 : 62,
        borderRadius: 999,
        background: focused ? "var(--t-card)" : "var(--t-input-bg)",
        border: focused ? "1.5px solid rgba(99,102,241,0.55)" : "1.5px solid var(--t-border)",
        boxShadow: focused
          ? "0 0 0 4px rgba(99,102,241,0.08), 0 8px 32px rgba(99,102,241,0.12)"
          : compact ? "none" : "0 4px 24px rgba(0,0,0,0.07)",
        transition: "all 0.22s ease",
      }}
    >
      <button
        onClick={onSearch}
        style={{ display: "flex", background: "none", border: "none", cursor: value ? "pointer" : "default", padding: 0, flexShrink: 0 }}
        title="Search"
      >
        <Search style={{ width: compact ? 16 : 18, height: compact ? 16 : 18, color: focused ? "var(--t-accent)" : "var(--t-text-3)", transition: "color 0.2s" }} />
      </button>
      <input
        type="text"
        placeholder="Search salons, services, city…"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKey}
        onFocus={onFocus}
        onBlur={onBlur}
        style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: compact ? 14 : 16, color: "var(--t-text)", minWidth: 0 }}
      />
      {value && !searching && (
        <button onClick={onClear} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", opacity: 0.6 }}>
          <X style={{ width: 15, height: 15, color: "var(--t-text-2)" }} />
        </button>
      )}
      {searching && (
        <span style={{ width: 15, height: 15, border: "2px solid var(--t-accent)", borderTopColor: "transparent", borderRadius: "50%", display: "block", flexShrink: 0, animation: "spin 0.7s linear infinite" }} />
      )}
      <div style={{ width: 1, height: 20, background: "var(--t-border)", flexShrink: 0 }} />
      <button
        onClick={onLocate}
        disabled={locLoading}
        title="Detect location"
        style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "var(--t-accent)", fontSize: 12, fontWeight: 600, flexShrink: 0, opacity: locLoading ? 0.5 : 1 }}
      >
        {locLoading
          ? <span style={{ width: 14, height: 14, border: "2px solid var(--t-accent)", borderTopColor: "transparent", borderRadius: "50%", display: "block", animation: "spin 0.7s linear infinite" }} />
          : <LocateFixed style={{ width: 15, height: 15 }} />}
        {!compact && <span className="hidden sm:inline" style={{ fontSize: 12 }}>Locate</span>}
      </button>
    </div>
  );
}

// ── isOpenNow (mirrors SalonCard logic) ──────────────────────────
const DAYS = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
function isOpenNow(workingHours) {
  if (!workingHours) return null;
  const todayKey = DAYS[new Date().getDay()];
  const h = workingHours[todayKey];
  if (!h || h.isClosed || !h.open || !h.close) return false;
  const now = new Date();
  const nowM = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = h.open.split(":").map(Number);
  const [ch, cm] = h.close.split(":").map(Number);
  return nowM >= oh * 60 + om && nowM < ch * 60 + cm;
}

// ── Main Component ────────────────────────────────────────────────
export default function Home() {
  const isLoggedIn = !!localStorage.getItem("customerToken");
  const [userName, setUserName] = useState(() => getUserName());

  const [salons, setSalons]             = useState([]);
  const [allSalons, setAllSalons]       = useState([]);
  const [selectedCats, setSelectedCats] = useState([]);
  const [genderFilter, setGenderFilter] = useState(() => {
    const g = localStorage.getItem("customerGender");
    return g === "male" || g === "female" ? g : "all";
  });
  const [sort, setSort]                 = useState("nearby");
  const [loading, setLoading]           = useState(true);
  const [locLoading, setLocLoading]     = useState(false);
  const [locDenied, setLocDenied]       = useState(false);
  const [searchText, setSearchText]     = useState("");
  const [searching, setSearching]       = useState(false);
  const [focused, setFocused]           = useState(false);
  const [stickyFocused, setStickyFocused] = useState(false);
  const [openNow, setOpenNow]           = useState(false);
  const [userCoords, setUserCoords]     = useState(null);
  const [serviceMatchLabel, setServiceMatchLabel] = useState("");
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [showSticky, setShowSticky]     = useState(false);
  const heroSearchRef = useRef(null);

  // ── Fetch real name + gender from API ────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    API.get("/customer/auth/me").then(res => {
      const d = res.data?.data || {};
      const n = d.name || d.firstName || "";
      if (n) setUserName(n);
      // Auto-apply gender from profile (overrides localStorage)
      if (d.gender === "male" || d.gender === "female") {
        setGenderFilter(d.gender);
        localStorage.setItem("customerGender", d.gender);
      }
    }).catch(() => {});
  }, [isLoggedIn]);

  // ── Sticky search observer ────────────────────────────────────
  useEffect(() => {
    if (!heroSearchRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { rootMargin: "-68px 0px 0px 0px", threshold: 0 }
    );
    observer.observe(heroSearchRef.current);
    return () => observer.disconnect();
  }, []);

  // ── Location on mount ─────────────────────────────────────────
  useEffect(() => {
    let ignore = false;
    if (!navigator.geolocation) { setLocDenied(true); setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        if (ignore) return;
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        fetchBySort("nearby", coords);
      },
      () => { if (!ignore) { setLocDenied(true); setLoading(false); } },
      { enableHighAccuracy: false, maximumAge: 120000, timeout: 12000 }
    );
    return () => { ignore = true; };
  }, []);

  // ── Upcoming bookings ─────────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    API.get("/customer/bookings").then(res => {
      const arr = res.data.data?.bookings || res.data.data || [];
      setUpcomingCount(Array.isArray(arr) ? arr.filter(b => ["pending", "confirmed", "in_progress"].includes(b.status)).length : 0);
    }).catch(() => {});
  }, [isLoggedIn]);

  const applyFilters = (data, cats, gender, onlyOpen) => {
    let r = data;
    if (cats.length > 0) {
      r = r.filter(s => cats.some(cat => {
        const aliases = CATEGORY_ALIASES[cat] || [cat];
        return (s.offeredCategoryNames || []).some(n => aliases.includes(n));
      }));
    }
    if (gender === "unisex") { r = r.filter(s => (s.servedGender || "unisex") === "unisex"); }
    else if (gender !== "all") { r = r.filter(s => { const sg = s.servedGender || "unisex"; return sg === gender || sg === "unisex"; }); }
    if (onlyOpen) { r = r.filter(s => isOpenNow(s.workingHours) === true); }
    return r;
  };

  const fetchBySort = async (sortKey, coords, cats, gender) => {
    if (!coords) return;
    setLoading(true);
    setSearchText("");
    setServiceMatchLabel("");
    try {
      const res = await API.get(`/public/salons/nearby?latitude=${coords.lat}&longitude=${coords.lng}&sort=${sortKey}`);
      const data = res.data.data?.salons || res.data.data || [];
      setAllSalons(data);
      setSalons(applyFilters(data, cats ?? selectedCats, gender ?? genderFilter, openNow));
    } catch { setAllSalons([]); setSalons([]); }
    finally { setLoading(false); }
  };

  const handleCategory = cat => {
    const newCats = cat === "all" ? [] : selectedCats.includes(cat) ? selectedCats.filter(c => c !== cat) : [...selectedCats, cat];
    setSelectedCats(newCats);
    if (searchText.trim()) { runSearch(searchText, newCats); }
    else { setSalons(applyFilters(allSalons, newCats, genderFilter, openNow)); }
  };

  const handleGenderFilter = gender => {
    const newCats = selectedCats.filter(k => {
      if (gender === "female" && MALE_ONLY_CHIPS.includes(k)) return false;
      if (gender === "male"   && FEMALE_ONLY_CHIPS.includes(k)) return false;
      return true;
    });
    setSelectedCats(newCats);
    setGenderFilter(gender);
    if (searchText.trim()) { runSearch(searchText, newCats, gender); }
    else { setSalons(applyFilters(allSalons, newCats, gender, openNow)); }
  };

  const handleOpenNow = () => {
    const next = !openNow;
    setOpenNow(next);
    setSalons(applyFilters(allSalons, selectedCats, genderFilter, next));
  };

  const runSearch = useCallback(async (text, cats, gender) => {
    if (!text.trim()) return;
    setSearching(true);
    setServiceMatchLabel("");
    const q = text.toLowerCase();
    const activeCats   = cats   ?? selectedCats;
    const activeGender = gender ?? genderFilter;
    const local  = allSalons.filter(s => s.name?.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q) || s.address?.toLowerCase().includes(q));
    const localF = applyFilters(local, activeCats, activeGender, openNow);
    if (localF.length > 0) { setSalons(localF); setSearching(false); return; }
    try {
      const res  = await API.get(`/public/services/search?q=${encodeURIComponent(text.trim())}`);
      const data = res.data.data;
      if (data?.salons?.length > 0) { setSalons(applyFilters(data.salons, activeCats, activeGender, openNow)); setServiceMatchLabel(`Salons offering "${data.matchedService}"`); }
      else { setSalons([]); }
    } catch { setSalons([]); }
    finally { setSearching(false); }
  }, [allSalons, selectedCats, genderFilter, openNow]);

  const handleSearch = text => {
    setSearchText(text);
    if (!text.trim()) { setServiceMatchLabel(""); setSalons(applyFilters(allSalons, selectedCats, genderFilter, openNow)); }
  };

  const handleSearchSubmit = () => {
    if (!searchText.trim()) return;
    runSearch(searchText, selectedCats);
  };

  const handleLocation = async () => {
    if (!navigator.geolocation) {
      alert("Your browser does not support location. Please try Chrome or Firefox.");
      return;
    }
    // Opera / some browsers need a permissions check first — without this they silently fail
    if (navigator.permissions) {
      try {
        const result = await navigator.permissions.query({ name: "geolocation" });
        if (result.state === "denied") {
          setLocDenied(true);
          alert("Location access is blocked. Please allow it in your browser's address bar settings, then try again.");
          return;
        }
      } catch { /* permissions API not supported — proceed anyway */ }
    }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        setLocDenied(false);
        setSort("nearby");
        setGenderFilter("all");
        fetchBySort("nearby", coords, [], "all").finally(() => setLocLoading(false));
      },
      err => {
        setLocLoading(false);
        setLocDenied(true);
        if (err.code === 1) {
          alert("Location access denied. Click the lock/location icon in your browser's address bar and allow location, then try again.");
        } else {
          alert("Could not detect your location. Please check your device's location settings.");
        }
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 120000 }
    );
  };

  const handleSortChange = (key) => {
    setSort(key);
    if (!searchText.trim()) fetchBySort(key, userCoords, selectedCats, genderFilter);
    setTimeout(() => document.getElementById("salon-grid")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const clearAll = () => {
    setSearchText("");
    setSelectedCats([]);
    setGenderFilter("all");
    setOpenNow(false);
    setServiceMatchLabel("");
    setSalons(allSalons);
  };

  const isSearchActive  = searchText.trim().length > 0;
  const isFiltered      = selectedCats.length > 0 || genderFilter !== "all" || openNow;
  const hasActiveState  = isSearchActive || isFiltered;

  const sectionTitle = serviceMatchLabel
    || (isSearchActive  ? "Search Results"
    : sort === "rated"  ? "Top Rated Salons"
    : sort === "booked" ? "Trending Salons"
    : "Salons Near You");

  // ── Guest view ───────────────────────────────────────────────
  if (!isLoggedIn) {
    const guestSalonGrid = (
      <div id="salons">
        {/* Gender selector for guests — prominent, required to filter services */}
        {genderFilter === "all" && (
          <div style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.08))", border: "1px solid rgba(99,102,241,0.18)", borderRadius: 16, padding: "16px 18px", marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--t-text)", marginBottom: 4 }}>Who are you booking for?</p>
            <p style={{ fontSize: 11, color: "var(--t-text-3)", marginBottom: 12 }}>Select your gender to see relevant services and salons.</p>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ key: "male", label: "👨 Men", desc: "Haircuts, beard & grooming" }, { key: "female", label: "👩 Women", desc: "Hair, beauty & bridal" }].map(({ key, label, desc }) => (
                <button key={key} onClick={() => handleGenderFilter(key)} style={{ flex: 1, padding: "10px 12px", borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.18s ease", background: "var(--t-card)", border: "2px solid var(--t-border)", color: "var(--t-text)", textAlign: "left" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.background = "rgba(99,102,241,0.06)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--t-border)"; e.currentTarget.style.background = "var(--t-card)"; }}>
                  <div>{label}</div>
                  <div style={{ fontSize: 10, fontWeight: 400, color: "var(--t-text-3)", marginTop: 2 }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Section header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--t-text)", marginBottom: 2 }}>
              {serviceMatchLabel || (sort === "rated" ? "Top Rated Salons" : sort === "booked" ? "Trending Salons" : "Salons Near You")}
            </h2>
            {!loading && salons.length > 0 && (
              <p style={{ fontSize: 12, color: "var(--t-text-3)" }}>{salons.length} salon{salons.length !== 1 ? "s" : ""}</p>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {GENDER_FILTERS.map(({ key, label }) => {
              const active = genderFilter === key;
              return (
                <button key={key} onClick={() => handleGenderFilter(key)} style={{ padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.18s ease", background: active ? "rgba(244,63,94,0.13)" : "var(--t-input-bg)", border: active ? "1px solid rgba(244,63,94,0.32)" : "1px solid var(--t-border)", color: active ? "#fb7185" : "var(--t-text-3)", whiteSpace: "nowrap" }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}
        {!loading && salons.length === 0 && !locDenied && (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <SearchX style={{ width: 36, height: 36, color: "var(--t-border)", margin: "0 auto 14px" }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--t-text)" }}>No salons found</p>
            <p style={{ fontSize: 13, color: "var(--t-text-3)" }}>Try adjusting your filters.</p>
          </div>
        )}
        {!loading && salons.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {salons.map(s => <SalonCard key={s._id} salon={s} userCoords={userCoords} />)}
          </div>
        )}
      </div>
    );

    return (
      <div style={{ background: "var(--t-bg)", minHeight: "100vh" }}>
        <LandingPage
          searchText={searchText}
          onSearch={handleSearch}
          onSearchSubmit={handleSearchSubmit}
          onLocate={handleLocation}
          locLoading={locLoading}
          searching={searching}
          selectedCats={selectedCats}
          onCategorySelect={handleCategory}
          sort={sort}
          onSortChange={handleSortChange}
          genderFilter={genderFilter}
          salonGrid={guestSalonGrid}
        />
      </div>
    );
  }

  // ── Logged-in view ───────────────────────────────────────────
  return (
    <div className="t-page" style={{ minHeight: "100vh", overflowX: "hidden" }}>

      {/* ══ STICKY SEARCH ══════════════════════════════════════════════ */}
      <div
        style={{
          position: "fixed",
          top: 58,
          left: 0,
          right: 0,
          zIndex: 38,
          padding: "8px 16px",
          background: "var(--t-nav-bg)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid var(--t-border)",
          transform: showSticky ? "translateY(0)" : "translateY(-120%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          pointerEvents: showSticky ? "auto" : "none",
        }}
      >
        <div className="max-w-3xl mx-auto">
          <SearchInput
            value={searchText}
            onChange={handleSearch}
            onSearch={handleSearchSubmit}
            onFocus={() => setStickyFocused(true)}
            onBlur={() => setStickyFocused(false)}
            focused={stickyFocused}
            onClear={() => handleSearch("")}
            onLocate={handleLocation}
            locLoading={locLoading}
            searching={searching}
            compact
          />
        </div>
      </div>

      {/* ══ HERO ════════════════════════════════════════════════════════ */}
      <section style={{ position: "relative", overflow: "hidden", padding: "clamp(20px,3vh,36px) 16px 0" }}>
        <div style={{ position: "absolute", top: -100, left: "5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.07) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div className="max-w-3xl mx-auto" style={{ position: "relative", zIndex: 1 }}>
          <p style={{ fontSize: "clamp(18px,4.5vw,22px)", fontWeight: 800, color: "var(--t-text)", marginBottom: 3, lineHeight: 1.3 }}>
            {getGreeting()},{" "}
            <span style={{ background: "linear-gradient(90deg,#6366f1,#8b5cf6)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {userName}
            </span>
            {" "}👋
          </p>
          <p style={{ fontSize: 13, color: "var(--t-text-3)", marginBottom: 16 }}>Where would you like to book today?</p>
          <div ref={heroSearchRef} id="hero-search">
            <SearchInput value={searchText} onChange={handleSearch} onSearch={handleSearchSubmit} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} focused={focused} onClear={() => handleSearch("")} onLocate={handleLocation} locLoading={locLoading} searching={searching} />
          </div>
        </div>
      </section>

      {/* ══ FILTER BAR ══════════════════════════════════════════════════ */}
      <section style={{ padding: "14px 16px 16px", borderBottom: "1px solid var(--t-border)" }}>
        <div className="max-w-7xl mx-auto">

          {/* Category pills — horizontal scroll, gender-filtered */}
          <div className="scrollbar-hide" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 6, width: "max-content" }}>
              {CATEGORIES.filter(({ key }) => {
                if (genderFilter === "female" && MALE_ONLY_CHIPS.includes(key)) return false;
                if (genderFilter === "male"   && FEMALE_ONLY_CHIPS.includes(key)) return false;
                return true;
              }).map(({ key, label, icon }) => {
                const active = key === "all" ? selectedCats.length === 0 : selectedCats.includes(key);
                return (
                  <button key={key} onClick={() => handleCategory(key)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 13px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.18s ease", background: active ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "var(--t-input-bg)", border: active ? "1px solid rgba(139,92,246,0.4)" : "1px solid var(--t-border)", color: active ? "#fff" : "var(--t-text-2)", boxShadow: active ? "0 0 14px rgba(99,102,241,0.28)" : "none" }}>
                    <span style={{ fontSize: 13 }}>{icon}</span>{label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 2 — Sort · Gender · Open Now · Clear — horizontal scroll on mobile */}
          <div className="scrollbar-hide" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <div style={{ display: "flex", gap: 7, alignItems: "center", width: "max-content" }}>

              {/* Sort pill-group */}
              <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 999, background: "var(--t-input-bg)", border: "1px solid var(--t-border)" }}>
                {SORT_OPTIONS.map(({ key, label, icon }) => {
                  const active = sort === key && !isSearchActive;
                  return (
                    <button key={key} onClick={() => handleSortChange(key)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.18s ease", background: active ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "transparent", color: active ? "#fff" : "var(--t-text-3)", border: "none", whiteSpace: "nowrap" }}>
                      {icon} {label}
                    </button>
                  );
                })}
              </div>

              {/* Divider */}
              <div style={{ width: 1, height: 18, background: "var(--t-border)", flexShrink: 0 }} />

              {/* Open Now toggle */}
              <button onClick={handleOpenNow} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.18s ease", background: openNow ? "rgba(16,185,129,0.12)" : "var(--t-input-bg)", border: openNow ? "1px solid rgba(16,185,129,0.38)" : "1px solid var(--t-border)", color: openNow ? "#10b981" : "var(--t-text-3)", whiteSpace: "nowrap" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: openNow ? "#10b981" : "var(--t-text-3)", display: "inline-block", flexShrink: 0 }} />
                Open Now
              </button>

              {/* Clear */}
              {hasActiveState && (
                <button onClick={clearAll} style={{ fontSize: 11, fontWeight: 600, color: "var(--t-accent)", background: "none", border: "none", cursor: "pointer", padding: "5px 4px", whiteSpace: "nowrap" }}>
                  ✕ Clear all
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══ NAV SHORTCUTS + UPCOMING NOTICE ════════════════════════════ */}
      <div style={{ padding: "12px 16px 0" }}>
        <div className="max-w-7xl mx-auto" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Link to="/dashboard" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--t-text-2)", textDecoration: "none", padding: "6px 12px", borderRadius: 10, background: "var(--t-input-bg)", border: "1px solid var(--t-border)", transition: "border-color 0.18s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(99,102,241,0.35)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--t-border)"}
          >
            📅 My Bookings
            {upcomingCount > 0 && <span style={{ background: "#6366f1", color: "#fff", fontSize: 9, fontWeight: 800, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>{upcomingCount}</span>}
          </Link>
          <Link to="/favorites" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--t-text-2)", textDecoration: "none", padding: "6px 12px", borderRadius: 10, background: "var(--t-input-bg)", border: "1px solid var(--t-border)", transition: "border-color 0.18s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(244,63,94,0.35)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--t-border)"}
          >
            ❤️ Saved Salons
          </Link>
        </div>
      </div>

      {/* ══ LOCATION DENIED ══════════════════════════════════════════ */}
      {locDenied && !isSearchActive && (
        <div className="max-w-2xl mx-auto px-6 pt-12 pb-24 text-center">
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 20px" }}>📍</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--t-text)", marginBottom: 8 }}>Enable Location</h3>
          <p style={{ fontSize: 14, color: "var(--t-text-2)", maxWidth: 280, margin: "0 auto 24px", lineHeight: 1.7 }}>We show salons within 5 km of your location.</p>
          <button onClick={handleLocation} disabled={locLoading} style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: 14, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 0 24px rgba(99,102,241,0.35)" }}>
            {locLoading ? "Detecting…" : "📍 Allow Location"}
          </button>
        </div>
      )}

      {/* ══ SALON GRID ════════════════════════════════════════════════ */}
      {(!locDenied || isSearchActive) && (
        <div id="salon-grid" className="max-w-7xl mx-auto px-3 sm:px-6 pb-20" style={{ paddingTop: 20 }}>

          {/* Section header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 8, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--t-text)" }}>{sectionTitle}</h2>
              {!loading && <p style={{ fontSize: 11, color: "var(--t-text-3)", marginTop: 1 }}>{salons.length} salon{salons.length !== 1 ? "s" : ""}{openNow ? " · open now" : ""}</p>}
            </div>
            {hasActiveState && (
              <button onClick={clearAll} style={{ fontSize: 11, fontWeight: 600, color: "var(--t-accent)", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", cursor: "pointer", padding: "4px 10px", borderRadius: 8 }}>
                ✕ Clear filters
              </button>
            )}
          </div>

          {/* Loading grid */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
              {Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Empty state */}
          {!loading && salons.length === 0 && (
            <div style={{ textAlign: "center", padding: "64px 20px" }}>
              <SearchX style={{ width: 40, height: 40, color: "var(--t-border)", margin: "0 auto 16px" }} />
              <h3 style={{ fontSize: 17, fontWeight: 600, color: "var(--t-text)", marginBottom: 6 }}>No salons found</h3>
              <p style={{ fontSize: 13, color: "var(--t-text-2)" }}>Try adjusting your filters or search.</p>
            </div>
          )}

          {/* Salon cards */}
          {!loading && salons.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
              {salons.map(s => (
                <div key={s._id}>
                  <SalonCard salon={s} userCoords={userCoords} />
                  {s.matchedServices?.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "0 4px 8px" }}>
                      {s.matchedServices.slice(0, 3).map(svc => (
                        <span key={svc} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "rgba(99,102,241,0.12)", color: "var(--t-accent)", border: "1px solid rgba(99,102,241,0.18)" }}>
                          {svc}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
