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
  { key: "male",   label: "Men" },
  { key: "female", label: "Women" },
  { key: "unisex", label: "Unisex" },
];

// ── Skeleton ─────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: "var(--t-card)", border: "1px solid var(--t-border)" }}>
      <div className="h-48 skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-4 skeleton rounded-lg w-3/4" />
        <div className="h-3 skeleton rounded-lg w-1/2" />
        <div className="h-9 skeleton rounded-xl w-full mt-2" />
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────
export default function Home() {
  const isLoggedIn = !!localStorage.getItem("customerToken");
  const userName   = getUserName();

  const [salons, setSalons]           = useState([]);
  const [allSalons, setAllSalons]     = useState([]);
  const [selectedCats, setSelectedCats] = useState([]);
  const [genderFilter, setGenderFilter] = useState(() => {
    const g = localStorage.getItem("customerGender");
    return g === "male" || g === "female" ? g : "all";
  });
  const [sort, setSort]               = useState("nearby");
  const [loading, setLoading]         = useState(true);
  const [locLoading, setLocLoading]   = useState(false);
  const [locDenied, setLocDenied]     = useState(false);
  const [searchText, setSearchText]   = useState("");
  const [searching, setSearching]     = useState(false);
  const [focused, setFocused]         = useState(false);
  const [userCoords, setUserCoords]   = useState(null);
  const [serviceMatchLabel, setServiceMatchLabel] = useState("");
  const [upcomingCount, setUpcomingCount] = useState(0);
  const searchTimer = useRef(null);

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
      { maximumAge: 60000, timeout: 6000 }
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

  const applyFilters = (data, cats, gender) => {
    let r = data;
    if (cats.length > 0) {
      r = r.filter(s => cats.some(cat => {
        const aliases = CATEGORY_ALIASES[cat] || [cat];
        return (s.offeredCategoryNames || []).some(n => aliases.includes(n));
      }));
    }
    if (gender === "unisex") { r = r.filter(s => (s.servedGender || "unisex") === "unisex"); }
    else if (gender !== "all") { r = r.filter(s => { const sg = s.servedGender || "unisex"; return sg === gender || sg === "unisex"; }); }
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
      setSalons(applyFilters(data, cats ?? selectedCats, gender ?? genderFilter));
    } catch { setAllSalons([]); setSalons([]); }
    finally { setLoading(false); }
  };

  const handleCategory = cat => {
    const newCats = cat === "all" ? [] : selectedCats.includes(cat) ? selectedCats.filter(c => c !== cat) : [...selectedCats, cat];
    setSelectedCats(newCats);
    if (searchText.trim()) { searchTimer.current = setTimeout(() => runSearch(searchText, newCats), 0); }
    else { setSalons(applyFilters(allSalons, newCats, genderFilter)); }
  };

  const handleGenderFilter = gender => {
    const newCats = selectedCats.filter(k => {
      if (gender === "female" && MALE_ONLY_CHIPS.includes(k)) return false;
      if (gender === "male"   && FEMALE_ONLY_CHIPS.includes(k)) return false;
      return true;
    });
    setSelectedCats(newCats);
    setGenderFilter(gender);
    if (searchText.trim()) { searchTimer.current = setTimeout(() => runSearch(searchText, newCats, gender), 0); }
    else { setSalons(applyFilters(allSalons, newCats, gender)); }
  };

  const runSearch = useCallback(async (text, cats, gender) => {
    if (!text.trim()) return;
    setSearching(true);
    setServiceMatchLabel("");
    const q = text.toLowerCase();
    const activeCats = cats ?? selectedCats;
    const activeGender = gender ?? genderFilter;
    const local = allSalons.filter(s => s.name?.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q) || s.address?.toLowerCase().includes(q));
    const localF = applyFilters(local, activeCats, activeGender);
    if (localF.length > 0) { setSalons(localF); setSearching(false); return; }
    try {
      const res = await API.get(`/public/services/search?q=${encodeURIComponent(text.trim())}`);
      const data = res.data.data;
      if (data?.salons?.length > 0) { setSalons(applyFilters(data.salons, activeCats, activeGender)); setServiceMatchLabel(`Salons offering "${data.matchedService}"`); }
      else { setSalons([]); }
    } catch { setSalons([]); }
    finally { setSearching(false); }
  }, [allSalons, selectedCats, genderFilter]);

  const handleSearch = text => {
    setSearchText(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!text.trim()) { setServiceMatchLabel(""); setSalons(applyFilters(allSalons, selectedCats, genderFilter)); return; }
    searchTimer.current = setTimeout(() => runSearch(text, selectedCats), 400);
  };

  const handleLocation = () => {
    if (!navigator.geolocation) return;
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
      () => { setLocLoading(false); alert("Location access denied. Please allow location in browser settings."); }
    );
  };

  const clearAll = () => {
    setSearchText("");
    setSelectedCats([]);
    setGenderFilter("all");
    setServiceMatchLabel("");
    setSalons(allSalons);
  };

  const isSearchActive = searchText.trim().length > 0;
  const isFiltered     = selectedCats.length > 0 || genderFilter !== "all";
  const hasActiveState = isSearchActive || isFiltered;

  const sectionTitle = serviceMatchLabel
    || (isSearchActive ? "Search Results"
    : sort === "rated" ? "Top Rated"
    : sort === "booked" ? "Most Booked"
    : "Salons Near You");

  // ── Guest view ───────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div style={{ background: "var(--t-bg)", minHeight: "100vh" }}>
        <LandingPage searchText={searchText} onSearch={handleSearch} onLocate={handleLocation} locLoading={locLoading} searching={searching} />
        <div id="salons" style={{ background: "var(--t-bg)" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 pt-4">
            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pt-8">
                {Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            )}
            {!loading && salons.length > 0 && (
              <>
                <h2 className="text-lg font-bold mb-5 pt-2" style={{ color: "var(--t-text)" }}>Salons Near You</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {salons.map(s => <SalonCard key={s._id} salon={s} userCoords={userCoords} />)}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Logged-in view ───────────────────────────────────────────
  return (
    <div className="t-page" style={{ minHeight: "100vh" }}>

      {/* ══ HERO ═══════════════════════════════════════════════════ */}
      <section style={{ position: "relative", overflow: "hidden", padding: "56px 24px 48px" }}>

        {/* Background orbs */}
        <div style={{ position: "absolute", top: -120, left: "8%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.1) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: -80, right: "4%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,0.07) 0%,transparent 65%)", pointerEvents: "none" }} />

        <div className="max-w-4xl mx-auto" style={{ position: "relative", zIndex: 1 }}>

          {/* Greeting */}
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: "var(--t-text-3)" }}>
            {getGreeting()},{" "}
            <span style={{ color: "var(--t-accent)", fontWeight: 700 }}>{userName}</span> 👋
          </p>

          {/* Heading */}
          <h1 style={{
            fontSize: "clamp(1.75rem,4vw,2.75rem)",
            fontWeight: 900,
            color: "var(--t-text)",
            letterSpacing: "-1px",
            lineHeight: 1.15,
            marginBottom: 12,
          }}>
            Find Your Perfect<br />
            <span style={{ background: "linear-gradient(90deg,#818cf8,#a78bfa,#67e8f9)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Salon Experience
            </span>
          </h1>

          <p style={{ fontSize: 15, color: "var(--t-text-2)", marginBottom: 32, maxWidth: 400, lineHeight: 1.7 }}>
            Top-rated salons near you. Book instantly, no waiting.
          </p>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <StatCard
              value={loading ? "—" : allSalons.length}
              label="Salons Nearby"
              color="var(--t-accent)"
            />
            <StatCard
              value={upcomingCount}
              label="Upcoming"
              color="#6ee7b7"
            />
            <StatCard
              value="4.9⭐"
              label="Avg Rating"
              color="#fcd34d"
            />
            <Link
              to="/dashboard"
              style={{
                background: "linear-gradient(135deg,rgba(99,102,241,0.18),rgba(139,92,246,0.13))",
                border: "1px solid rgba(99,102,241,0.28)",
                borderRadius: 14,
                padding: "12px 20px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 700,
                color: "#818cf8",
                transition: "box-shadow 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 24px rgba(99,102,241,0.22)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
            >
              📅 View Bookings →
            </Link>
          </div>
        </div>
      </section>

      {/* ══ SEARCH BAR ═════════════════════════════════════════════ */}
      <div style={{ padding: "0 24px 32px" }}>
        <div className="max-w-4xl mx-auto">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "0 20px",
              height: 58,
              borderRadius: 18,
              background: focused ? "var(--t-card)" : "var(--t-input-bg)",
              border: focused ? "1px solid rgba(99,102,241,0.5)" : "1px solid var(--t-border)",
              boxShadow: focused ? "0 0 0 3px rgba(99,102,241,0.08)" : "none",
              transition: "all 0.22s ease",
            }}
          >
            <Search style={{ width: 18, height: 18, flexShrink: 0, color: focused ? "var(--t-accent)" : "var(--t-text-3)", transition: "color 0.2s" }} />
            <input
              type="text"
              placeholder="Search salons, services, city…"
              value={searchText}
              onChange={e => handleSearch(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 15,
                color: "var(--t-text)",
                minWidth: 0,
              }}
            />
            {searchText && !searching && (
              <button onClick={() => handleSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", opacity: 0.6 }}>
                <X style={{ width: 16, height: 16, color: "var(--t-text-2)" }} />
              </button>
            )}
            {searching && (
              <span style={{ width: 16, height: 16, border: "2px solid var(--t-accent)", borderTopColor: "transparent", borderRadius: "50%", display: "block", flexShrink: 0, animation: "spin 0.7s linear infinite" }} />
            )}
            <div style={{ width: 1, height: 24, background: "var(--t-border)", flexShrink: 0 }} />
            <button
              onClick={handleLocation}
              disabled={locLoading}
              title="Detect location"
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--t-accent)", fontSize: 13, fontWeight: 600, flexShrink: 0, opacity: locLoading ? 0.6 : 1, padding: "0 4px" }}
            >
              {locLoading
                ? <span style={{ width: 14, height: 14, border: "2px solid var(--t-accent)", borderTopColor: "transparent", borderRadius: "50%", display: "block", animation: "spin 0.7s linear infinite" }} />
                : <LocateFixed style={{ width: 16, height: 16 }} />}
              <span className="hidden sm:inline">Locate</span>
            </button>
          </div>
        </div>
      </div>

      {/* ══ FILTER SYSTEM ══════════════════════════════════════════ */}
      <div style={{ padding: "0 24px 36px" }}>
        <div className="max-w-4xl mx-auto" style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Row 1 — Categories (wrap, no scrollbar) */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CATEGORIES.map(({ key, label, icon }) => {
              const active = key === "all" ? selectedCats.length === 0 : selectedCats.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => handleCategory(key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "7px 14px",
                    borderRadius: 99,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                    background: active ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "var(--t-input-bg)",
                    border: active ? "1px solid rgba(139,92,246,0.45)" : "1px solid var(--t-border)",
                    color: active ? "#fff" : "var(--t-text-2)",
                    boxShadow: active ? "0 0 14px rgba(99,102,241,0.28)" : "none",
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = "var(--t-border)"; }}
                >
                  <span style={{ fontSize: 13 }}>{icon}</span>
                  {label}
                </button>
              );
            })}
          </div>

          {/* Row 2 — Gender + Sort */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {GENDER_FILTERS.map(({ key, label }) => {
              const active = genderFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => handleGenderFilter(key)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 99,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                    background: active ? "rgba(244,63,94,0.13)" : "var(--t-input-bg)",
                    border: active ? "1px solid rgba(244,63,94,0.32)" : "1px solid var(--t-border)",
                    color: active ? "#fb7185" : "var(--t-text-2)",
                    boxShadow: active ? "0 0 12px rgba(244,63,94,0.15)" : "none",
                  }}
                >
                  {label}
                </button>
              );
            })}
            <div style={{ flex: 1 }} />
            {!isSearchActive && (
              <select
                value={sort}
                onChange={e => { setSort(e.target.value); fetchBySort(e.target.value, userCoords, selectedCats, genderFilter); }}
                style={{
                  background: "var(--t-input-bg)",
                  border: "1px solid var(--t-border)",
                  borderRadius: 10,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--t-accent)",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="nearby">📍 Nearest</option>
                <option value="booked">🔥 Most Booked</option>
                <option value="rated">⭐ Top Rated</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* ══ LOCATION DENIED ════════════════════════════════════════ */}
      {locDenied && !isSearchActive && (
        <div className="max-w-4xl mx-auto px-6 pb-24 text-center">
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 20px" }}>
            📍
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--t-text)", marginBottom: 8 }}>Enable Location</h3>
          <p style={{ fontSize: 14, color: "var(--t-text-2)", maxWidth: 280, margin: "0 auto 24px", lineHeight: 1.7 }}>
            We show salons within 5 km of your location.
          </p>
          <button
            onClick={handleLocation}
            disabled={locLoading}
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: 14, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 0 24px rgba(99,102,241,0.35)" }}
          >
            {locLoading ? "Detecting…" : "📍 Allow Location"}
          </button>
        </div>
      )}

      {/* ══ SALON GRID ═════════════════════════════════════════════ */}
      {(!locDenied || isSearchActive) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">

          {/* Section header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--t-text)", marginBottom: 3 }}>
                {sectionTitle}
              </h2>
              {!loading && (
                <p style={{ fontSize: 12, color: "var(--t-text-3)" }}>
                  {salons.length} salon{salons.length !== 1 ? "s" : ""} found
                </p>
              )}
            </div>
            {hasActiveState && (
              <button
                onClick={clearAll}
                style={{ fontSize: 12, fontWeight: 600, color: "var(--t-accent)", background: "none", border: "none", cursor: "pointer", padding: "6px 12px", borderRadius: 8, transition: "opacity 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "0.7"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
              >
                ✕ Clear filters
              </button>
            )}
          </div>

          {/* Loading grid */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Empty state */}
          {!loading && salons.length === 0 && (
            <div style={{ textAlign: "center", padding: "72px 20px" }}>
              <SearchX style={{ width: 40, height: 40, color: "var(--t-border)", margin: "0 auto 16px" }} />
              <h3 style={{ fontSize: 17, fontWeight: 600, color: "var(--t-text)", marginBottom: 6 }}>No salons found</h3>
              <p style={{ fontSize: 13, color: "var(--t-text-2)" }}>Try adjusting your filters or search.</p>
            </div>
          )}

          {/* Salon cards */}
          {!loading && salons.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {salons.map(s => (
                <div key={s._id}>
                  <SalonCard salon={s} userCoords={userCoords} />
                  {s.matchedServices?.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "0 12px 12px" }}>
                      {s.matchedServices.slice(0, 3).map(svc => (
                        <span key={svc} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "rgba(99,102,241,0.12)", color: "var(--t-accent)", border: "1px solid rgba(99,102,241,0.18)" }}>
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

// ── Stat Card ────────────────────────────────────────────────────
function StatCard({ value, label, color }) {
  return (
    <div
      style={{
        background: "var(--t-card)",
        border: "1px solid var(--t-border)",
        borderRadius: 14,
        padding: "12px 18px",
        minWidth: 90,
        transition: "box-shadow 0.2s",
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.12)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
    >
      <p style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1, marginBottom: 3 }}>{value}</p>
      <p style={{ fontSize: 11, color: "var(--t-text-3)" }}>{label}</p>
    </div>
  );
}
