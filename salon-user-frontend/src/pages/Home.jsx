import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  LocateFixed, Search, X, SearchX,
  Scissors, Sparkles, Droplets, User, Leaf,
  SlidersHorizontal, ChevronDown, MapPin,
  CalendarCheck, Star, CheckCircle2, ArrowRight, Crown,
} from "lucide-react";
import API from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { salonPath } from "../utils/formatters";
import SalonCard from "../components/SalonCard";
import LandingPage from "./LandingPage";

// ── Helpers ──────────────────────────────────────────────────────
function getUserName() {
  try {
    const token = localStorage.getItem("customerToken");
    if (!token) return "there";
    const p = JSON.parse(atob(token.split(".")[1]));
    return p.name || p.firstName || p.username || "there";
  } catch { return "there"; }
}
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

// ── Static data ───────────────────────────────────────────────────
const CATEGORIES = [
  { key: "Hair Services",        label: "Hair" },
  { key: "Beard & Grooming",     label: "Beard" },
  { key: "Nail Services",        label: "Nails" },
  { key: "Skin & Face / Beauty", label: "Skin" },
  { key: "Spa & Massage",        label: "Spa" },
  { key: "Body Grooming",        label: "Body" },
  { key: "Bridal & Events",      label: "Bridal" },
  { key: "Kids Services",        label: "Kids" },
  { key: "At-Home Services",     label: "At-Home" },
];
const CATEGORY_ALIASES = {
  "Hair Services":        ["Hair Services","Hair Services (Men)","Hair Services (Women)"],
  "Skin & Face / Beauty": ["Skin & Face / Beauty","Skin & Face (Men Grooming)","Skin & Beauty"],
  "Spa & Massage":        ["Spa & Massage","Spa & Relaxation"],
};
const MALE_ONLY   = ["Beard & Grooming","Body Grooming"];
const FEMALE_ONLY = ["Bridal & Events"];
const SORT_OPTIONS = [
  { key: "nearby", label: "Nearest"  },
  { key: "rated",  label: "Top Rated"},
  { key: "booked", label: "Trending" },
];
const HERO_CHIPS = [
  { label: "Salon",          cat: "Hair Services",        Icon: Scissors  },
  { label: "Barbershop",     cat: "Beard & Grooming",     Icon: User      },
  { label: "Spa & Wellness", cat: "Spa & Massage",        Icon: Droplets  },
  { label: "Makeup & Bridal",cat: "Bridal & Events",      Icon: Sparkles  },
  { label: "Skin & Derma",   cat: "Skin & Face / Beauty", Icon: Leaf      },
];


// ── Open-now ──────────────────────────────────────────────────────
const DAYS = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
function isOpenNow(wh) {
  if (!wh) return null;
  const h = wh[DAYS[new Date().getDay()]];
  if (!h || h.isClosed || !h.open || !h.close) return false;
  const now = new Date(), nm = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = h.open.split(":").map(Number);
  const [ch, cm] = h.close.split(":").map(Number);
  return nm >= oh * 60 + om && nm < ch * 60 + cm;
}

// ── Search input ──────────────────────────────────────────────────
function SearchInput({ value, onChange, onSearch, onFocus, onBlur, focused, onClear, onLocate, locLoading, searching, compact }) {
  const handleKey = e => { if (e.key === "Enter") { e.preventDefault(); onSearch?.(); } };
  return (
    <div style={{
      display: "flex", alignItems: "center",
      gap: compact ? 10 : 14, padding: compact ? "0 16px" : "0 22px",
      height: compact ? 46 : 62, borderRadius: 999,
      background: focused ? "var(--t-card)" : "var(--t-input-bg)",
      border: focused ? "1.5px solid rgba(99,102,241,0.6)" : "1.5px solid var(--t-border)",
      boxShadow: focused
        ? "0 0 0 4px rgba(99,102,241,0.09),0 8px 40px rgba(99,102,241,0.14)"
        : compact ? "none" : "0 4px 32px rgba(0,0,0,0.08)",
      transition: "all 0.22s ease",
    }}>
      <button onClick={onSearch} style={{ display:"flex", background:"none", border:"none", cursor:value?"pointer":"default", padding:0, flexShrink:0 }}>
        <Search style={{ width:compact?16:19, height:compact?16:19, color:focused?"var(--t-accent)":"var(--t-text-3)", transition:"color 0.2s" }} />
      </button>
      <input
        type="text" placeholder="Search salons, services, city…" value={value}
        onChange={e => onChange(e.target.value)} onKeyDown={handleKey} onFocus={onFocus} onBlur={onBlur}
        style={{ flex:1, background:"transparent", border:"none", outline:"none", fontSize:compact?14:15.5, color:"var(--t-text)", minWidth:0, fontFamily:"inherit", fontWeight:500 }}
      />
      {value && !searching && (
        <button onClick={onClear} style={{ background:"none",border:"none",cursor:"pointer",padding:2,display:"flex",opacity:0.55 }}>
          <X style={{ width:15,height:15,color:"var(--t-text-2)" }} />
        </button>
      )}
      {searching && <span style={{ width:15,height:15,border:"2px solid var(--t-accent)",borderTopColor:"transparent",borderRadius:"50%",display:"block",flexShrink:0,animation:"spin 0.7s linear infinite" }} />}
      <div style={{ width:1,height:20,background:"var(--t-border)",flexShrink:0 }} />
      <button onClick={onLocate} disabled={locLoading} title="Detect location"
        style={{ display:"flex",alignItems:"center",gap:5,background:"none",border:"none",cursor:"pointer",color:"var(--t-accent)",fontSize:12,fontWeight:700,flexShrink:0,opacity:locLoading?0.5:1 }}>
        {locLoading
          ? <span style={{ width:14,height:14,border:"2px solid var(--t-accent)",borderTopColor:"transparent",borderRadius:"50%",display:"block",animation:"spin 0.7s linear infinite" }} />
          : <LocateFixed style={{ width:15,height:15 }} />}
        {!compact && <span className="hidden sm:inline" style={{ fontSize:12 }}>Locate</span>}
      </button>
    </div>
  );
}

