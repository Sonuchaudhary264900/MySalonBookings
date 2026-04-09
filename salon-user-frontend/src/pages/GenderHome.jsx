import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LocateFixed, Search, X, SearchX, ArrowLeft } from "lucide-react";
import API from "../services/api";
import SalonCard from "../components/SalonCard";
import { useTheme } from "../context/ThemeContext";

// ── Config per gender ────────────────────────────────────────────
const CONFIG = {
  male: {
    title:    "Male Salons",
    subtitle: "Haircuts, Beard, Spa & Grooming for Men",
    emoji:    "🧔",
    accent:   "#6366f1",
    gradient: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)",
    heroBg:   "linear-gradient(135deg,rgba(99,102,241,0.14) 0%,rgba(139,92,246,0.10) 100%)",
    glow:     "rgba(99,102,241,0.30)",
    categories: [
      { key: "all",                   label: "All",      icon: "✦" },
      { key: "Hair Services",         label: "Hair",     icon: "✂️" },
      { key: "Skin & Face / Beauty",  label: "Skin",     icon: "🧖" },
      { key: "Beard & Grooming",      label: "Beard",    icon: "🧔" },
      { key: "Spa & Massage",         label: "Spa",      icon: "💆" },
      { key: "Kids Services",         label: "Kids",     icon: "👶" },
    ],
    quickActions: [
      { icon: "✂️", label: "Haircut",  sub: "Fresh cut",     cat: "Hair Services" },
      { icon: "🧔", label: "Beard",    sub: "Trim & style",  cat: "Beard & Grooming" },
      { icon: "💆", label: "Spa",      sub: "Relax",         cat: "Spa & Massage" },
      { icon: "🧖", label: "Facial",   sub: "Skin care",     cat: "Skin & Face / Beauty" },
      { icon: "📍", label: "Near Me",  sub: "Within 5 km",   sort: "nearby" },
      { icon: "⭐", label: "Top Rated",sub: "Best salons",   sort: "rated" },
    ],
  },
  female: {
    title:    "Female Salons",
    subtitle: "Hair, Bridal, Nails, Makeup & more for Women",
    emoji:    "💅",
    accent:   "#ec4899",
    gradient: "linear-gradient(135deg,#ec4899 0%,#f43f5e 100%)",
    heroBg:   "linear-gradient(135deg,rgba(236,72,153,0.14) 0%,rgba(244,63,94,0.10) 100%)",
    glow:     "rgba(236,72,153,0.30)",
    categories: [
      { key: "all",                   label: "All",      icon: "✦" },
      { key: "Hair Services",         label: "Hair",     icon: "✂️" },
      { key: "Skin & Face / Beauty",  label: "Skin",     icon: "🧖" },
      { key: "Nail Services",         label: "Nails",    icon: "💅" },
      { key: "Bridal & Events",       label: "Bridal",   icon: "👰" },
      { key: "Spa & Massage",         label: "Spa",      icon: "💆" },
      { key: "Kids Services",         label: "Kids",     icon: "👶" },
    ],
    quickActions: [
      { icon: "✂️", label: "Hair",     sub: "Style & color",  cat: "Hair Services" },
      { icon: "💅", label: "Nails",    sub: "Nail art",       cat: "Nail Services" },
      { icon: "👰", label: "Bridal",   sub: "Wedding glam",   cat: "Bridal & Events" },
      { icon: "🧖", label: "Skin",     sub: "Face & beauty",  cat: "Skin & Face / Beauty" },
      { icon: "📍", label: "Near Me",  sub: "Within 5 km",    sort: "nearby" },
      { icon: "⭐", label: "Top Rated",sub: "Best salons",    sort: "rated" },
    ],
  },
};

const CATEGORY_ALIASES = {
  "Hair Services":        ["Hair Services", "Hair Services (Men)", "Hair Services (Women)"],
  "Skin & Face / Beauty": ["Skin & Face / Beauty", "Skin & Face (Men Grooming)", "Skin & Beauty"],
  "Spa & Massage":        ["Spa & Massage", "Spa & Relaxation"],
};

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

