import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  LocateFixed, Search, X, SearchX,
  Scissors, Sparkles, Droplets, User, Leaf,
  SlidersHorizontal, ChevronDown, MapPin,
  CalendarCheck, Star, CheckCircle2, ArrowRight, Crown,
  Zap, Bell, RefreshCw, QrCode, Gift, Target, CreditCard,
  Calendar, CheckCircle, Users, BadgeCheck, Wallet,
  Phone, Clock,
} from "lucide-react";
import API from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { salonPath } from "../utils/formatters";
import SalonCard from "../components/SalonCard";

// ── Landing section CSS ───────────────────────────────────────────
const LP_CSS = `
  @keyframes lp-shimmer{0%{background-position:200% center;}100%{background-position:-200% center;}}
  .lp-shimmer{background:linear-gradient(90deg,#6366f1,#8b5cf6,#a78bfa,#6366f1);background-size:300% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:lp-shimmer 5s linear infinite;}
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
  @media(max-width:639px){
    .lp-card:hover,.lp-step:hover,.lp-review:hover,.lp-benefit:hover,.lp-pain:hover{transform:none!important;box-shadow:none!important;}
    .lp-btn-p:hover,.lp-btn-s:hover{transform:none!important;}
    .home-hero-photo{
      mask-image:linear-gradient(to left,black 0%,black 55%,transparent 85%)!important;
      -webkit-mask-image:linear-gradient(to left,black 0%,black 55%,transparent 85%)!important;
    }
  }
  @media(max-width:479px){
    .home-hero-photo{
      mask-image:none!important;
      -webkit-mask-image:none!important;
      opacity:0.22!important;
    }
  }
`;
const LP_FEATURES = [
  { Icon: MapPin,     color: "#6366f1", title: "Salons Near You",       desc: "Instantly see 500+ verified salons within 5 km. Browse ratings, services, and prices — no sign-up needed." },
  { Icon: Zap,        color: "#8b5cf6", title: "Book in 30 Seconds",    desc: "Pick a service, choose your slot, confirm instantly. No phone calls, no back-and-forth, no waiting." },
  { Icon: Bell,       color: "#6366f1", title: "Smart Reminders",       desc: "Automatic reminders before your appointment so you never forget. Get notified about new offers too." },
  { Icon: Star,       color: "#8b5cf6", title: "Verified Reviews",      desc: "Genuine ratings from real customers. Always choose the best salon with full confidence." },
  { Icon: RefreshCw,  color: "#6366f1", title: "One-Click Rebooking",   desc: "Book your favourite service again in one tap — no need to search again. Your history is always saved." },
  { Icon: QrCode,     color: "#8b5cf6", title: "QR Booking",            desc: "Scan a salon's QR on their counter or WhatsApp status — land straight on their booking page instantly." },
  { Icon: Gift,       color: "#6366f1", title: "Exclusive Deals",       desc: "Access coupon codes, festival offers, and weekend deals. Save money while enjoying premium services." },
  { Icon: Target,     color: "#8b5cf6", title: "Personalised for You",  desc: "The app learns your preferences and suggests services based on your visit history." },
  { Icon: CreditCard, color: "#6366f1", title: "Flexible Payments",     desc: "Pay via UPI, card, or cash at the salon. Secure, smooth, and zero last-minute payment confusion." },
];
const LP_STEPS = [
  { n: "01", Icon: Search,       title: "Search & Discover", desc: "Browse salons near you or search by service, city, or rating. Filter by gender preference.", color: "#6366f1" },
  { n: "02", Icon: Calendar,     title: "Pick Your Slot",    desc: "Choose a service and time slot that works for you. See real-time availability instantly.",   color: "#8b5cf6" },
  { n: "03", Icon: CheckCircle,  title: "Confirmed & Done",  desc: "Get an instant confirmation notification. Show up and enjoy — zero hassle.",                 color: "#6366f1" },
];
const LP_PAIN_POINTS = [
  { Icon: Phone,      pain: "Endless phone calls",             fix: "Book instantly in the app — no calls, no hold music, no callbacks.",                       color: "#f87171" },
  { Icon: Clock,      pain: "Come back in 30 min",             fix: "See real-time slot availability before you even step outside.",                            color: "#fb923c" },
  { Icon: Users,      pain: "Long waits on arrival",           fix: "Pick your exact time slot. Walk in, sit down, get styled.",                               color: "#f87171" },
  { Icon: BadgeCheck, pain: "Don't know which salon is good",  fix: "100% verified ratings from real customers. No fake reviews.",                             color: "#fb923c" },
  { Icon: Bell,       pain: "Forgetting your appointment",     fix: "Auto reminders 24 hrs and 30 min before your booking. Never miss again.",                 color: "#f87171" },
  { Icon: CreditCard, pain: "Surprise pricing at the counter", fix: "Every price listed clearly upfront. Zero surprises at checkout.",                         color: "#fb923c" },
];
const LP_REVIEWS = [
  { name: "Ananya Sharma", city: "Mumbai",    rating: 5, text: "Found a great salon 500m from home in literally 10 seconds. Booked, confirmed, done. This app is magic." },
  { name: "Rohan Mehta",   city: "Bangalore", rating: 5, text: "No more awkward phone calls. I book my haircut every weekend through the app. Super smooth." },
  { name: "Divya Nair",    city: "Kochi",     rating: 5, text: "The stylist selection feature is brilliant. I always go to the same person and see her availability instantly." },
];
const LP_STATS = [
  { value: "500+", label: "Verified Salons", color: "#6366f1" },
  { value: "50K+", label: "Bookings Made",   color: "#8b5cf6" },
  { value: "4.9",  label: "Average Rating",  color: "#6366f1" },
  { value: "30s",  label: "Avg Booking Time",color: "#8b5cf6" },
];
const LP_BENEFITS = [
  { Icon: Zap,    color: "#6366f1", title: "Save Time",     headline: "Book in under 30 seconds.",  points: ["No phone calls or DMs","Real-time slot availability","Instant booking confirmation","One-tap rebooking for regulars"] },
  { Icon: Wallet, color: "#10b981", title: "Save Money",    headline: "Always the best price.",     points: ["Transparent upfront pricing","Exclusive app-only offers","Festival & weekend deals","No hidden charges ever"] },
  { Icon: Target, color: "#8b5cf6", title: "Total Control", headline: "Your schedule, your rules.", points: ["Choose your exact time slot","Auto reminders before visit","Easy reschedule or cancel","Full booking history always"] },
];

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
  const [showAllChips, setShowAllChips]       = useState(false);
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

  const heroOverlayLight = "linear-gradient(90deg,#f9fafb 0%,rgba(249,250,251,0.97) 32%,rgba(249,250,251,0.88) 65%,transparent 100%)";
  const heroOverlayDark  = "linear-gradient(90deg,rgba(10,15,30,0.97) 0%,rgba(10,15,30,0.92) 35%,rgba(10,15,30,0.75) 65%,transparent 100%)";
  const heroOverlay = isDark ? heroOverlayDark : heroOverlayLight;

  return (
    <div style={{ background:"var(--t-bg)", minHeight:"100vh", overflowX:"hidden", fontFamily:'"Plus Jakarta Sans", system-ui, sans-serif', WebkitTapHighlightColor:"transparent" }}>


      {/* ══════════════════════════════════════════════════════════
          HERO — full editorial, min 85vh
      ══════════════════════════════════════════════════════════ */}
      <section style={{
        position:"relative",
        minHeight:"clamp(480px,85vh,680px)",
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
            className="home-hero-photo"
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
          paddingTop:"calc(clamp(82px,6vh,100px) + env(safe-area-inset-top, 0px))",
          paddingBottom:"clamp(24px,6vh,100px)",
          paddingLeft:"clamp(16px,5vw,80px)",
          paddingRight:"clamp(16px,5vw,80px)",
        }}>
          <div style={{ maxWidth:"min(680px, 90%)" }}>

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
                {isLoggedIn ? `${getGreeting()}, ${userName}` : getGreeting()}
              </span>
            </div>

            {/* Headline */}
            <h1 style={{
              fontSize:"clamp(26px, 4.5vw, 96px)",
              fontWeight:900,
              lineHeight:1.0,
              letterSpacing:"-0.04em",
              color:"var(--t-hero-text)",
              margin:"0 0 10px",
            }}>
              Avoid Long Queue.<br />Save Time.
            </h1>
            <h1 style={{
              fontSize:"clamp(20px, 4.5vw, 72px)",
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
              marginBottom:32, lineHeight:1.6, maxWidth:"min(480px, 90%)",
            }}>
              Discover and book the best GlowSpot near you — verified, rated, and ready.
            </p>

            {/* Quick chips */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginBottom:28 }}>
              {(showAllChips ? HERO_CHIPS : HERO_CHIPS.slice(0, 3)).map(({ label, cat, Icon }) => {
                const active = selectedCats.includes(cat);
                return (
                  <button
                    key={label} onClick={() => handleCategory(cat)}
                    onMouseDown={e => { e.currentTarget.style.transform = "scale(0.95)"; }}
                    onMouseUp={e => { e.currentTarget.style.transform = active ? "scale(0.97)" : "scale(1)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = active ? "scale(0.97)" : "scale(1)"; }}
                    onTouchStart={e => { e.currentTarget.style.transform = "scale(0.95)"; }}
                    onTouchEnd={e => { e.currentTarget.style.transform = active ? "scale(0.97)" : "scale(1)"; }}
                    style={{
                      display:"flex", alignItems:"center", gap:8,
                      padding:"10px 20px", borderRadius:999,
                      fontSize:13, fontWeight:700, cursor:"pointer",
                      transition:"all 0.25s ease",
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
              {!showAllChips && HERO_CHIPS.length > 3 && (
                <button
                  onClick={() => setShowAllChips(true)}
                  onMouseDown={e => { e.currentTarget.style.transform = "scale(0.95)"; }}
                  onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
                  onTouchStart={e => { e.currentTarget.style.transform = "scale(0.95)"; }}
                  onTouchEnd={e => { e.currentTarget.style.transform = "scale(1)"; }}
                  style={{
                    display:"flex", alignItems:"center", gap:8,
                    padding:"10px 16px", borderRadius:999,
                    fontSize:13, fontWeight:700, cursor:"pointer",
                    transition:"all 0.25s ease",
                    background:"rgba(255,255,255,0.05)",
                    backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)",
                    border:"1px solid rgba(255,255,255,0.1)",
                    color:"var(--t-hero-text)",
                    boxShadow:"0 2px 16px rgba(0,0,0,0.08)",
                  }}
                >
                  +{HERO_CHIPS.length - 3} More
                </button>
              )}
              {showAllChips && (
                <button
                  onClick={() => setShowAllChips(false)}
                  onMouseDown={e => { e.currentTarget.style.transform = "scale(0.95)"; }}
                  onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
                  onTouchStart={e => { e.currentTarget.style.transform = "scale(0.95)"; }}
                  onTouchEnd={e => { e.currentTarget.style.transform = "scale(1)"; }}
                  style={{
                    display:"flex", alignItems:"center", gap:8,
                    padding:"10px 16px", borderRadius:999,
                    fontSize:13, fontWeight:700, cursor:"pointer",
                    transition:"all 0.25s ease",
                    background:"rgba(255,255,255,0.05)",
                    backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)",
                    border:"1px solid rgba(255,255,255,0.1)",
                    color:"var(--t-hero-text)",
                    boxShadow:"0 2px 16px rgba(0,0,0,0.08)",
                  }}
                >
                  Show Less
                </button>
              )}
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
        <div className="max-w-7xl mx-auto" style={{ padding:"8px clamp(12px,4vw,24px)" }}>
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

      {/* ══════════════════════════════════════════════════════════
          GUEST-ONLY: landing sections (stats, pain points, etc.)
      ══════════════════════════════════════════════════════════ */}
      {!isLoggedIn && <>
        <style>{LP_CSS}</style>

        {/* STATS */}
        <section style={{ borderTop:"1px solid var(--t-border)", borderBottom:"1px solid var(--t-border)", padding:"clamp(36px,5vh,56px) 20px" }}>
          <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
            {LP_STATS.map(({ value, label, color }) => (
              <div key={label} className="lp-step" style={{ background:"var(--t-card)", border:"1px solid var(--t-border)", borderRadius:20, padding:"22px 18px", textAlign:"center" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = color + "50"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--t-border)"; }}
              >
                <div style={{ fontSize:28, fontWeight:900, letterSpacing:"-1.5px", color, marginBottom:6 }}>{value}</div>
                <div style={{ fontSize:12, color:"var(--t-text-2)", fontWeight:600 }}>{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* PAIN POINTS */}
        <section style={{ background:"var(--t-bg-2)", borderTop:"1px solid var(--t-border)", padding:"clamp(56px,8vh,88px) 20px" }}>
          <div className="max-w-5xl mx-auto">
            <div style={{ textAlign:"center", marginBottom:52 }}>
              <div style={{ display:"inline-block", background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:99, padding:"4px 16px", fontSize:11, color:"#f87171", fontWeight:700, letterSpacing:1.5, marginBottom:16 }}>SOUND FAMILIAR?</div>
              <h2 style={{ fontSize:"clamp(1.6rem,4vw,2.8rem)", fontWeight:900, color:"var(--t-text)", letterSpacing:"-0.03em", marginBottom:12 }}>The old way of booking is broken</h2>
              <p style={{ color:"var(--t-text-2)", fontSize:15, maxWidth:440, margin:"0 auto", lineHeight:1.7 }}>You've been putting up with this for too long. There's a better way.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {LP_PAIN_POINTS.map(({ Icon, pain, fix, color }) => (
                <div key={pain} className="lp-pain" style={{ background:"var(--t-card)", border:"1px solid var(--t-border)", borderRadius:20, padding:"22px 20px" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = color + "40"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--t-border)"; }}
                >
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:color+"12", border:`1px solid ${color}25`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Icon size={16} color={color} />
                    </div>
                    <p style={{ fontSize:14, fontWeight:700, color }}>{pain}</p>
                  </div>
                  <div style={{ width:28, height:2, background:"linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius:99, marginBottom:10 }} />
                  <p style={{ fontSize:13.5, color:"var(--t-text-2)", lineHeight:1.7 }}>&#10003; {fix}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section style={{ padding:"clamp(56px,8vh,88px) 20px" }}>
          <div className="max-w-5xl mx-auto">
            <div style={{ textAlign:"center", marginBottom:52 }}>
              <div style={{ display:"inline-block", background:"rgba(99,102,241,0.08)", border:"1px solid rgba(99,102,241,0.22)", borderRadius:99, padding:"4px 16px", fontSize:11, color:"var(--t-accent)", fontWeight:700, letterSpacing:1.5, marginBottom:16 }}>HOW IT WORKS</div>
              <h2 style={{ fontSize:"clamp(1.6rem,4vw,2.8rem)", fontWeight:900, color:"var(--t-text)", letterSpacing:"-0.03em", marginBottom:12 }}>Book a salon in 3 steps</h2>
              <p style={{ color:"var(--t-text-2)", fontSize:15, lineHeight:1.7 }}>No calls, no waiting — just tap, pick, and confirm.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {LP_STEPS.map(({ n, Icon, title, desc, color }) => (
                <div key={n} className="lp-step" style={{ background:"var(--t-card)", border:"1px solid var(--t-border)", borderRadius:22, padding:"28px 24px", position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", top:14, right:18, fontSize:52, fontWeight:900, color:color+"0e", lineHeight:1, userSelect:"none", pointerEvents:"none" }}>{n}</div>
                  <div style={{ width:52, height:52, borderRadius:16, background:color+"15", border:`1px solid ${color}28`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
                    <Icon size={22} color={color} />
                  </div>
                  <h3 style={{ fontSize:16, fontWeight:700, color:"var(--t-text)", marginBottom:10 }}>{title}</h3>
                  <p style={{ fontSize:13.5, color:"var(--t-text-2)", lineHeight:1.75 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section style={{ background:"var(--t-bg-2)", borderTop:"1px solid var(--t-border)", borderBottom:"1px solid var(--t-border)", padding:"clamp(56px,8vh,88px) 20px" }}>
          <div className="max-w-6xl mx-auto">
            <div style={{ textAlign:"center", marginBottom:52 }}>
              <div style={{ display:"inline-block", background:"rgba(139,92,246,0.08)", border:"1px solid rgba(139,92,246,0.22)", borderRadius:99, padding:"4px 16px", fontSize:11, color:"#a78bfa", fontWeight:700, letterSpacing:1.5, marginBottom:16 }}>FEATURES</div>
              <h2 style={{ fontSize:"clamp(1.6rem,4vw,2.8rem)", fontWeight:900, color:"var(--t-text)", letterSpacing:"-0.03em", marginBottom:12 }}>Everything you need to look great</h2>
              <p style={{ color:"var(--t-text-2)", fontSize:15, maxWidth:440, margin:"0 auto", lineHeight:1.7 }}>One app for discovering, booking, and managing all your salon visits.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {LP_FEATURES.map(({ Icon, color, title, desc }) => (
                <div key={title} className="lp-card" style={{ background:"var(--t-card)", border:"1px solid var(--t-border)", borderRadius:22, padding:"26px 22px", cursor:"default" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = color+"40"; e.currentTarget.style.boxShadow = `0 16px 40px ${color}15`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--t-border)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div style={{ width:50, height:50, borderRadius:15, background:color+"12", border:`1px solid ${color}25`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:18 }}>
                    <Icon size={22} color={color} />
                  </div>
                  <h3 style={{ fontSize:16, fontWeight:700, color:"var(--t-text)", marginBottom:8 }}>{title}</h3>
                  <p style={{ fontSize:13.5, color:"var(--t-text-2)", lineHeight:1.75 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BENEFITS */}
        <section style={{ padding:"clamp(56px,8vh,88px) 20px" }}>
          <div className="max-w-5xl mx-auto">
            <div style={{ textAlign:"center", marginBottom:52 }}>
              <div style={{ display:"inline-block", background:"rgba(99,102,241,0.08)", border:"1px solid rgba(99,102,241,0.22)", borderRadius:99, padding:"4px 16px", fontSize:11, color:"var(--t-accent)", fontWeight:700, letterSpacing:1.5, marginBottom:16 }}>WHY CUSTOMERS LOVE IT</div>
              <h2 style={{ fontSize:"clamp(1.6rem,4vw,2.8rem)", fontWeight:900, color:"var(--t-text)", letterSpacing:"-0.03em", marginBottom:12 }}>Three things you get. Every time.</h2>
              <p style={{ color:"var(--t-text-2)", fontSize:15, maxWidth:400, margin:"0 auto", lineHeight:1.7 }}>Not a promise — a guarantee built into every booking.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {LP_BENEFITS.map(({ Icon, color, title, headline, points }) => (
                <div key={title} className="lp-benefit" style={{ background:"var(--t-card)", border:"1px solid var(--t-border)", borderRadius:24, padding:"30px 26px" }}>
                  <div style={{ width:54, height:54, borderRadius:18, background:color+"14", border:`1px solid ${color}28`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
                    <Icon size={24} color={color} />
                  </div>
                  <p style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", color, marginBottom:8 }}>{title}</p>
                  <h3 style={{ fontSize:18, fontWeight:800, color:"var(--t-text)", marginBottom:18, letterSpacing:"-0.3px" }}>{headline}</h3>
                  <ul style={{ listStyle:"none", padding:0, margin:0, display:"flex", flexDirection:"column", gap:10 }}>
                    {points.map(p => (
                      <li key={p} style={{ display:"flex", alignItems:"flex-start", gap:9, fontSize:13.5, color:"var(--t-text-2)", lineHeight:1.5 }}>
                        <span style={{ color, fontWeight:700, flexShrink:0, marginTop:1 }}>&#10003;</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* REVIEWS */}
        <section style={{ padding:"clamp(56px,8vh,88px) 20px" }}>
          <div className="max-w-5xl mx-auto">
            <div style={{ textAlign:"center", marginBottom:48 }}>
              <div style={{ display:"inline-block", background:"rgba(99,102,241,0.08)", border:"1px solid rgba(99,102,241,0.22)", borderRadius:99, padding:"4px 16px", fontSize:11, color:"var(--t-accent)", fontWeight:700, letterSpacing:1.5, marginBottom:16 }}>REVIEWS</div>
              <h2 style={{ fontSize:"clamp(1.6rem,4vw,2.8rem)", fontWeight:900, color:"var(--t-text)", letterSpacing:"-1px", marginBottom:10 }}>Loved by customers across India</h2>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                <div style={{ display:"flex", gap:2 }}>{[1,2,3,4,5].map(i => <Star key={i} size={14} color="#f59e0b" fill="#f59e0b" />)}</div>
                <span style={{ color:"var(--t-text-2)", fontSize:14, fontWeight:600 }}>4.9 / 5 · 1,000+ reviews</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {LP_REVIEWS.map(({ name, city, rating, text }) => (
                <div key={name} className="lp-review" style={{ background:"var(--t-card)", border:"1px solid var(--t-border)", borderRadius:20, padding:"22px 20px" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.35)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--t-border)"; }}
                >
                  <div style={{ display:"flex", gap:2, marginBottom:14 }}>
                    {Array.from({ length: rating }).map((_, i) => <Star key={i} size={13} color="#f59e0b" fill="#f59e0b" />)}
                  </div>
                  <p style={{ fontSize:13.5, color:"var(--t-text-2)", lineHeight:1.75, marginBottom:18, fontStyle:"italic" }}>"{text}"</p>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:"#fff", flexShrink:0 }}>{name[0]}</div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:"var(--t-text)" }}>{name}</div>
                      <div style={{ fontSize:11, color:"var(--t-text-3)" }}>{city}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section style={{ position:"relative", overflow:"hidden", borderTop:"1px solid var(--t-border)", padding:"clamp(64px,9vh,96px) 20px" }}>
          <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 70% 70% at 50% 50%,rgba(99,102,241,0.08) 0%,transparent 70%)", pointerEvents:"none" }} />
          <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:"60%", height:1, background:"linear-gradient(90deg,transparent,rgba(99,102,241,0.4),transparent)", pointerEvents:"none" }} />
          <div className="max-w-2xl mx-auto text-center" style={{ position:"relative", zIndex:1 }}>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:18 }}>
              <div style={{ width:64, height:64, borderRadius:20, background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Scissors size={28} color="#6366f1" />
              </div>
            </div>
            <h2 style={{ fontSize:"clamp(1.6rem,4.5vw,3rem)", fontWeight:900, color:"var(--t-text)", letterSpacing:"-1.2px", marginBottom:14, lineHeight:1.15 }}>
              Avoid Long Queue.<br />Save time.<br /><span className="lp-shimmer">Look amazing.</span>
            </h2>
            <p style={{ color:"var(--t-text-2)", fontSize:15.5, lineHeight:1.75, maxWidth:440, margin:"0 auto 36px" }}>
              Join 50,000+ customers who stopped calling salons and started booking smarter — instantly, for free.
            </p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:12, justifyContent:"center" }}>
              <a href="/register" className="lp-btn-p" style={{ display:"inline-flex", alignItems:"center", gap:10, padding:"15px 34px", borderRadius:16, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", boxShadow:"0 0 52px rgba(99,102,241,0.45)", fontSize:15, fontWeight:700, textDecoration:"none", minHeight:52 }}>
                <Zap size={16} /> Create Free Account
              </a>
              <a href="/login" className="lp-btn-s" style={{ display:"inline-flex", alignItems:"center", gap:10, padding:"15px 34px", borderRadius:16, background:"var(--t-card)", border:"1px solid var(--t-border)", color:"var(--t-text-2)", fontSize:15, fontWeight:600, textDecoration:"none", minHeight:52 }}>
                Sign In <ArrowRight size={15} />
              </a>
            </div>
            <p style={{ fontSize:12, color:"var(--t-text-3)", marginTop:18 }}>Free to use &nbsp;·&nbsp; No hidden charges &nbsp;·&nbsp; Book in seconds</p>
          </div>
        </section>
      </>}

    </div>
  );
}