// ── Editorial Card ────────────────────────────────────────────────
function EditorialCard({ salon }) {
  const [hovered, setHovered] = useState(false);
  const hasPhoto  = salon.photos?.[0] || salon.coverPhoto || salon.image;
  const rating    = parseFloat(salon.averageRating || salon.rating || 0);
  const openStatus = useMemo(() => isOpenNow(salon.workingHours), [salon.workingHours]);
  const desc  = salon.description || salon.tagline
    || salon.offeredCategoryNames?.slice(0,3).join(" · ")
    || "Premium salon services";
  const loc   = salon.city || salon.address?.split(",")[0] || "";
  const price = salon.minPrice ? `\u20b9${salon.minPrice}+` : null;

  return (
    <Link to={salonPath(salon)} style={{ textDecoration:"none",display:"block" }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {/* 4:5 Image */}
      <div style={{
        position:"relative", paddingBottom:"125%", borderRadius:18, overflow:"hidden",
        marginBottom:22,
        boxShadow: hovered ? "0 28px 56px rgba(25,28,30,0.18)" : "0 6px 28px rgba(25,28,30,0.06)",
        transition:"box-shadow 0.6s ease",
      }}>
        <div style={{ position:"absolute",inset:0 }}>
          {hasPhoto ? (
            <img src={hasPhoto} alt={salon.name} loading="lazy"
              style={{ width:"100%",height:"100%",objectFit:"cover",transition:"transform 1.1s ease",transform:hovered?"scale(1.12)":"scale(1)" }}
            />
          ) : (
            <div style={{ width:"100%",height:"100%",background:"linear-gradient(145deg,#6366f1,#8b5cf6,#a78bfa)" }} />
          )}
          {/* Gradient overlay */}
          <div style={{ position:"absolute",inset:0,background:"linear-gradient(to top,rgba(10,10,20,0.7) 0%,transparent 50%)",opacity:0.75 }} />

          {/* Open Now badge */}
          {openStatus === true && (
            <div style={{ position:"absolute",top:16,left:16 }}>
              <span style={{
                background:"rgba(255,255,255,0.95)",backdropFilter:"blur(10px)",
                padding:"5px 14px",borderRadius:999,fontSize:10,fontWeight:800,
                textTransform:"uppercase",letterSpacing:"0.08em",color:"#3525cd",
                boxShadow:"0 2px 10px rgba(0,0,0,0.1)",
              }}>Open Now</span>
            </div>
          )}

          {/* Rating */}
          {rating > 0 && (
            <div style={{
              position:"absolute",top:16,right:16,
              background:"rgba(255,255,255,0.92)",backdropFilter:"blur(10px)",
              padding:"5px 9px",borderRadius:10,
              display:"flex",alignItems:"center",gap:4,
              boxShadow:"0 2px 10px rgba(0,0,0,0.1)",
            }}>
              <Star style={{ width:11,height:11,color:"#f59e0b",fill:"#f59e0b" }} />
              <span style={{ fontSize:12,fontWeight:800,color:"#0f172a" }}>{rating.toFixed(1)}</span>
            </div>
          )}

          {/* Hover glass CTA */}
          <div style={{
            position:"absolute",bottom:0,left:0,right:0,padding:"0 20px 20px",
            transform:hovered?"translateY(0)":"translateY(44px)",
            opacity:hovered?1:0,
            transition:"transform 0.55s cubic-bezier(0.16,1,0.3,1),opacity 0.55s ease",
            pointerEvents:"none",
          }}>
            <div style={{
              background:"rgba(255,255,255,0.16)",backdropFilter:"blur(16px)",
              padding:"13px 16px",borderRadius:14,
              border:"1px solid rgba(255,255,255,0.22)",textAlign:"center",
            }}>
              <p style={{ color:"#fff",fontWeight:800,fontSize:13,margin:0,letterSpacing:"0.01em" }}>Quick Book Available</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7 }}>
          <h3 style={{
            fontSize:20,fontWeight:800,color:"var(--t-text)",
            letterSpacing:"-0.028em",lineHeight:1.15,margin:0,
          }}>{salon.name}</h3>
          {price && <span style={{ color:"var(--t-accent)",fontWeight:800,fontSize:13,flexShrink:0,marginLeft:12 }}>{price}</span>}
        </div>
        <p style={{
          color:"var(--t-text-2)",fontSize:13,lineHeight:1.7,marginBottom:14,
          display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden",
        }}>{desc}</p>
        <div style={{ display:"flex",alignItems:"center",gap:18 }}>
          {loc && (
            <span style={{ fontSize:11,fontWeight:700,color:"var(--t-text-3)",display:"flex",alignItems:"center",gap:4,textTransform:"uppercase",letterSpacing:"0.04em" }}>
              <MapPin style={{ width:11,height:11 }} />{loc}
            </span>
          )}
          {salon.category && (
            <span style={{ fontSize:11,fontWeight:700,color:"var(--t-text-3)",display:"flex",alignItems:"center",gap:4,textTransform:"uppercase",letterSpacing:"0.04em" }}>
              <Scissors style={{ width:11,height:11 }} />{salon.category.replace(/_/g," ")}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Editorial skeleton ────────────────────────────────────────────
function EditorialSkeleton() {
  return (
    <div>
      <div style={{ paddingBottom:"125%",position:"relative",borderRadius:18,overflow:"hidden",marginBottom:22 }}>
        <div className="skeleton" style={{ position:"absolute",inset:0 }} />
      </div>
      <div className="skeleton" style={{ height:24,width:"65%",borderRadius:9,marginBottom:12 }} />
      <div className="skeleton" style={{ height:14,width:"100%",borderRadius:7,marginBottom:7 }} />
      <div className="skeleton" style={{ height:14,width:"78%",borderRadius:7,marginBottom:16 }} />
      <div style={{ display:"flex",gap:18 }}>
        <div className="skeleton" style={{ height:11,width:64,borderRadius:5 }} />
        <div className="skeleton" style={{ height:11,width:52,borderRadius:5 }} />
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────
export default function Home() {
  const isLoggedIn = !!localStorage.getItem("customerToken");
  const { isDark } = useTheme();
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
  const [premiumOnly, setPremiumOnly]   = useState(false);
  const [userCoords, setUserCoords]     = useState(null);
  const [serviceMatchLabel, setServiceMatchLabel] = useState("");
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [adminHeroImage, setAdminHeroImage] = useState(null);
  const [showSticky, setShowSticky]     = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showSortPanel, setShowSortPanel]     = useState(false);
  const heroSearchRef = useRef(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    API.get("/customer/auth/me").then(res => {
      const d = res.data?.data || {};
      const n = d.name || d.firstName || "";
      if (n) setUserName(n);
      if (d.gender === "male" || d.gender === "female") {
        setGenderFilter(d.gender);
        localStorage.setItem("customerGender", d.gender);
      }
    }).catch(() => {});
  }, [isLoggedIn]);

  useEffect(() => {
    if (!heroSearchRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { rootMargin: "-68px 0px 0px 0px", threshold: 0 }
    );
    observer.observe(heroSearchRef.current);
    return () => observer.disconnect();
  }, []);

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

  useEffect(() => {
    if (!isLoggedIn) return;
    API.get("/customer/bookings").then(res => {
      const arr = res.data.data?.bookings || res.data.data || [];
      setUpcomingCount(Array.isArray(arr)
        ? arr.filter(b => ["pending","confirmed","in_progress"].includes(b.status)).length
        : 0);
    }).catch(() => {});
  }, [isLoggedIn]);

  useEffect(() => {
    API.get("/public/site-settings").then(res => {
      const imgs = res.data.data?.heroImages || [];
      if (imgs.length > 0) setAdminHeroImage(imgs[0].url);
    }).catch(() => {});
  }, []);

  const applyFilters = (data, cats, gender, onlyOpen, onlyPremium) => {
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
    if (onlyPremium) { r = r.filter(s => s.isPremium === true || s.isPromoted === true); }
    return r;
  };

  const fetchBySort = async (sortKey, coords, cats, gender) => {
    if (!coords) return;
    setLoading(true); setSearchText(""); setServiceMatchLabel("");
    try {
      const res = await API.get(`/public/salons/nearby?latitude=${coords.lat}&longitude=${coords.lng}&sort=${sortKey}`);
      const data = res.data.data?.salons || res.data.data || [];
      setAllSalons(data);
      setSalons(applyFilters(data, cats ?? selectedCats, gender ?? genderFilter, openNow, premiumOnly));
    } catch { setAllSalons([]); setSalons([]); }
    finally { setLoading(false); }
  };

  const handleCategory = cat => {
    const newCats = selectedCats.includes(cat) ? selectedCats.filter(c => c !== cat) : [...selectedCats, cat];
    setSelectedCats(newCats);
    if (searchText.trim()) { runSearch(searchText, newCats); }
    else { setSalons(applyFilters(allSalons, newCats, genderFilter, openNow, premiumOnly)); }
  };

  const handleGenderFilter = gender => {
    const newCats = selectedCats.filter(k => {
      if (gender === "female" && MALE_ONLY.includes(k)) return false;
      if (gender === "male"   && FEMALE_ONLY.includes(k)) return false;
      return true;
    });
    setSelectedCats(newCats); setGenderFilter(gender);
    if (searchText.trim()) { runSearch(searchText, newCats, gender); }
    else { setSalons(applyFilters(allSalons, newCats, gender, openNow, premiumOnly)); }
  };

  const handleOpenNow = () => {
    const next = !openNow; setOpenNow(next);
    setSalons(applyFilters(allSalons, selectedCats, genderFilter, next, premiumOnly));
  };

  const handlePremiumOnly = () => {
    const next = !premiumOnly; setPremiumOnly(next);
    setSalons(applyFilters(allSalons, selectedCats, genderFilter, openNow, next));
  };

  const runSearch = useCallback(async (text, cats, gender) => {
    if (!text.trim()) return;
    setSearching(true); setServiceMatchLabel("");
    const q = text.toLowerCase();
    const ac = cats ?? selectedCats, ag = gender ?? genderFilter;
    const local = allSalons.filter(s => s.name?.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q) || s.address?.toLowerCase().includes(q));
    const localF = applyFilters(local, ac, ag, openNow, premiumOnly);
    if (localF.length > 0) { setSalons(localF); setSearching(false); return; }
    try {
      const res = await API.get(`/public/services/search?q=${encodeURIComponent(text.trim())}`);
      const d = res.data.data;
      if (d?.salons?.length > 0) { setSalons(applyFilters(d.salons, ac, ag, openNow, premiumOnly)); setServiceMatchLabel(`Salons offering "${d.matchedService}"`); }
      else { setSalons([]); }
    } catch { setSalons([]); }
    finally { setSearching(false); }
  }, [allSalons, selectedCats, genderFilter, openNow, premiumOnly]);

  const handleSearch = text => {
    setSearchText(text);
    if (!text.trim()) { setServiceMatchLabel(""); setSalons(applyFilters(allSalons, selectedCats, genderFilter, openNow, premiumOnly)); }
  };
  const handleSearchSubmit = () => { if (searchText.trim()) runSearch(searchText, selectedCats); };

  const handleLocation = async () => {
    if (!navigator.geolocation) { alert("Your browser does not support location. Please try Chrome or Firefox."); return; }
    if (navigator.permissions) {
      try {
        const r = await navigator.permissions.query({ name: "geolocation" });
        if (r.state === "denied") { setLocDenied(true); alert("Location access is blocked. Please allow it in your browser's address bar settings, then try again."); return; }
      } catch { /* not supported */ }
    }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords); setLocDenied(false); setSort("nearby"); setGenderFilter("all");
        fetchBySort("nearby", coords, [], "all").finally(() => setLocLoading(false));
      },
      err => {
        setLocLoading(false); setLocDenied(true);
        if (err.code === 1) { alert("Location access denied. Click the lock/location icon in your browser's address bar and allow location, then try again."); }
        else { alert("Could not detect your location. Please check your device's location settings."); }
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 120000 }
    );
  };

  const handleSortChange = key => {
    setSort(key); setShowSortPanel(false);
    if (!searchText.trim()) fetchBySort(key, userCoords, selectedCats, genderFilter);
    setTimeout(() => document.getElementById("salon-grid")?.scrollIntoView({ behavior:"smooth", block:"start" }), 80);
  };

  const clearAll = () => {
    setSearchText(""); setSelectedCats([]); setGenderFilter("all"); setOpenNow(false); setPremiumOnly(false);
    setServiceMatchLabel(""); setSalons(allSalons); setShowFilterPanel(false);
  };

  const isSearchActive = searchText.trim().length > 0;
  const isFiltered     = selectedCats.length > 0 || genderFilter !== "all" || openNow || premiumOnly;
  const hasActiveState = isSearchActive || isFiltered;

  const sectionTitle = serviceMatchLabel
    || (isSearchActive ? "Search Results"
    : sort === "rated"  ? "Top Rated Salons"
    : sort === "booked" ? "Trending Salons"
    : "GlowSpots Near You");

  const heroBgImage = adminHeroImage || "/pngtree-salon-service-salon-design-hd-image_2512958.jpg";

  const bentoSalons = useMemo(() => {
    if (!allSalons.length) return [];
    return [...allSalons].sort((a, b) => parseFloat(b.averageRating || 0) - parseFloat(a.averageRating || 0)).slice(0, 2);
  }, [allSalons]);

  // ── Guest view ───────────────────────────────────────────────
  if (!isLoggedIn) {
    const guestGrid = (
      <div id="salons">
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10 }}>
          <h2 style={{ fontSize:17,fontWeight:800,color:"var(--t-text)",marginBottom:2 }}>
            {serviceMatchLabel || (sort==="rated"?"Top Rated Salons":sort==="booked"?"Trending Salons":"Salons Near You")}
          </h2>
        </div>
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {Array(8).fill(0).map((_,i) => (
              <div key={i} className="rounded-3xl overflow-hidden" style={{ background:"var(--t-card)",border:"1px solid var(--t-border)" }}>
                <div className="h-44 skeleton" />
                <div className="p-4 space-y-3">
                  <div className="h-4 skeleton rounded-lg w-3/4" />
                  <div className="h-3 skeleton rounded-lg w-1/2" />
                  <div className="h-9 skeleton rounded-xl w-full mt-2" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && salons.length === 0 && !locDenied && (
          <div style={{ textAlign:"center",padding:"48px 20px" }}>
            <SearchX style={{ width:36,height:36,color:"var(--t-border)",margin:"0 auto 14px" }} />
            <p style={{ fontSize:15,fontWeight:600,color:"var(--t-text)" }}>No salons found</p>
            <p style={{ fontSize:13,color:"var(--t-text-3)" }}>Try adjusting your filters.</p>
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
      <div style={{ background:"var(--t-bg)",minHeight:"100vh" }}>
        <LandingPage
          searchText={searchText} onSearch={handleSearch} onSearchSubmit={handleSearchSubmit}
          onLocate={handleLocation} locLoading={locLoading} searching={searching}
          selectedCats={selectedCats} onCategorySelect={handleCategory}
          sort={sort} onSortChange={handleSortChange}
          genderFilter={genderFilter} salonGrid={guestGrid}
        />
      </div>
    );
  }

  // ── Logged-in view ───────────────────────────────────────────
  const heroOverlayLight = "linear-gradient(90deg,#f9fafb 0%,rgba(249,250,251,0.97) 32%,rgba(249,250,251,0.72) 55%,transparent 100%)";
  const heroOverlayDark  = "linear-gradient(90deg,#111827 0%,rgba(17,24,39,0.97) 32%,rgba(17,24,39,0.72) 55%,transparent 100%)";
  const heroOverlay = isDark ? heroOverlayDark : heroOverlayLight;

  return (
    <div style={{ background:"var(--t-bg)", minHeight:"100vh", overflowX:"hidden", fontFamily:'"Plus Jakarta Sans", system-ui, sans-serif', WebkitTapHighlightColor:"transparent" }}>


      {/* ══════════════════════════════════════════════════════════
          HERO — full editorial, min 85vh
      ══════════════════════════════════════════════════════════ */}
      <section style={{
        position:"relative",
        minHeight:"min(85vh,680px)",
        display:"flex",
        alignItems:"center",
        overflow:"hidden",
      }}>

        {/* Background: theme hero gradient always present */}
        <div style={{ position:"absolute", inset:0, background:"var(--t-hero-bg)" }} />

        {/* Noise texture */}
        <div style={{
          position:"absolute", inset:0,
          backgroundImage:"var(--noise-url)",
          opacity:0.035, mixBlendMode:"overlay", pointerEvents:"none",
        }} />

        {/* Photo (right half, masked) */}
        <img
            src={heroBgImage} alt="" aria-hidden="true"
            style={{
              position:"absolute", inset:0,
              width:"100%", height:"100%", objectFit:"cover",
              maskImage: "linear-gradient(to left, black 0%, black 38%, transparent 68%)",
              WebkitMaskImage: "linear-gradient(to left, black 0%, black 38%, transparent 68%)",
            }}
          />

        {/* Gradient overlay — blends photo with bg */}
        <div style={{ position:"absolute", inset:0, background:heroOverlay }} />

        {/* Radial accent glow */}
        <div style={{
          position:"absolute", top:"-10%", left:"-5%",
          width:600, height:600, borderRadius:"50%",
          background: isDark
            ? "radial-gradient(ellipse,rgba(99,102,241,0.18) 0%,transparent 65%)"
            : "radial-gradient(ellipse,rgba(99,102,241,0.1) 0%,transparent 65%)",
          pointerEvents:"none",
        }} />

        {/* Content */}
        <div style={{
          position:"relative", zIndex:1,
          width:"100%", maxWidth:1280,
          margin:"0 auto",
          padding:"clamp(28px,6vh,100px) clamp(16px,5vw,80px)",
        }}>
          <div style={{ maxWidth:680 }}>

            {/* Overline */}
            <div style={{
              display:"inline-flex", alignItems:"center", gap:8,
              marginBottom:20,
            }}>
              <span style={{
                display:"inline-block",
                width:28, height:2,
                background:"var(--t-accent)",
                borderRadius:999,
              }} />
              <span style={{
                fontSize:11, fontWeight:800, letterSpacing:"0.16em",
                textTransform:"uppercase", color:"var(--t-accent)",
              }}>
                {getGreeting()}, {userName}
              </span>
            </div>

            {/* Headline */}
            <h1 style={{
              fontSize:"clamp(36px, 6.5vw, 96px)",
              fontWeight:900,
              lineHeight:1.0,
              letterSpacing:"-0.04em",
              color:"var(--t-hero-text)",
              margin:"0 0 10px",
            }}>
              Book Smart.<br />Save Time.
            </h1>
            <h1 style={{
              fontSize:"clamp(28px, 4.5vw, 72px)",
              fontWeight:900,
              lineHeight:1.05,
              letterSpacing:"-0.03em",
              margin:"0 0 28px",
              background:"linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a78bfa 100%)",
              WebkitBackgroundClip:"text",
              WebkitTextFillColor:"transparent",
              backgroundClip:"text",
            }}>
              Don't let your glow wait.
            </h1>

            {/* Sub-line */}
            <p style={{
              fontSize:16, fontWeight:500, color:"var(--t-hero-sub)",
              marginBottom:32, lineHeight:1.6, maxWidth:480,
            }}>
              Discover and book the best GlowSpot near you — verified, rated, and ready.
            </p>

            {/* Quick chips */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:28 }}>
              {HERO_CHIPS.map(({ label, cat, Icon }) => {
                const active = selectedCats.includes(cat);
                return (
                  <button
                    key={label} onClick={() => handleCategory(cat)}
                    style={{
                      display:"flex", alignItems:"center", gap:8,
                      padding:"10px 20px", borderRadius:999,
                      fontSize:13, fontWeight:700, cursor:"pointer",
                      transition:"all 0.2s ease",
                      background: active
                        ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                        : "var(--t-hero-card)",
                      backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)",
                      border: active ? "1px solid rgba(139,92,246,0.5)" : "1px solid var(--t-hero-border)",
                      color: active ? "#fff" : "var(--t-hero-text)",
                      boxShadow: active
                        ? "0 0 24px rgba(99,102,241,0.42), 0 4px 16px rgba(0,0,0,0.1)"
                        : "0 2px 16px rgba(0,0,0,0.08)",
                      transform: active ? "scale(0.97)" : "scale(1)",
                    }}
                  >
                    <Icon style={{ width:14, height:14 }} />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Search bar */}
            <div ref={heroSearchRef} id="hero-search" style={{ maxWidth:560 }}>
              <SearchInput
                value={searchText} onChange={handleSearch} onSearch={handleSearchSubmit}
                onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                focused={focused} onClear={() => handleSearch("")}
                onLocate={handleLocation} locLoading={locLoading} searching={searching}
              />
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          STICKY DISCOVERY BAR
      ══════════════════════════════════════════════════════════ */}
      <div style={{
        position:"sticky", top:64, zIndex:40,
        background:"var(--t-nav-bg)", backdropFilter:"blur(28px)", WebkitBackdropFilter:"blur(28px)",
        borderBottom:"1px solid var(--t-border)",
      }}>
        <div className="max-w-7xl mx-auto" style={{ padding:"10px 24px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>

            {/* Pills */}
            <div className="scrollbar-hide" style={{ overflowX:"auto", WebkitOverflowScrolling:"touch", flex:1, display:"flex", gap:6, minWidth:0 }}>
              {/* All Services */}
              <button onClick={clearAll} style={{
                whiteSpace:"nowrap", padding:"7px 18px", borderRadius:999,
                fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.18s ease",
                background: !hasActiveState ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "var(--t-input-bg)",
                border: !hasActiveState ? "1px solid rgba(139,92,246,0.35)" : "1px solid var(--t-border)",
                color: !hasActiveState ? "#fff" : "var(--t-text-2)",
                boxShadow: !hasActiveState ? "0 2px 14px rgba(99,102,241,0.24)" : "none",
                flexShrink:0,
              }}>All Services</button>

              {/* For Men */}
              {(() => {
                const active = genderFilter === "male";
                return <button onClick={() => handleGenderFilter(active?"all":"male")} style={{
                  whiteSpace:"nowrap", padding:"7px 18px", borderRadius:999,
                  fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.18s ease",
                  background: active ? "rgba(99,102,241,0.1)" : "var(--t-input-bg)",
                  border: active ? "1px solid rgba(99,102,241,0.32)" : "1px solid var(--t-border)",
                  color: active ? "var(--t-accent)" : "var(--t-text-2)", flexShrink:0,
                }}>For Men</button>;
              })()}

              {/* For Women */}
              {(() => {
                const active = genderFilter === "female";
                return <button onClick={() => handleGenderFilter(active?"all":"female")} style={{
                  whiteSpace:"nowrap", padding:"7px 18px", borderRadius:999,
                  fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.18s ease",
                  background: active ? "rgba(236,72,153,0.1)" : "var(--t-input-bg)",
                  border: active ? "1px solid rgba(236,72,153,0.32)" : "1px solid var(--t-border)",
                  color: active ? "#ec4899" : "var(--t-text-2)", flexShrink:0,
                }}>For Women</button>;
              })()}

              {/* Premium Only */}
              <button onClick={handlePremiumOnly} style={{
                whiteSpace:"nowrap", padding:"7px 18px", borderRadius:999,
                fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.18s ease",
                display:"flex", alignItems:"center", gap:5,
                background: premiumOnly ? "rgba(234,179,8,0.12)" : "var(--t-input-bg)",
                border: premiumOnly ? "1px solid rgba(234,179,8,0.4)" : "1px solid var(--t-border)",
                color: premiumOnly ? "#d97706" : "var(--t-text-2)", flexShrink:0,
              }}>
                <Crown style={{ width:12, height:12 }} />
                Premium
              </button>

              {/* Category pills */}
              {CATEGORIES.filter(({ key }) => {
                if (genderFilter === "female" && MALE_ONLY.includes(key)) return false;
                if (genderFilter === "male"   && FEMALE_ONLY.includes(key)) return false;
                return true;
              }).map(({ key, label }) => {
                const active = selectedCats.includes(key);
                return (
                  <button key={key} onClick={() => handleCategory(key)} style={{
                    whiteSpace:"nowrap", padding:"7px 18px", borderRadius:999,
                    fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.18s ease",
                    background: active ? "rgba(99,102,241,0.1)" : "var(--t-input-bg)",
                    border: active ? "1px solid rgba(99,102,241,0.28)" : "1px solid var(--t-border)",
                    color: active ? "var(--t-accent)" : "var(--t-text-2)", flexShrink:0,
                  }}>{label}</button>
                );
              })}
            </div>

            {/* Controls */}
            <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
              <button
                onClick={() => { setShowFilterPanel(p => !p); setShowSortPanel(false); }}
                style={{
                  display:"flex", alignItems:"center", gap:6,
                  padding:"7px 14px", borderRadius:10,
                  fontSize:12, fontWeight:700, cursor:"pointer",
                  background: showFilterPanel ? "rgba(99,102,241,0.1)" : "var(--t-input-bg)",
                  border: showFilterPanel ? "1px solid rgba(99,102,241,0.3)" : "1px solid var(--t-border)",
                  color: showFilterPanel ? "var(--t-accent)" : "var(--t-text-2)",
                  transition:"all 0.18s ease",
                }}
              >
                <SlidersHorizontal style={{ width:13,height:13 }} />
                Filters
              </button>
              <div style={{ width:1,height:18,background:"var(--t-border)" }} />
              <div style={{ position:"relative" }}>
                <button
                  onClick={() => { setShowSortPanel(p => !p); setShowFilterPanel(false); }}
                  style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, fontWeight:700, cursor:"pointer", background:"none", border:"none", color:"var(--t-text-2)" }}
                >
                  {SORT_OPTIONS.find(s => s.key === sort)?.label || "Sort"}
                  <ChevronDown style={{ width:14,height:14, transition:"transform 0.2s", transform:showSortPanel?"rotate(180deg)":"rotate(0)" }} />
                </button>
                {showSortPanel && (
                  <div style={{ position:"absolute", right:0, top:"calc(100% + 10px)", background:"var(--t-card)", border:"1px solid var(--t-border)", borderRadius:12, overflow:"hidden", boxShadow:"0 12px 40px rgba(0,0,0,0.14)", zIndex:50, minWidth:148 }}>
                    {SORT_OPTIONS.map(opt => (
                      <button key={opt.key} onClick={() => handleSortChange(opt.key)} style={{
                        display:"block", width:"100%", padding:"11px 18px", textAlign:"left",
                        fontSize:13, fontWeight: sort===opt.key ? 700 : 500, cursor:"pointer",
                        background: sort===opt.key ? "rgba(99,102,241,0.07)" : "transparent",
                        border:"none", borderBottom:"1px solid var(--t-border)",
                        color: sort===opt.key ? "var(--t-accent)" : "var(--t-text)",
                        transition:"background 0.15s ease",
                      }}>{opt.label}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Expanded filter panel */}
          {showFilterPanel && (
            <div style={{ padding:"10px 0 4px", display:"flex", alignItems:"center", gap:10, borderTop:"1px solid var(--t-border)", marginTop:10, flexWrap:"wrap" }}>
              <button onClick={handleOpenNow} style={{
                display:"flex", alignItems:"center", gap:6,
                padding:"6px 14px", borderRadius:999,
                fontSize:12, fontWeight:700, cursor:"pointer",
                background: openNow ? "rgba(16,185,129,0.1)" : "var(--t-input-bg)",
                border: openNow ? "1px solid rgba(16,185,129,0.35)" : "1px solid var(--t-border)",
                color: openNow ? "#059669" : "var(--t-text-2)", transition:"all 0.18s ease",
              }}>
                <span style={{ width:7,height:7,borderRadius:"50%",background:openNow?"#10b981":"var(--t-text-3)",display:"inline-block" }} />
                Open Now
              </button>
              <Link to="/dashboard" style={{
                display:"flex", alignItems:"center", gap:6,
                padding:"6px 14px", borderRadius:999,
                fontSize:12, fontWeight:700, textDecoration:"none",
                background:"var(--t-input-bg)", border:"1px solid var(--t-border)",
                color:"var(--t-text-2)", transition:"all 0.18s ease",
              }}>
                <CalendarCheck style={{ width:12,height:12 }} />
                My Bookings
                {upcomingCount > 0 && (
                  <span style={{ background:"#6366f1",color:"#fff",fontSize:9,fontWeight:800,width:16,height:16,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    {upcomingCount}
                  </span>
                )}
              </Link>
              {hasActiveState && (
                <button onClick={clearAll} style={{ fontSize:12,fontWeight:600,color:"var(--t-accent)",background:"none",border:"none",cursor:"pointer",padding:"6px 4px" }}>
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── LOCATION DENIED ────────────────────────────────────── */}
      {locDenied && !isSearchActive && (
        <div className="max-w-2xl mx-auto px-6 pt-16 pb-28 text-center">
          <div style={{ width:80,height:80,borderRadius:"50%",background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.2)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px" }}>
            <MapPin style={{ width:32,height:32,color:"var(--t-accent)" }} />
          </div>
          <h3 style={{ fontSize:22,fontWeight:800,color:"var(--t-text)",marginBottom:10,letterSpacing:"-0.02em" }}>Enable Location Access</h3>
          <p style={{ fontSize:15,color:"var(--t-text-2)",maxWidth:320,margin:"0 auto 28px",lineHeight:1.75 }}>
            We show salons within 5 km of your location. No data is stored.
          </p>
          <button onClick={handleLocation} disabled={locLoading} style={{
            background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",
            border:"none",borderRadius:14,padding:"13px 32px",
            fontSize:14,fontWeight:700,cursor:"pointer",
            boxShadow:"0 0 28px rgba(99,102,241,0.4)",
            display:"inline-flex",alignItems:"center",gap:9,
          }}>
            <LocateFixed style={{ width:16,height:16 }} />
            {locLoading ? "Detecting..." : "Allow Location"}
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          CURATED BENTO SECTION
      ══════════════════════════════════════════════════════════ */}
      {!locDenied && (loading || bentoSalons.length >= 2) && (
        <section style={{ maxWidth:1280, margin:"0 auto", padding:"52px 24px 0" }}>
          {/* Section label */}
          <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:28 }}>
            <div>
              <p style={{ fontSize:11,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:"var(--t-accent)",marginBottom:4 }}>
                Handpicked for You
              </p>
              <h2 style={{ fontSize:"clamp(20px,3vw,26px)",fontWeight:800,color:"var(--t-text)",letterSpacing:"-0.025em",margin:0 }}>
                Curated Picks
              </h2>
            </div>
          </div>

          {/* Bento grid — responsive */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

            {/* Large card — lg: span 2 */}
            <div className="lg:col-span-2" style={{ position:"relative",borderRadius:20,overflow:"hidden",minHeight:360,background:"var(--t-card)" }}>
              {loading ? (
                <div className="skeleton" style={{ position:"absolute",inset:0 }} />
              ) : (() => {
                const s = bentoSalons[0]; if (!s) return null;
                const hp = s.photos?.[0] || s.coverPhoto;
                const rt = parseFloat(s.averageRating || 0);
                return (
                  <Link to={salonPath(s)} style={{ textDecoration:"none",display:"block",position:"relative",height:"100%",minHeight:360 }}>
                    {hp ? (
                      <img src={hp} alt={s.name} style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover" }} />
                    ) : (
                      <div style={{ position:"absolute",inset:0,background:"linear-gradient(135deg,#4338ca,#7c3aed)" }} />
                    )}
                    <div style={{ position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.15) 50%,transparent 100%)" }} />
                    <div style={{ position:"absolute",bottom:0,left:0,padding:"28px 28px 28px" }}>
                      <span style={{ background:"#6366f1",color:"#fff",fontSize:10,fontWeight:800,padding:"5px 14px",borderRadius:999,textTransform:"uppercase",letterSpacing:"0.12em",display:"inline-block",marginBottom:12 }}>
                        Top Pick
                      </span>
                      <h3 style={{ fontSize:28,fontWeight:900,color:"#fff",marginBottom:7,letterSpacing:"-0.03em",lineHeight:1.1,textShadow:"0 2px 12px rgba(0,0,0,0.4)" }}>
                        {s.name}
                      </h3>
                      <p style={{ color:"rgba(255,255,255,0.7)",fontSize:13,marginBottom:20,maxWidth:300,lineHeight:1.65 }}>
                        {s.description || s.tagline || s.offeredCategoryNames?.slice(0,2).join(", ") || "Premium salon experience"}
                      </p>
                      <span style={{ display:"inline-flex",alignItems:"center",gap:7,background:"#fff",color:"#0f172a",border:"none",borderRadius:10,padding:"11px 22px",fontSize:13,fontWeight:800,cursor:"pointer" }}>
                        Book Session <ArrowRight style={{ width:13,height:13 }} />
                      </span>
                    </div>
                    {rt > 0 && (
                      <div style={{ position:"absolute",top:20,right:20,background:"rgba(255,255,255,0.18)",backdropFilter:"blur(10px)",padding:"6px 11px",borderRadius:999,display:"flex",alignItems:"center",gap:5,border:"1px solid rgba(255,255,255,0.22)" }}>
                        <Star style={{ width:12,height:12,color:"#fcd34d",fill:"#fcd34d" }} />
                        <span style={{ color:"#fff",fontSize:12,fontWeight:800 }}>{rt.toFixed(1)}</span>
                      </div>
                    )}
                  </Link>
                );
              })()}
            </div>

            {/* Verified card */}
            <div style={{ borderRadius:20,background:"var(--t-card)",border:"1px solid var(--t-border)",padding:28,display:"flex",flexDirection:"column",justifyContent:"space-between",minHeight:280 }}>
              <div style={{ display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",flex:1,justifyContent:"center",paddingTop:8 }}>
                <div style={{ width:64,height:64,borderRadius:"50%",background:"rgba(99,102,241,0.1)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:18 }}>
                  <CheckCircle2 style={{ width:28,height:28,color:"var(--t-accent)" }} />
                </div>
                <h4 style={{ fontSize:19,fontWeight:800,color:"var(--t-text)",marginBottom:10,letterSpacing:"-0.025em" }}>Verified Only</h4>
                <p style={{ color:"var(--t-text-2)",fontSize:13,lineHeight:1.7 }}>
                  Every salon is hand-picked and verified for quality, safety, and standards.
                </p>
              </div>
              <button style={{ width:"100%",marginTop:22,background:"var(--t-input-bg)",border:"1px solid var(--t-border)",borderRadius:11,padding:"11px 0",fontSize:13,fontWeight:700,color:"var(--t-text)",cursor:"pointer" }}>
                Learn More
              </button>
            </div>

            {/* 2nd salon */}
            <div style={{ borderRadius:20,overflow:"hidden",position:"relative",background:"var(--t-card)",minHeight:280 }}>
              {loading ? (
                <div className="skeleton" style={{ position:"absolute",inset:0 }} />
              ) : (() => {
                const s = bentoSalons[1]; if (!s) return null;
                const hp = s.photos?.[0] || s.coverPhoto;
                return (
                  <Link to={salonPath(s)} style={{ textDecoration:"none",display:"block",position:"relative",height:"100%",minHeight:280 }}>
                    {hp ? (
                      <img src={hp} alt={s.name} style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover" }} />
                    ) : (
                      <div style={{ position:"absolute",inset:0,background:"linear-gradient(135deg,#7c3aed,#4338ca)" }} />
                    )}
                    <div style={{ position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.82) 0%,transparent 55%)" }} />
                    <div style={{ position:"absolute",bottom:22,left:22,right:22 }}>
                      <h4 style={{ color:"#fff",fontWeight:900,fontSize:19,marginBottom:5,textShadow:"0 1px 6px rgba(0,0,0,0.5)",letterSpacing:"-0.025em",lineHeight:1.2 }}>
                        {s.name}
                      </h4>
                      {(s.city || s.minPrice) && (
                        <span style={{ color:"rgba(255,255,255,0.8)",fontSize:12,fontWeight:600 }}>
                          {[s.city, s.minPrice ? `from \u20b9${s.minPrice}` : null].filter(Boolean).join(" \u00b7 ")}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })()}
            </div>

          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════
          EDITORIAL GRID
      ══════════════════════════════════════════════════════════ */}
      {(!locDenied || isSearchActive) && (
        <section id="salon-grid" style={{ maxWidth:1440, margin:"0 auto", padding:"64px 24px 128px" }}>

          {/* Section header */}
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:48, gap:8, flexWrap:"wrap" }}>
            <div>
              <p style={{ fontSize:11,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:"var(--t-accent)",marginBottom:6 }}>
                {sort === "rated" ? "Best in Class" : sort === "booked" ? "Most Popular" : "Near You"}
              </p>
              <h2 style={{ fontSize:"clamp(24px,3.5vw,32px)",fontWeight:800,color:"var(--t-text)",letterSpacing:"-0.03em",margin:0 }}>
                {sectionTitle}
              </h2>
              {!loading && (
                <p style={{ fontSize:13,color:"var(--t-text-3)",marginTop:6 }}>
                  {salons.length} salon{salons.length !== 1 ? "s" : ""}{openNow ? " · open now" : ""}
                </p>
              )}
            </div>
            {hasActiveState && (
              <button onClick={clearAll} style={{ fontSize:12,fontWeight:700,color:"var(--t-accent)",background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.2)",cursor:"pointer",padding:"7px 16px",borderRadius:999 }}>
                Clear filters
              </button>
            )}
          </div>

          {/* Skeleton */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5">
              {Array(10).fill(0).map((_,i) => (
                <div key={i} className="overflow-hidden" style={{ borderRadius:18, background:"var(--t-card)", border:"1px solid var(--t-border)" }}>
                  <div className="skeleton" style={{ height:180 }} />
                  <div style={{ padding:"14px" }}>
                    <div className="skeleton" style={{ height:14, width:"70%", borderRadius:7, marginBottom:10 }} />
                    <div className="skeleton" style={{ height:11, width:"50%", borderRadius:5, marginBottom:8 }} />
                    <div className="skeleton" style={{ height:32, borderRadius:10, marginTop:12 }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && salons.length === 0 && (
            <div style={{ textAlign:"center",padding:"80px 20px" }}>
              <div style={{ width:60,height:60,borderRadius:"50%",background:"rgba(99,102,241,0.08)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px" }}>
                <SearchX style={{ width:26,height:26,color:"var(--t-text-3)" }} />
              </div>
              <h3 style={{ fontSize:18,fontWeight:700,color:"var(--t-text)",marginBottom:7,letterSpacing:"-0.02em" }}>No salons found</h3>
              <p style={{ fontSize:13,color:"var(--t-text-2)" }}>Try adjusting your filters or search.</p>
            </div>
          )}

          {/* Salon cards */}
          {!loading && salons.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5">
              {salons.map(s => <SalonCard key={s._id} salon={s} userCoords={userCoords} />)}
            </div>
          )}
        </section>
      )}

    </div>
  );
}
