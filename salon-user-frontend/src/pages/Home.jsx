import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import SalonDetails from "./SalonDetails";
import {
  LocateFixed, Search, X, SearchX,
  Scissors, Sparkles, Droplets, User, Leaf,
  MapPin,
  Star, CheckCircle2, ArrowRight, Crown,
  Zap, Bell, RefreshCw, QrCode, Gift, Target, CreditCard,
  Calendar, CheckCircle, Users, BadgeCheck, Wallet,
  Phone, Clock, Wind, Baby, Home as HomeIcon, Brush,
  ChevronDown, ChevronUp, ShoppingBag,
} from "lucide-react";
import API from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { salonPath } from "../utils/formatters";
import { isCustomer } from "../utils/auth";
import SalonCard from "../components/SalonCard";

// ── Service image helpers (owner photo → category fallback → null) ──
const _nameHash = (str = '') => { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; };
const SVC_CAT_IMAGES = {
  'Hair Services':             ['https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=80&h=80&fit=crop&q=70','https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=80&h=80&fit=crop&q=70','https://images.unsplash.com/photo-1562322140-8baeececf3df?w=80&h=80&fit=crop&q=70'],
  'Hair Services (Men)':       ['https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=80&h=80&fit=crop&q=70','https://images.unsplash.com/photo-1599351431613-18ef1fdd27e5?w=80&h=80&fit=crop&q=70'],
  'Hair Services (Women)':     ['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=80&h=80&fit=crop&q=70','https://images.unsplash.com/photo-1562322140-8baeececf3df?w=80&h=80&fit=crop&q=70'],
  'Beard & Grooming':          ['https://images.unsplash.com/photo-1599351431613-18ef1fdd27e5?w=80&h=80&fit=crop&q=70','https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=80&h=80&fit=crop&q=70'],
  'Nail Services':             'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=80&h=80&fit=crop&q=70',
  'Skin & Face / Beauty':      ['https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=80&h=80&fit=crop&q=70','https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=80&h=80&fit=crop&q=70'],
  'Skin & Face (Men Grooming)':'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=80&h=80&fit=crop&q=70',
  'Skin & Beauty':             'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=80&h=80&fit=crop&q=70',
  'Face & Skin':               'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=80&h=80&fit=crop&q=70',
  'Skin & Face':               'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=80&h=80&fit=crop&q=70',
  'Spa & Massage':             ['https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=80&h=80&fit=crop&q=70','https://images.unsplash.com/photo-1498842812179-c81beecf902c?w=80&h=80&fit=crop&q=70'],
  'Spa & Relaxation':          'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=80&h=80&fit=crop&q=70',
  'Body Grooming':             'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=80&h=80&fit=crop&q=70',
  'Bridal & Events':           'https://images.unsplash.com/photo-1519741497674-611481863552?w=80&h=80&fit=crop&q=70',
  'Men Dermatology':           'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=80&h=80&fit=crop&q=70',
  'Women Dermatology':         'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=80&h=80&fit=crop&q=70',
  'Kids Services':             'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=80&h=80&fit=crop&q=70',
  'At-Home Services':          'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=80&h=80&fit=crop&q=70',
  'Makeup Services':           'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=80&h=80&fit=crop&q=70',
  'Hairstyling':               'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=80&h=80&fit=crop&q=70',
};
const getServiceImage = (svc) => {
  if (svc.photos?.[0]) return svc.photos[0];
  const entry = SVC_CAT_IMAGES[svc.category];
  if (!entry) return null;
  if (typeof entry === 'string') return entry;
  return entry[_nameHash(svc.name) % entry.length];
};

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
  { key: "Hair Services",        label: "Hair",    Icon: Scissors  },
  { key: "Beard & Grooming",     label: "Beard",   Icon: User      },
  { key: "Nail Services",        label: "Nails",   Icon: Brush     },
  { key: "Skin & Face / Beauty", label: "Skin",    Icon: Leaf      },
  { key: "Spa & Massage",        label: "Spa",     Icon: Droplets  },
  { key: "Body Grooming",        label: "Body",    Icon: Wind      },
  { key: "Bridal & Events",      label: "Bridal",  Icon: Crown     },
  { key: "Kids Services",        label: "Kids",    Icon: Baby      },
  { key: "At-Home Services",     label: "At-Home", Icon: HomeIcon  },
];
const CATEGORY_ALIASES = {
  "Hair Services":        ["Hair Services","Hair Services (Men)","Hair Services (Women)"],
  "Skin & Face / Beauty": ["Skin & Face / Beauty","Skin & Face (Men Grooming)","Skin & Beauty"],
  "Spa & Massage":        ["Spa & Massage","Spa & Relaxation"],
};
const SORT_OPTIONS = [
  { key: "nearby", label: "Nearest"  },
  { key: "rated",  label: "Top Rated"},
  { key: "booked", label: "Trending" },
];
const HERO_CHIPS = [
  { label: "All",            cat: null,                   Icon: Sparkles  },
  { label: "Salon",          cat: "Hair Services",        Icon: Scissors  },
  { label: "Barbershop",     cat: "Beard & Grooming",     Icon: User      },
  { label: "Spa & Wellness", cat: "Spa & Massage",        Icon: Droplets  },
  { label: "Makeup & Bridal",cat: "Bridal & Events",      Icon: Sparkles  },
  { label: "Skin & Derma",   cat: "Skin & Face / Beauty", Icon: Leaf      },
  { label: "Kids",           cat: "Kids Services",        Icon: Baby      },
  { label: "At-Home",        cat: "At-Home Services",     Icon: HomeIcon  },
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
      gap: compact ? 10 : 12, padding: compact ? "0 14px" : "0 18px",
      height: compact ? 44 : "clamp(48px,8vw,58px)", borderRadius: 999,
      background: focused ? "var(--t-card)" : "var(--t-input-bg)",
      border: focused ? "1.5px solid rgba(99,102,241,0.65)" : "1.5px solid var(--t-border)",
      boxShadow: focused
        ? "0 0 0 4px rgba(99,102,241,0.12),0 8px 40px rgba(99,102,241,0.16)"
        : compact ? "none" : "0 4px 24px rgba(15,23,42,0.10), 0 1px 4px rgba(15,23,42,0.06)",
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

// ── (EditorialCard removed — using SalonCard grid) ───────────────
function _EditorialCard({ salon }) {
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

function _EditorialSkeleton() {
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

// ── Home Salon Service Card ───────────────────────────────────────
function calcKm(userCoords, salon) {
  if (!userCoords || !salon.location?.coordinates) return null;
  const [lng, lat] = salon.location.coordinates;
  const R = 6371;
  const dLat = (lat - userCoords.lat) * Math.PI / 180;
  const dLng = (lng - userCoords.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(userCoords.lat*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.sin(dLng/2)**2;
  const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return d < 1 ? `${Math.round(d*1000)} m` : `${d.toFixed(1)} km`;
}

function HomeSalonServiceCard({ salon, selectedCats, selectedServiceCat, cart, onAdd, onRemove, userCoords, onSalonOpen }) {
  const [services, setServices]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState(true);

  useEffect(() => {
    API.get(`/public/salons/${salon._id}/services`)
      .then(r => {
        const all = r.data.data?.services || r.data.data || [];
        const aliases = selectedCats.flatMap(cat => CATEGORY_ALIASES[cat] || [cat]);
        const filtered = selectedServiceCat
          ? all.filter(s => s.category === selectedServiceCat)
          : all.filter(s => aliases.includes(s.category));
        setServices(filtered);
      })
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, [salon._id, selectedServiceCat]); // eslint-disable-line react-hooks/exhaustive-deps

  const km = useMemo(() => calcKm(userCoords, salon), [userCoords, salon._id]); // eslint-disable-line react-hooks/exhaustive-deps
  const minPrice = useMemo(() => {
    const prices = services.map(s => s.basePrice || s.price || 0).filter(p => p > 0);
    return prices.length > 0 ? Math.min(...prices) : 0;
  }, [services]);

  const photo = salon.photos?.[0] || salon.coverPhoto || salon.image || null;
  const cartForThisSalon = cart.salon?._id === salon._id ? cart.serviceMap : {};

  return (
    <div style={{ borderRadius:16, background:"var(--t-card)", border:"1px solid var(--t-border)", overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>

      {/* Category header — cover image + salon name + distance */}
      <div style={{ position:"relative", overflow:"hidden" }}>
        {photo && (
          <div style={{ height:88, overflow:"hidden", position:"relative" }}>
            <img src={photo} alt={salon.name} style={{ width:"100%", height:"100%", objectFit:"cover", filter:"brightness(0.45)" }} />
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(to right,rgba(10,10,30,0.75) 0%,rgba(10,10,30,0.2) 100%)" }} />
          </div>
        )}
        <div style={{
          position: photo ? "absolute" : "relative",
          top:0, left:0, right:0, bottom:0,
          display:"flex", alignItems:"center", gap:12,
          padding:"12px 14px",
          background: photo ? "transparent" : "var(--t-input-bg)",
        }}>
          <div onClick={() => onSalonOpen(salon._id)} style={{ display:"flex", alignItems:"center", gap:12, flex:1, minWidth:0, textDecoration:"none", cursor:"pointer" }}>
            {/* Salon avatar */}
            <div style={{ width:46, height:46, borderRadius:10, flexShrink:0, overflow:"hidden", border:"2px solid rgba(255,255,255,0.25)", background:"linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
              {photo
                ? <img src={photo} alt={salon.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <span style={{ fontSize:18, fontWeight:800, color:"#fff" }}>{salon.name?.[0] || "S"}</span>
                  </div>
              }
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:15, fontWeight:800, color:photo?"#fff":"var(--t-text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{salon.name}</div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:2 }}>
                {km && <span style={{ fontSize:11, fontWeight:600, color:photo?"rgba(255,255,255,0.7)":"var(--t-text-3)" }}>{km} away</span>}
                {!loading && services.length > 0 && minPrice > 0 && (
                  <span style={{ fontSize:11, fontWeight:700, color:photo?"rgba(255,255,255,0.85)":"var(--t-accent)" }}>from ₹{minPrice}+</span>
                )}
              </div>
            </div>
          </div>
          {!loading && services.length > 0 && (
            <button onClick={() => setExpanded(p => !p)} style={{
              background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.2)",
              borderRadius:8, padding:"5px 10px", cursor:"pointer", flexShrink:0,
              display:"flex", alignItems:"center", gap:4,
              color:photo?"rgba(255,255,255,0.9)":"var(--t-text-3)", fontSize:11, fontWeight:700,
            }}>
              {expanded ? <><span>Hide</span><ChevronUp size={12} /></> : <><span>Show</span><ChevronDown size={12} /></>}
            </button>
          )}
        </div>
        {/* Service count badge */}
        {!loading && services.length > 0 && (
          <div style={{
            position:"absolute", top:10, right: expanded ? 90 : 90,
            fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.75)",
            background:"rgba(0,0,0,0.3)", borderRadius:6, padding:"2px 7px",
          }}>
            {services.length} service{services.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div style={{ padding:"12px 14px", display:"flex", flexDirection:"column", gap:8 }}>
          {[1,2].map(i => <div key={i} className="skeleton" style={{ height:72, borderRadius:10 }} />)}
        </div>
      )}

      {/* No services */}
      {!loading && services.length === 0 && (
        <div style={{ padding:"14px 16px" }}>
          <p style={{ fontSize:13, color:"var(--t-text-3)" }}>No services listed for this category.</p>
        </div>
      )}

      {/* Service rows */}
      {!loading && expanded && services.length > 0 && (
        <div>
          {services.map((svc, idx) => {
            const added = !!cartForThisSalon[svc._id];
            const price = svc.basePrice || svc.price || 0;
            const af = svc.applicableFor || [];
            const gender = af.includes("male") && !af.includes("female") ? "Men"
              : af.includes("female") && !af.includes("male") ? "Women" : null;
            const isQuick = svc.duration && svc.duration <= 20;

            return (
              <div key={svc._id} style={{
                display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
                borderTop:"1px solid var(--t-border)",
                background: added ? "rgba(99,102,241,0.05)" : "transparent",
              }}>
                {/* Service image / placeholder */}
                <div style={{ width:76, height:76, borderRadius:10, flexShrink:0, overflow:"hidden", background:"var(--t-input-bg)", border:"1px solid var(--t-border)" }}>
                  {getServiceImage(svc)
                    ? <img src={getServiceImage(svc)} alt={svc.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.12))" }}>
                        <Scissors style={{ width:22, height:22, color:"var(--t-accent)", opacity:0.45 }} />
                      </div>
                  }
                </div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"var(--t-text)", marginBottom:4 }}>{svc.name}</div>
                  {isQuick && (
                    <div style={{ display:"inline-flex", alignItems:"center", gap:3, background:"rgba(251,191,36,0.12)", border:"1px solid rgba(251,191,36,0.35)", borderRadius:6, padding:"2px 7px", marginBottom:4 }}>
                      <Zap style={{ width:10, height:10, color:"#fbbf24", fill:"#fbbf24" }} />
                      <span style={{ fontSize:10, fontWeight:800, color:"#fbbf24", letterSpacing:"0.05em" }}>QUICK</span>
                    </div>
                  )}
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    {svc.duration > 0 && (
                      <span style={{ fontSize:11, color:"var(--t-text-3)", display:"flex", alignItems:"center", gap:3 }}>
                        <Clock style={{ width:10, height:10 }} />{svc.duration} min
                      </span>
                    )}
                    {gender && (
                      <span style={{ fontSize:11, color:"var(--t-text-3)", display:"flex", alignItems:"center", gap:3 }}>
                        <User style={{ width:10, height:10 }} />{gender}
                      </span>
                    )}
                  </div>
                  {price > 0 && (
                    <div style={{ fontSize:14, fontWeight:800, color:"var(--t-text)", marginTop:4 }}>₹{price}</div>
                  )}
                </div>

                {/* ADD / ADDED button */}
                <button
                  onClick={() => added ? onRemove(salon, svc) : onAdd(salon, svc)}
                  style={{
                    flexShrink:0, minWidth:64, padding:"8px 14px", borderRadius:8, fontWeight:800, fontSize:13, cursor:"pointer", transition:"all 0.15s ease",
                    background: added ? "rgba(99,102,241,0.15)" : "transparent",
                    border: added ? "1.5px solid rgba(99,102,241,0.4)" : "1.5px solid var(--t-accent)",
                    color: "var(--t-accent)",
                  }}
                >{added ? "ADDED" : "+ ADD"}</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Quick Book Sheet ──────────────────────────────────────────────
const _qbLocalDate = (offset = 0) => {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const _qbTodayStr = _qbLocalDate(0);
const _qbDays = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const _qbMonths = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function QuickBookSheet({ salon, selectedServiceCat, preSelectedServices = [], onClose }) {
  const navigate = useNavigate();
  const [services, setServices]       = useState([]);
  const [loadingSvcs, setLoadingSvcs] = useState(true);
  const [selectedSvcs, setSelectedSvcs] = useState(preSelectedServices);
  const [step, setStep]               = useState(preSelectedServices.length > 0 ? "booking" : "services");
  const [bookDate, setBookDate]       = useState(_qbTodayStr);
  const [slot, setSlot]               = useState("");
  const [slots, setSlots]             = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [closedDay, setClosedDay]     = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookError, setBookError]     = useState("");

  const totalDuration = selectedSvcs.reduce((s, x) => s + (x.duration || 30), 0);
  const totalPrice    = selectedSvcs.reduce((s, x) => s + (x.basePrice || x.price || 0), 0);

  useEffect(() => {
    setLoadingSvcs(true);
    API.get(`/public/salons/${salon._id}/services`)
      .then(r => {
        const all = r.data.data?.services || r.data.data || [];
        setServices(selectedServiceCat ? all.filter(s => s.category === selectedServiceCat) : all);
      })
      .catch(() => setServices([]))
      .finally(() => setLoadingSvcs(false));
  }, [salon._id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step !== "booking" || selectedSvcs.length === 0) return;
    setSlotsLoading(true); setSlot("");
    API.get(`/public/salons/${salon._id}/booked-slots?date=${bookDate}&duration=${Math.max(totalDuration, 30)}`)
      .then(r => {
        const data = r.data.data || {};
        setSlots(data.slots || []); setBlockedSlots(data.blockedSlots || []); setClosedDay(data.closedDay || false);
      })
      .catch(() => { setSlots([]); setBlockedSlots([]); })
      .finally(() => setSlotsLoading(false));
  }, [bookDate, step, totalDuration]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSvc = (svc) => setSelectedSvcs(prev =>
    prev.find(s => s._id === svc._id) ? prev.filter(s => s._id !== svc._id) : [...prev, svc]
  );

  const isPast = (s) => {
    if (bookDate !== _qbTodayStr) return false;
    const [h, m] = s.split(":").map(Number);
    const now = new Date();
    return h * 60 + m <= now.getHours() * 60 + now.getMinutes();
  };

  const handleContinue = () => {
    if (!isCustomer()) { navigate("/login", { state: { from: "/" } }); return; }
    setStep("booking");
  };

  const handleConfirm = async () => {
    if (!slot) { setBookError("Please select a time slot."); return; }
    setBookError(""); setBookingLoading(true);
    try {
      await API.post("/customer/bookings", {
        salonId: salon._id, serviceIds: selectedSvcs.map(s => s._id),
        appointmentDate: bookDate, appointmentTime: slot, paymentMethod: "cash",
      });
      setBookingSuccess(true);
    } catch (err) {
      setBookError(err.response?.data?.message || "Booking failed. Please try again.");
    } finally { setBookingLoading(false); }
  };

  const dateDays = Array.from({ length: 7 }, (_, i) => _qbLocalDate(i));
  const fmtDay = (ds) => {
    const d = new Date(ds + "T12:00:00");
    return { day: _qbDays[d.getDay()], date: d.getDate(), month: _qbMonths[d.getMonth()] };
  };
  const photo = salon.photos?.[0] || salon.coverPhoto || salon.image || null;

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:1000, backdropFilter:"blur(4px)", WebkitBackdropFilter:"blur(4px)" }} />
      <div style={{
        position:"fixed", bottom:0, left:0, right:0, zIndex:1001,
        maxHeight:"90vh", display:"flex", flexDirection:"column",
        background:"var(--t-card)", borderRadius:"24px 24px 0 0",
        boxShadow:"0 -8px 48px rgba(0,0,0,0.25)",
      }}>
        {/* Handle */}
        <div style={{ display:"flex", justifyContent:"center", paddingTop:12, paddingBottom:4, flexShrink:0 }}>
          <div style={{ width:40, height:4, borderRadius:999, background:"var(--t-border)" }} />
        </div>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 20px 14px", flexShrink:0, borderBottom:"1px solid var(--t-border)" }}>
          <div style={{ width:46, height:46, borderRadius:"50%", flexShrink:0, overflow:"hidden", border:"2px solid var(--t-border)", background:"linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
            {photo
              ? <img src={photo} alt={salon.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontSize:18, fontWeight:800, color:"#fff" }}>{salon.name?.[0] || "S"}</span>
                </div>
            }
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:800, color:"var(--t-text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{salon.name}</div>
            {selectedServiceCat && <div style={{ fontSize:12, color:"var(--t-accent)", fontWeight:600, marginTop:1 }}>{selectedServiceCat}</div>}
          </div>
          <Link to={salonPath(salon)} style={{ fontSize:11, color:"var(--t-text-3)", fontWeight:600, textDecoration:"none", flexShrink:0, marginRight:8 }} onClick={e => e.stopPropagation()}>Full page ›</Link>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t-text-3)", fontSize:22, lineHeight:1, padding:4, flexShrink:0 }}>×</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch" }}>
          {!bookingSuccess && step === "services" && (
            <div style={{ padding:"14px 16px 20px" }}>
              {loadingSvcs ? (
                <div style={{ display:"flex", flexDirection:"column", gap:10, padding:"8px 0" }}>
                  {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:68, borderRadius:12 }} />)}
                </div>
              ) : services.length === 0 ? (
                <p style={{ textAlign:"center", color:"var(--t-text-3)", padding:"32px 0", fontSize:14 }}>No services listed for this category.</p>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {services.map(svc => {
                    const sel = !!selectedSvcs.find(s => s._id === svc._id);
                    return (
                      <div key={svc._id} onClick={() => toggleSvc(svc)} style={{
                        display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:12,
                        background: sel ? "rgba(99,102,241,0.08)" : "var(--t-input-bg)",
                        border: sel ? "1.5px solid rgba(99,102,241,0.4)" : "1.5px solid var(--t-border)",
                        cursor:"pointer", transition:"all 0.15s ease",
                      }}>
                        <div style={{
                          width:22, height:22, borderRadius:6, flexShrink:0,
                          background: sel ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "transparent",
                          border: sel ? "none" : "2px solid var(--t-border)",
                          display:"flex", alignItems:"center", justifyContent:"center",
                        }}>
                          {sel && <span style={{ color:"#fff", fontSize:13, lineHeight:1 }}>✓</span>}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:14, fontWeight:700, color:"var(--t-text)" }}>{svc.name}</div>
                          <div style={{ fontSize:12, color:"var(--t-text-3)", marginTop:2 }}>
                            {svc.duration ? `${svc.duration} min` : ""}
                            {svc.duration && (svc.basePrice || svc.price) ? " · " : ""}
                            {(svc.basePrice || svc.price) ? `₹${svc.basePrice || svc.price}` : ""}
                          </div>
                        </div>
                        {(svc.basePrice || svc.price) && (
                          <span style={{ fontSize:14, fontWeight:800, color:"var(--t-accent)", flexShrink:0 }}>₹{svc.basePrice || svc.price}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!bookingSuccess && step === "booking" && (
            <div style={{ padding:"14px 16px 20px" }}>
              {/* Selected summary */}
              <div style={{ marginBottom:16 }}>
                <p style={{ fontSize:11, fontWeight:700, color:"var(--t-text-3)", marginBottom:7, textTransform:"uppercase", letterSpacing:"0.1em" }}>Selected</p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {selectedSvcs.map(s => (
                    <span key={s._id} style={{ fontSize:12, fontWeight:600, padding:"4px 10px", borderRadius:999, background:"rgba(99,102,241,0.1)", color:"var(--t-accent)", border:"1px solid rgba(99,102,241,0.2)" }}>{s.name}</span>
                  ))}
                </div>
              </div>

              {/* Date picker */}
              <p style={{ fontSize:11, fontWeight:700, color:"var(--t-text-3)", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.1em" }}>Select Date</p>
              <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4, marginBottom:16, scrollbarWidth:"none" }}>
                {dateDays.map(d => {
                  const { day, date, month } = fmtDay(d);
                  const active = bookDate === d;
                  return (
                    <button key={d} onClick={() => setBookDate(d)} style={{
                      flexShrink:0, padding:"10px 14px", borderRadius:12, minWidth:56,
                      background: active ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "var(--t-input-bg)",
                      border: active ? "none" : "1px solid var(--t-border)", cursor:"pointer", textAlign:"center",
                    }}>
                      <div style={{ fontSize:11, fontWeight:600, color: active ? "rgba(255,255,255,0.8)" : "var(--t-text-3)" }}>{day}</div>
                      <div style={{ fontSize:18, fontWeight:800, color: active ? "#fff" : "var(--t-text)", lineHeight:1.1, margin:"3px 0 1px" }}>{date}</div>
                      <div style={{ fontSize:10, color: active ? "rgba(255,255,255,0.7)" : "var(--t-text-3)" }}>{month}</div>
                    </button>
                  );
                })}
              </div>

              {/* Slot picker */}
              <p style={{ fontSize:11, fontWeight:700, color:"var(--t-text-3)", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.1em" }}>Select Time</p>
              {slotsLoading ? (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
                  {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="skeleton" style={{ height:40, borderRadius:8 }} />)}
                </div>
              ) : closedDay ? (
                <p style={{ color:"var(--t-text-3)", fontSize:13 }}>Closed on this day.</p>
              ) : slots.length === 0 ? (
                <p style={{ color:"var(--t-text-3)", fontSize:13 }}>No available slots for this date.</p>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
                  {slots.map(s => {
                    const blocked = blockedSlots.includes(s);
                    const past = isPast(s);
                    const active = slot === s;
                    const disabled = blocked || past;
                    return (
                      <button key={s} disabled={disabled} onClick={() => !disabled && setSlot(s)} style={{
                        padding:"10px 4px", borderRadius:8, fontSize:12, fontWeight:700,
                        background: active ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "var(--t-input-bg)",
                        border: active ? "none" : "1px solid var(--t-border)",
                        color: active ? "#fff" : disabled ? "var(--t-text-3)" : "var(--t-text)",
                        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1,
                      }}>{s}</button>
                    );
                  })}
                </div>
              )}

              {bookError && <p style={{ color:"#f87171", fontSize:13, marginTop:10 }}>{bookError}</p>}
            </div>
          )}

          {bookingSuccess && (
            <div style={{ padding:"40px 20px", textAlign:"center" }}>
              <div style={{ width:64, height:64, borderRadius:"50%", background:"rgba(16,185,129,0.12)", border:"2px solid rgba(16,185,129,0.3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                <CheckCircle2 style={{ width:30, height:30, color:"#10b981" }} />
              </div>
              <h3 style={{ fontSize:20, fontWeight:800, color:"var(--t-text)", marginBottom:8 }}>Booking Confirmed!</h3>
              <p style={{ fontSize:13, color:"var(--t-text-2)", lineHeight:1.7, marginBottom:24 }}>
                {selectedSvcs.map(s => s.name).join(" + ")}<br />at {salon.name}<br />{bookDate} · {slot}
              </p>
              <button onClick={onClose} style={{ padding:"13px 32px", borderRadius:12, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", cursor:"pointer", color:"#fff", fontWeight:700, fontSize:14 }}>Done</button>
            </div>
          )}
        </div>

        {/* Footer action */}
        {!bookingSuccess && (
          <div style={{ flexShrink:0, background:"var(--t-card)", borderTop:"1px solid var(--t-border)", padding:"12px 16px", display:"flex", gap:10, alignItems:"center" }}>
            {step === "booking" && (
              <button onClick={() => setStep("services")} style={{ padding:"13px 18px", borderRadius:12, background:"var(--t-input-bg)", border:"1px solid var(--t-border)", cursor:"pointer", color:"var(--t-text)", fontWeight:700, fontSize:13, flexShrink:0 }}>Back</button>
            )}
            <button
              onClick={step === "services" ? handleContinue : handleConfirm}
              disabled={selectedSvcs.length === 0 || bookingLoading}
              style={{
                flex:1, padding:"14px 20px", borderRadius:12, border:"none",
                background: selectedSvcs.length === 0 ? "var(--t-input-bg)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: selectedSvcs.length === 0 ? "var(--t-text-3)" : "#fff",
                fontWeight:800, fontSize:14,
                cursor: selectedSvcs.length === 0 || bookingLoading ? "not-allowed" : "pointer",
              }}
            >
              {bookingLoading ? "Booking…" : step === "services"
                ? selectedSvcs.length === 0 ? "Select a service" : `Continue · ₹${totalPrice}`
                : `Confirm Booking${slot ? ` at ${slot}` : ""}`}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────
export default function Home() {
  const isLoggedIn = !!localStorage.getItem("customerToken");
  useTheme();
  const navigate = useNavigate();
  const [userName, setUserName] = useState(() => getUserName());
  const [quickBookSalon, setQuickBookSalon] = useState(null);
  const [quickBookCat, setQuickBookCat]     = useState(null);
  const [overlaySalonId, setOverlaySalonId] = useState(null);
  const [cart, setCart] = useState(() => { try { return JSON.parse(sessionStorage.getItem("home_cart") || "null") || { salon: null, serviceMap: {} }; } catch { return { salon: null, serviceMap: {} }; } });
  const cartServices = useMemo(() => Object.values(cart.serviceMap), [cart.serviceMap]);
  const cartTotal    = useMemo(() => cartServices.reduce((s, x) => s + (x.basePrice || x.price || 0), 0), [cartServices]);

  const addToCart = useCallback((salon, service) => {
    setCart(prev => ({
      salon,
      serviceMap: { ...(prev.salon?._id === salon._id ? prev.serviceMap : {}), [service._id]: service },
    }));
  }, []);

  const removeFromCart = useCallback((salon, service) => {
    setCart(prev => {
      if (prev.salon?._id !== salon._id) return prev;
      const { [service._id]: _, ...rest } = prev.serviceMap;
      return { salon: Object.keys(rest).length > 0 ? prev.salon : null, serviceMap: rest };
    });
  }, []);

  const [salons, setSalons]             = useState([]);
  const [allSalons, setAllSalons]       = useState([]);
  const [selectedCats, setSelectedCats] = useState([]);
  const [sort, setSort]                 = useState("nearby");
  const [loading, setLoading]           = useState(true);
  const [locLoading, setLocLoading]     = useState(false);
  const [locDenied, setLocDenied]       = useState(false);
  const [searchText, setSearchText]     = useState("");
  const [searching, setSearching]       = useState(false);
  const [focused, setFocused]           = useState(false);
  const [stickyFocused, setStickyFocused] = useState(false);
  const [openNow, setOpenNow]           = useState(false);
  const [selectedServiceCat, setSelectedServiceCat] = useState(null);
  const [userCoords, setUserCoords]     = useState(null);
  const [serviceMatchLabel, setServiceMatchLabel] = useState("");

  // Clean up old persisted category keys (legacy) and persist cart only
  useEffect(() => {
    sessionStorage.removeItem("home_cats");
    sessionStorage.removeItem("home_svccat");
  }, []);
  useEffect(() => { if (cart.salon) sessionStorage.setItem("home_cart", JSON.stringify(cart)); else sessionStorage.removeItem("home_cart"); }, [cart]);

  useEffect(() => {
    if (!isLoggedIn) return;
    API.get("/customer/auth/me").then(res => {
      const d = res.data?.data || {};
      const n = d.name || d.firstName || "";
      if (n) setUserName(n);
    }).catch(() => {});
  }, [isLoggedIn]);


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



  const applyFilters = (data, cats, onlyOpen, serviceCat) => {
    let r = data;
    if (cats.length > 0) {
      r = r.filter(s => cats.some(cat => {
        const aliases = CATEGORY_ALIASES[cat] || [cat];
        return (s.offeredCategoryNames || []).some(n => aliases.includes(n));
      }));
    }
    if (serviceCat) { r = r.filter(s => (s.offeredCategoryNames || []).includes(serviceCat)); }
    if (onlyOpen) { r = r.filter(s => isOpenNow(s.workingHours) === true); }
    return r;
  };

  const fetchBySort = async (sortKey, coords, cats, gender) => {
    if (!coords) return;
    setLoading(true); setSearchText(""); setServiceMatchLabel("");
    try {
      const res = await API.get(`/public/salons/nearby?latitude=${coords.lat}&longitude=${coords.lng}&sort=${sortKey}`);
      const data = res.data.data?.salons || res.data.data || [];
      setAllSalons(data);
      setSalons(applyFilters(data, cats ?? selectedCats, openNow));
    } catch { setAllSalons([]); setSalons([]); }
    finally { setLoading(false); }
  };

  const chipScrollRef = useRef(null);

  const handleCategory = (cat, btnEl) => {
    const newCats = selectedCats.includes(cat) ? [] : [cat];
    setSelectedCats(newCats);
    setSelectedServiceCat(null);
    if (btnEl && chipScrollRef.current) {
      const container = chipScrollRef.current;
      const btnLeft = btnEl.offsetLeft;
      const btnWidth = btnEl.offsetWidth;
      const scrollTo = btnLeft - (container.offsetWidth / 2) + (btnWidth / 2);
      container.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
    if (searchText.trim()) { runSearch(searchText, newCats); }
    else { setSalons(applyFilters(allSalons, newCats, openNow)); }
  };

  const handleServiceCat = (cat) => {
    const next = selectedServiceCat === cat ? null : cat;
    setSelectedServiceCat(next);
    setSalons(applyFilters(allSalons, selectedCats, openNow, next));
  };

  const handleOpenNow = () => {
    const next = !openNow; setOpenNow(next);
    setSalons(applyFilters(allSalons, selectedCats, next, selectedServiceCat));
  };

  const runSearch = useCallback(async (text, cats) => {
    if (!text.trim()) return;
    setSearching(true); setServiceMatchLabel("");
    const q = text.toLowerCase();
    const ac = cats ?? selectedCats;
    const local = allSalons.filter(s => s.name?.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q) || s.address?.toLowerCase().includes(q));
    const localF = applyFilters(local, ac, openNow);
    if (localF.length > 0) { setSalons(localF); setSearching(false); return; }
    try {
      const res = await API.get(`/public/services/search?q=${encodeURIComponent(text.trim())}`);
      const d = res.data.data;
      if (d?.salons?.length > 0) { setSalons(applyFilters(d.salons, ac, openNow)); setServiceMatchLabel(`Salons offering "${d.matchedService}"`); }
      else { setSalons([]); }
    } catch { setSalons([]); }
    finally { setSearching(false); }
  }, [allSalons, selectedCats, openNow]);

  const handleSearch = text => {
    setSearchText(text);
    if (!text.trim()) { setServiceMatchLabel(""); setSalons(applyFilters(allSalons, selectedCats, openNow)); }
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
        setUserCoords(coords); setLocDenied(false); setSort("nearby");
        fetchBySort("nearby", coords, []).finally(() => setLocLoading(false));
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
    setSort(key);
    if (!searchText.trim()) fetchBySort(key, userCoords, selectedCats);
  };

  const clearAll = () => {
    setSearchText(""); setSelectedCats([]); setSelectedServiceCat(null); setOpenNow(false);
    setServiceMatchLabel(""); setSalons(allSalons);
    setCart({ salon: null, serviceMap: {} });
    sessionStorage.removeItem("home_cart");
  };

  const isSearchActive = searchText.trim().length > 0;
  const isFiltered     = selectedCats.length > 0 || !!selectedServiceCat || openNow;
  const hasActiveState = isSearchActive || isFiltered;

  const availableServiceCats = useMemo(() => {
    if (selectedCats.length === 0) return [];
    const set = new Set();
    applyFilters(allSalons, selectedCats, false).forEach(s =>
      (s.offeredCategoryNames || []).forEach(n => set.add(n))
    );
    return [...set].sort();
  }, [allSalons, selectedCats]);

  const sectionTitle = serviceMatchLabel
    || (isSearchActive ? "Search Results"
    : sort === "rated"  ? "Top Rated Salons"
    : sort === "booked" ? "Trending Salons"
    : "GlowSpots Near You");


  return (
    <div style={{ background:"var(--t-bg)", minHeight:"100vh", overflowX:"hidden", fontFamily:'"Plus Jakarta Sans", system-ui, sans-serif', WebkitTapHighlightColor:"transparent" }}>


      {/* ══════════════════════════════════════════════════════════
          HERO — full editorial, min 85vh
      ══════════════════════════════════════════════════════════ */}
      <section style={{
        position:"relative",
        background:"var(--t-hero-bg)",
        overflow:"hidden",
      }}>

        {/* Content */}
        <div style={{
          position:"relative", zIndex:1,
          width:"100%", maxWidth:1280,
          margin:"0 auto",
          paddingTop:"calc(clamp(32px,3vh,56px) + env(safe-area-inset-top, 0px))",
          paddingBottom:"clamp(10px,2vh,40px)",
        }}>
          {/* Greeting + Search */}
          <div style={{ paddingLeft:"clamp(16px,5vw,80px)", paddingRight:"clamp(16px,5vw,80px)" }}>
            <div style={{ maxWidth:"min(560px, 100%)" }}>

              {/* Greeting overline */}
              <div style={{
                display:"inline-flex", alignItems:"center", gap:8,
                marginBottom:16,
              }}>
                <span style={{ display:"inline-block", width:28, height:2, background:"var(--t-accent)", borderRadius:999 }} />
                <span style={{ fontSize:12, fontWeight:800, letterSpacing:"0.16em", textTransform:"uppercase", color:"var(--t-accent)" }}>
                  {isLoggedIn ? `${getGreeting()}, ${userName}` : getGreeting()}
                </span>
              </div>

              {/* Search bar */}
              <SearchInput
                value={searchText} onChange={handleSearch} onSearch={handleSearchSubmit}
                onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                focused={focused} onClear={() => handleSearch("")}
                onLocate={handleLocation} locLoading={locLoading} searching={searching}
              />

            </div>
          </div>

          {/* Full-width circular category bar */}
          <style>{`.cat-scroll-hero::-webkit-scrollbar{display:none}`}</style>
          <div style={{ position:"relative" }}>
          <div ref={chipScrollRef} className="cat-scroll-hero" style={{
            display:"flex", overflowX:"auto", gap:0,
            padding:"14px clamp(8px,4vw,48px) 10px",
            scrollbarWidth:"none",
          }}>
            {HERO_CHIPS.map(({ label, cat, Icon }) => {
              const active = cat === null ? selectedCats.length === 0 : selectedCats.includes(cat);
              return (
                <button
                  key={label}
                  onClick={e => cat === null ? clearAll() : handleCategory(cat, e.currentTarget)}
                  onTouchStart={e => { e.currentTarget.style.transform = "scale(0.92)"; }}
                  onTouchEnd={e => { e.currentTarget.style.transform = "scale(1)"; }}
                  style={{
                    display:"flex", flexDirection:"column", alignItems:"center", gap:0,
                    flexShrink:0, background:"none", border:"none", cursor:"pointer",
                    padding:"0 14px", position:"relative",
                    transform: active ? "translateY(-6px)" : "translateY(0)",
                    transition:"transform 0.22s cubic-bezier(0.4,0,0.2,1)",
                  }}
                >
                  {/* Circle */}
                  <div style={{
                    width:54, height:54, borderRadius:"50%",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    background: active
                      ? "linear-gradient(145deg,#818cf8 0%,#6366f1 40%,#4f46e5 100%)"
                      : "var(--t-hero-card)",
                    border: active ? "none" : "1.5px solid var(--t-hero-border)",
                    boxShadow: active
                      ? "0 0 0 4px rgba(99,102,241,0.18), 0 8px 28px rgba(99,102,241,0.55), inset 0 1px 1px rgba(255,255,255,0.22)"
                      : "none",
                    transition:"all 0.28s cubic-bezier(0.4,0,0.2,1)",
                  }}>
                    <Icon style={{
                      width:22, height:22,
                      color: active ? "#fff" : "var(--t-hero-muted)",
                      transition:"color 0.22s ease",
                    }} />
                  </div>

                  {/* Label */}
                  <span style={{
                    fontSize:11, fontWeight: active ? 700 : 500,
                    marginTop:8, letterSpacing:"0.15px", whiteSpace:"nowrap",
                    color: active ? "#fff" : "var(--t-hero-muted)",
                    transition:"all 0.22s ease",
                  }}>{label}</span>

                  {/* Active dot */}
                  {active && (
                    <span style={{
                      position:"absolute", bottom:0,
                      left:"50%", transform:"translateX(-50%)",
                      width:20, height:3, borderRadius:999,
                      background:"linear-gradient(90deg,#818cf8,#6366f1)",
                      boxShadow:"0 0 8px rgba(99,102,241,0.8)",
                    }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Instamart-style accent line */}
          <div style={{
            position:"absolute", bottom:0, left:0, right:0, height:3, pointerEvents:"none",
            background:"linear-gradient(90deg,transparent 0%,#818cf8 20%,#6366f1 50%,#a78bfa 80%,transparent 100%)",
            opacity:0.85,
          }} />
          </div>{/* end position:relative */}

        </div>

      </section>

      {/* ── ACTIVE CATEGORY CONTEXT BANNER ───────────────────────── */}
      {selectedCats.length > 0 && (() => {
        const chip = HERO_CHIPS.find(c => c.cat === selectedCats[0]);
        if (!chip) return null;
        const { label, Icon } = chip;
        return (
          <div style={{
            background:"linear-gradient(135deg,rgba(99,102,241,0.13) 0%,rgba(139,92,246,0.09) 100%)",
            borderBottom:"1px solid rgba(99,102,241,0.18)",
            padding:"14px clamp(16px,4vw,32px)",
          }}>
            <div style={{ maxWidth:1280, margin:"0 auto", display:"flex", alignItems:"center", gap:12 }}>
              <div style={{
                width:40, height:40, borderRadius:"50%", flexShrink:0,
                background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
                display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:"0 4px 14px rgba(99,102,241,0.4)",
              }}>
                <Icon style={{ width:18, height:18, color:"#fff" }} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ margin:0, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", color:"var(--t-accent)", opacity:0.8 }}>Browsing</p>
                <h2 style={{ margin:0, fontSize:16, fontWeight:800, color:"var(--t-text)", letterSpacing:"-0.02em", lineHeight:1.2 }}>{label}</h2>
              </div>
              {!loading && (
                <span style={{ fontSize:12, fontWeight:700, color:"var(--t-accent)", background:"rgba(99,102,241,0.12)", border:"1px solid rgba(99,102,241,0.22)", borderRadius:999, padding:"4px 12px", flexShrink:0 }}>
                  {salons.length} found
                </span>
              )}
              <button onClick={clearAll} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t-text-3)", fontSize:20, lineHeight:1, padding:"0 4px", flexShrink:0 }}>×</button>
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════
          DYNAMIC SERVICE CATEGORY CHIPS
      ══════════════════════════════════════════════════════════ */}
      {availableServiceCats.length > 0 && (
        <div style={{
          position:"sticky", top:"var(--sticky-offset, 64px)", zIndex:40,
          background:"var(--t-nav-bg)", backdropFilter:"blur(28px)", WebkitBackdropFilter:"blur(28px)",
          borderBottom:"1px solid var(--t-border)",
        }}>
          <div className="max-w-7xl mx-auto" style={{ padding:"8px clamp(12px,4vw,24px)" }}>
            <div className="cat-scroll-bar" style={{ overflowX:"auto", WebkitOverflowScrolling:"touch", display:"flex", alignItems:"center", gap:8, scrollbarWidth:"none", padding:"4px 0 6px" }}>
              {availableServiceCats.map(cat => {
                const active = selectedServiceCat === cat;
                return (
                  <button key={cat} onClick={() => handleServiceCat(cat)} style={{
                    whiteSpace:"nowrap", padding:"6px 14px", borderRadius:999,
                    fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.18s ease", flexShrink:0,
                    background: active ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "var(--t-input-bg)",
                    border: active ? "1px solid rgba(139,92,246,0.35)" : "1px solid var(--t-border)",
                    color: active ? "#fff" : "var(--t-text-2)",
                    boxShadow: active ? "0 2px 14px rgba(99,102,241,0.24)" : "none",
                  }}>{cat}</button>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
          SALON GRID
      ══════════════════════════════════════════════════════════ */}
      {(!locDenied || isSearchActive) && (
        <section id="salon-grid" style={{ maxWidth:1280, margin:"0 auto", padding:"clamp(20px,4vw,40px) 16px 80px" }}>

          {/* Section header */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"clamp(14px,3vw,28px)", gap:8, flexWrap:"wrap" }}>
            <div>
              <p style={{ fontSize:11,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:"var(--t-accent)",marginBottom:4 }}>
                {sort === "rated" ? "Best in Class" : sort === "booked" ? "Most Popular" : "Near You"}
              </p>
              <h2 style={{ fontSize:"clamp(1.0625rem,3.5vw,1.875rem)",fontWeight:800,color:"var(--t-text)",letterSpacing:"-0.02em",margin:0 }}>
                {sectionTitle}
              </h2>
              {!loading && (
                <p style={{ fontSize:12,color:"var(--t-text-3)",marginTop:4 }}>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
            selectedServiceCat ? (
              /* ── Sub-service selected: inline service discovery view ── */
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {salons.map(s => (
                  <HomeSalonServiceCard
                    key={s._id}
                    salon={s}
                    selectedCats={selectedCats}
                    selectedServiceCat={selectedServiceCat}
                    cart={cart}
                    onAdd={addToCart}
                    onRemove={removeFromCart}
                    userCoords={userCoords}
                    onSalonOpen={(id) => { if (cart.salon && cart.salon._id !== id) { setCart({ salon: null, serviceMap: {} }); setSelectedCats([]); setSelectedServiceCat(null); } setOverlaySalonId(id); }}
                  />
                ))}
              </div>
            ) : (
              /* ── Default grid view ── */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {salons.map(s => <SalonCard key={s._id} salon={s} userCoords={userCoords} />)}
              </div>
            )
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
        <section style={{ position:"relative", overflow:"hidden", borderTop:"1px solid var(--t-border)", padding:"clamp(40px,6vh,96px) 20px" }}>
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

      {/* ── SalonDetails overlay (preserves Home state) ─────── */}
      {overlaySalonId && (
        <div style={{ position:"fixed", inset:0, zIndex:300, overflowY:"auto", background:"var(--t-bg)" }}>
          <SalonDetails salonId={overlaySalonId} onClose={() => setOverlaySalonId(null)} />
        </div>
      )}

      {/* ── Floating cart bar ────────────────────────────────── */}
      {cartServices.length > 0 && !quickBookSalon && (
        <div style={{ position:"fixed", bottom:72, left:16, right:16, zIndex:200, maxWidth:600, margin:"0 auto" }}>
          <button
            onClick={() => setQuickBookSalon(cart.salon)}
            style={{
              width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"14px 20px", borderRadius:16,
              background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
              border:"none", cursor:"pointer",
              boxShadow:"0 8px 32px rgba(99,102,241,0.55)",
            }}
          >
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <ShoppingBag style={{ width:14, height:14, color:"#fff" }} />
              </div>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontSize:13, fontWeight:800, color:"#fff" }}>{cartServices.length} service{cartServices.length > 1 ? "s" : ""} added</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.75)", fontWeight:600 }}>{cart.salon?.name}</div>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:15, fontWeight:800, color:"#fff" }}>₹{cartTotal}</span>
              <span style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.85)" }}>Book →</span>
            </div>
          </button>
        </div>
      )}

      {quickBookSalon && (
        <QuickBookSheet
          salon={quickBookSalon}
          selectedServiceCat={quickBookCat}
          preSelectedServices={cart.salon?._id === quickBookSalon._id ? cartServices : []}
          onClose={() => { setQuickBookSalon(null); setQuickBookCat(null); }}
        />
      )}
    </div>
  );
}