// ── Main ─────────────────────────────────────────────────────────
export default function GenderHome({ gender }) {
  const cfg      = CONFIG[gender] || CONFIG.male;
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const [salons, setSalons]         = useState([]);
  const [allSalons, setAllSalons]   = useState([]);
  const [selectedCats, setSelectedCats] = useState([]);
  const [sort, setSort]             = useState("nearby");
  const [loading, setLoading]       = useState(true);
  const [locLoading, setLocLoading] = useState(false);
  const [locDenied, setLocDenied]   = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching]   = useState(false);
  const [focused, setFocused]       = useState(false);
  const [openNow, setOpenNow]       = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [serviceMatchLabel, setServiceMatchLabel] = useState("");

  // ── Filter (always locked to this page's gender) ─────────────
  const applyFilters = (data, cats, onlyOpen) => {
    let r = data;
    if (cats.length > 0) {
      r = r.filter(s => cats.some(cat => {
        const aliases = CATEGORY_ALIASES[cat] || [cat];
        return (s.offeredCategoryNames || []).some(n => aliases.includes(n));
      }));
    }
    r = r.filter(s => { const sg = s.servedGender || "unisex"; return sg === gender || sg === "unisex"; });
    if (onlyOpen) { r = r.filter(s => isOpenNow(s.workingHours) === true); }
    return r;
  };

  const fetchBySort = async (sortKey, coords, cats) => {
    if (!coords) return;
    setLoading(true);
    setSearchText("");
    setServiceMatchLabel("");
    try {
      const res = await API.get(`/public/salons/nearby?latitude=${coords.lat}&longitude=${coords.lng}&sort=${sortKey}`);
      const data = res.data.data?.salons || res.data.data || [];
      setAllSalons(data);
      setSalons(applyFilters(data, cats ?? selectedCats, openNow));
    } catch { setAllSalons([]); setSalons([]); }
    finally { setLoading(false); }
  };

  // ── Geolocation on mount ──────────────────────────────────────
  useEffect(() => {
    let ignore = false;
    if (!navigator.geolocation) { setLocDenied(true); setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        if (ignore) return;
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        fetchBySort("nearby", coords, []);
      },
      () => { if (!ignore) { setLocDenied(true); setLoading(false); } },
      { enableHighAccuracy: false, maximumAge: 120000, timeout: 12000 }
    );
    return () => { ignore = true; };
  }, [gender]);

  const runSearch = useCallback(async (text, cats) => {
    if (!text.trim()) return;
    setSearching(true);
    setServiceMatchLabel("");
    const q = text.toLowerCase();
    const activeCats = cats ?? selectedCats;
    const local  = allSalons.filter(s => s.name?.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q) || s.address?.toLowerCase().includes(q));
    const localF = applyFilters(local, activeCats, openNow);
    if (localF.length > 0) { setSalons(localF); setSearching(false); return; }
    try {
      const res  = await API.get(`/public/services/search?q=${encodeURIComponent(text.trim())}`);
      const data = res.data.data;
      if (data?.salons?.length > 0) { setSalons(applyFilters(data.salons, activeCats, openNow)); setServiceMatchLabel(`Salons offering "${data.matchedService}"`); }
      else { setSalons([]); }
    } catch { setSalons([]); }
    finally { setSearching(false); }
  }, [allSalons, selectedCats, openNow, gender]);

  const handleCategory = cat => {
    const newCats = cat === "all" ? [] : selectedCats.includes(cat) ? selectedCats.filter(c => c !== cat) : [...selectedCats, cat];
    setSelectedCats(newCats);
    if (searchText.trim()) { runSearch(searchText, newCats); }
    else { setSalons(applyFilters(allSalons, newCats, openNow)); }
  };

  const handleSearch = text => {
    setSearchText(text);
    if (!text.trim()) { setServiceMatchLabel(""); setSalons(applyFilters(allSalons, selectedCats, openNow)); }
  };

  const handleSortChange = key => {
    setSort(key);
    if (!searchText.trim()) fetchBySort(key, userCoords, selectedCats);
    setTimeout(() => document.getElementById("gh-salons")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const handleLocation = async () => {
    if (!navigator.geolocation) return;
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        setLocDenied(false);
        setSort("nearby");
        fetchBySort("nearby", coords, []).finally(() => setLocLoading(false));
      },
      err => {
        setLocLoading(false);
        setLocDenied(true);
        if (err.code === 1) alert("Location access denied. Allow it in your browser settings.");
        else alert("Could not detect your location.");
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 120000 }
    );
  };

  const sectionTitle = serviceMatchLabel
    || (sort === "rated" ? `Top Rated ${cfg.title}` : sort === "booked" ? `Trending ${cfg.title}` : `${cfg.title} Near You`);

  return (
    <div style={{ background: "var(--t-bg)", minHeight: "100vh", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>

      {/* ── Hero Header ─────────────────────────────────────────── */}
      <div style={{ position: "relative", overflow: "hidden", background: cfg.gradient, padding: "48px 20px 36px" }}>
        {/* Orb */}
        <div style={{ position: "absolute", top: -80, right: -60, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 720, margin: "0 auto", position: "relative", zIndex: 1 }}>
          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 999, padding: "6px 14px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 20 }}
          >
            <ArrowLeft style={{ width: 14, height: 14 }} /> Back
          </button>

          {/* Title */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
            <div style={{ fontSize: 44, lineHeight: 1 }}>{cfg.emoji}</div>
            <div>
              <h1 style={{ fontSize: "clamp(1.6rem,5vw,2.4rem)", fontWeight: 900, color: "#fff", letterSpacing: "-1px", margin: 0, lineHeight: 1.1 }}>{cfg.title}</h1>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.80)", margin: "6px 0 0", lineHeight: 1.5 }}>{cfg.subtitle}</p>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ marginTop: 20 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10, padding: "0 16px", height: 52, borderRadius: 999,
              background: focused ? "#fff" : "rgba(255,255,255,0.92)",
              border: focused ? `1.5px solid ${cfg.accent}` : "1.5px solid rgba(255,255,255,0.6)",
              boxShadow: focused ? `0 0 0 4px ${cfg.glow}` : "0 4px 20px rgba(0,0,0,0.15)",
              transition: "all 0.22s ease",
            }}>
              <button onClick={() => runSearch(searchText, selectedCats)} style={{ display: "flex", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
                <Search style={{ width: 17, height: 17, color: focused ? cfg.accent : "#94a3b8", transition: "color 0.2s" }} />
              </button>
              <input
                type="text"
                placeholder={`Search ${gender === "male" ? "male" : "female"} salons, services…`}
                value={searchText}
                onChange={e => handleSearch(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); runSearch(searchText, selectedCats); } }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 15, color: "#1e293b", minWidth: 0 }}
              />
              {searchText && !searching && (
                <button onClick={() => handleSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", opacity: 0.6 }}>
                  <X style={{ width: 14, height: 14, color: "#64748b" }} />
                </button>
              )}
              {searching && <span style={{ width: 14, height: 14, border: `2px solid ${cfg.accent}`, borderTopColor: "transparent", borderRadius: "50%", display: "block", flexShrink: 0, animation: "spin 0.7s linear infinite" }} />}
              <div style={{ width: 1, height: 18, background: "rgba(0,0,0,0.12)", flexShrink: 0 }} />
              <button onClick={handleLocation} disabled={locLoading} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: cfg.accent, fontSize: 12, fontWeight: 600, flexShrink: 0, opacity: locLoading ? 0.5 : 1 }}>
                {locLoading
                  ? <span style={{ width: 14, height: 14, border: `2px solid ${cfg.accent}`, borderTopColor: "transparent", borderRadius: "50%", display: "block" }} />
                  : <LocateFixed style={{ width: 15, height: 15 }} />}
                <span className="hidden sm:inline" style={{ fontSize: 12 }}>Locate</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px 60px" }}>

        {/* ── Categories ── */}
        <div className="scrollbar-hide" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, width: "max-content", paddingBottom: 2 }}>
            {cfg.categories.map(({ key, label, icon }) => {
              const active = key === "all" ? selectedCats.length === 0 : selectedCats.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => { handleCategory(key); setTimeout(() => document.getElementById("gh-salons")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 999,
                    fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                    transition: "all 0.18s ease",
                    background: active ? cfg.gradient : "var(--t-input-bg)",
                    border: active ? "1px solid transparent" : "1px solid var(--t-border)",
                    color: active ? "#fff" : "var(--t-text-2)",
                    boxShadow: active ? `0 0 16px ${cfg.glow}` : "none",
                  }}
                >
                  <span style={{ fontSize: 15 }}>{icon}</span>{label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Sort + Open Now ── */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22, alignItems: "center" }}>
          {[
            { key: "nearby", label: "Near You",   icon: "📍" },
            { key: "rated",  label: "Top Rated",  icon: "⭐" },
            { key: "booked", label: "Trending",   icon: "🔥" },
          ].map(({ key, label, icon }) => {
            const active = sort === key;
            return (
              <button key={key} onClick={() => handleSortChange(key)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "7px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.18s ease", whiteSpace: "nowrap", background: active ? "rgba(99,102,241,0.12)" : "transparent", border: active ? "1px solid rgba(99,102,241,0.35)" : "1px solid var(--t-border)", color: active ? "var(--t-accent)" : "var(--t-text-3)", boxShadow: active ? "0 0 12px rgba(99,102,241,0.12)" : "none" }}>
                {icon} {label}
              </button>
            );
          })}
          <button onClick={() => { const next = !openNow; setOpenNow(next); setSalons(applyFilters(allSalons, selectedCats, next)); }} style={{ display: "flex", alignItems: "center", gap: 4, padding: "7px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.18s ease", background: openNow ? "rgba(16,185,129,0.12)" : "transparent", border: openNow ? "1px solid rgba(16,185,129,0.35)" : "1px solid var(--t-border)", color: openNow ? "#10b981" : "var(--t-text-3)" }}>
            🟢 Open Now
          </button>
        </div>

        {/* ── Quick Access ── */}
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--t-text-3)", marginBottom: 12 }}>Quick Access</p>
        <div className="scrollbar-hide" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", marginBottom: 28 }}>
          <div style={{ display: "flex", gap: 10, width: "max-content", paddingBottom: 4 }}>
            {cfg.quickActions.map(action => (
              <button
                key={action.label}
                onClick={() => {
                  if (action.sort) handleSortChange(action.sort);
                  if (action.cat) handleCategory(action.cat);
                  setTimeout(() => document.getElementById("gh-salons")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
                }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 16, background: "var(--t-card)", border: "1px solid var(--t-border)", cursor: "pointer", minWidth: 130, transition: "all 0.18s ease" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = cfg.accent + "55"; e.currentTarget.style.boxShadow = `0 6px 20px ${cfg.glow}`; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--t-border)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 11, background: cfg.accent + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{action.icon}</div>
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--t-text)", whiteSpace: "nowrap", marginBottom: 1 }}>{action.label}</p>
                  <p style={{ fontSize: 10, color: "var(--t-text-3)", whiteSpace: "nowrap" }}>{action.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Salon Grid ── */}
        <div id="gh-salons">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--t-text)", margin: 0 }}>{sectionTitle}</h2>
              {!loading && salons.length > 0 && <p style={{ fontSize: 12, color: "var(--t-text-3)", margin: "4px 0 0" }}>{salons.length} salon{salons.length !== 1 ? "s" : ""}</p>}
            </div>
            {/* Switch gender */}
            <Link
              to={gender === "male" ? "/women" : "/men"}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 999, fontSize: 12, fontWeight: 700, textDecoration: "none", background: gender === "male" ? "rgba(236,72,153,0.10)" : "rgba(99,102,241,0.10)", border: gender === "male" ? "1px solid rgba(236,72,153,0.28)" : "1px solid rgba(99,102,241,0.28)", color: gender === "male" ? "#ec4899" : "#6366f1" }}
            >
              {gender === "male" ? "👩 Switch to Female" : "🧔 Switch to Male"}
            </Link>
          </div>

          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}
          {!loading && locDenied && salons.length === 0 && (
            <div style={{ textAlign: "center", padding: "56px 20px" }}>
              <div style={{ fontSize: 44, marginBottom: 16 }}>📍</div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--t-text)", marginBottom: 8 }}>Location needed</p>
              <p style={{ fontSize: 13, color: "var(--t-text-3)", marginBottom: 20 }}>Allow location access to find {gender === "male" ? "male" : "female"} salons near you.</p>
              <button onClick={handleLocation} style={{ padding: "10px 24px", borderRadius: 12, background: cfg.gradient, color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}>Enable Location</button>
            </div>
          )}
          {!loading && !locDenied && salons.length === 0 && (
            <div style={{ textAlign: "center", padding: "56px 20px" }}>
              <SearchX style={{ width: 36, height: 36, color: "var(--t-border)", margin: "0 auto 14px" }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--t-text)" }}>No salons found</p>
              <p style={{ fontSize: 13, color: "var(--t-text-3)" }}>Try adjusting your filters or search.</p>
            </div>
          )}
          {!loading && salons.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {salons.map(s => <SalonCard key={s._id} salon={s} />)}
            </div>
          )}
        </div>

        {/* ── Guest CTA ── */}
        {!localStorage.getItem("customerToken") && (
          <div style={{ marginTop: 40, background: isDark ? "rgba(30,41,59,0.5)" : cfg.accent + "08", border: `1px solid ${cfg.accent}25`, borderRadius: 20, padding: "28px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>{cfg.emoji}</div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--t-text)", margin: "0 0 8px" }}>Ready to book?</h3>
            <p style={{ fontSize: 13, color: "var(--t-text-2)", margin: "0 0 20px", lineHeight: 1.6 }}>Create a free account to book appointments, save favorites and track your visits.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/register" style={{ padding: "11px 28px", borderRadius: 12, background: cfg.gradient, color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none", boxShadow: `0 0 24px ${cfg.glow}` }}>
                Create Free Account
              </Link>
              <Link to="/login" style={{ padding: "11px 24px", borderRadius: 12, background: "var(--t-card)", border: "1px solid var(--t-border)", color: "var(--t-text-2)", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
                Sign In →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
