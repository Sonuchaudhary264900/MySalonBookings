import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useRef, useCallback, useLayoutEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scissors, Phone, Star, Check, MessageSquare, Frown, Building2,
  Mail, ShoppingBag, MapPin, Navigation, ChevronDown, ChevronUp,
  Clock, Sparkles, Award, Users, ArrowLeft, Zap, X, Calendar,
  User, Tag, CreditCard, CheckCircle, Gift, Play, ChevronLeft, ChevronRight, Heart,
  TrendingUp, BadgeCheck, Share2, Volume2, VolumeX,
  Smile, Paintbrush, Waves, Wind, Activity, Crown, Baby, Home, Palette, Shirt, Plus,
  LayoutList, LayoutGrid, Flame, Repeat2, ThumbsUp,
} from "lucide-react";

// Map category label → Lucide component (for service category headers)
const CAT_ICON_COMPONENTS = {
  'Hair Services':               Scissors,
  'Hair Services (Men)':         Scissors,
  'Hair Services (Women)':       Scissors,
  'Beard & Grooming':            Smile,
  'Nail Services':               Paintbrush,
  'Skin & Face / Beauty':        Sparkles,
  'Skin & Face (Men Grooming)':  Sparkles,
  'Skin & Beauty':               Sparkles,
  'Face & Skin':                 Sparkles,
  'Spa & Massage':               Waves,
  'Spa & Relaxation':            Waves,
  'Body Grooming':               Wind,
  'Men Dermatology':             Activity,
  'Women Dermatology':           Activity,
  'Bridal & Events':             Crown,
  'Kids Services':               Baby,
  'At-Home Services':            Home,
  'Makeup Services':             Palette,
  'Hairstyling':                 Scissors,
  'Draping & Dressing':          Shirt,
  'Pre-Bridal':                  Heart,
  'Grooming Add-ons':            Plus,
  'Premium Add-ons':             Star,
};
import API from "../services/api";
import ServiceCard from "../components/ServiceCard";
import ReviewCard from "../components/ReviewCard";
import { isCustomer, clearCustomerAuth } from "../utils/auth";
import { formatDate, salonPath } from "../utils/formatters";
import { useNotifications } from "../context/NotificationContext";
import { useTheme } from "../context/ThemeContext";
import {
  UNISEX_CATEGORIES,
  CATEGORY_ICON_MAP,
  ALL_CATEGORY_ORDER,
  MALE_ONLY_CAT_LABELS,
  FEMALE_ONLY_CAT_LABELS,
  getCategoryOrderForBusinessType,
  getServiceImage,
} from "../constants/salonCategories";

const BASE_TABS = ["Gallery", "Services", "Packages", "Reviews", "Info"];

const WH_DAYS = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
const isOpenNow = (wh) => {
  if (!wh) return null;
  const h = wh[WH_DAYS[new Date().getDay()]];
  if (!h || h.isClosed || !h.open || !h.close) return false;
  const now = new Date(); const nowM = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = h.open.split(":").map(Number); const [ch, cm] = h.close.split(":").map(Number);
  return nowM >= oh * 60 + om && nowM < ch * 60 + cm;
};
const getTodayHours = (wh) => {
  if (!wh) return null;
  const h = wh[WH_DAYS[new Date().getDay()]];
  if (!h || h.isClosed || !h.open || !h.close) return null;
  return `${h.open} – ${h.close}`;
};
const getOpensAt = (wh) => {
  if (!wh) return null;
  const h = wh[WH_DAYS[new Date().getDay()]];
  if (!h || h.isClosed || !h.open) return null;
  return h.open;
};
const getNextSlot = (wh, intervalMins = 30) => {
  if (!wh) return null;
  const now = new Date(); const nowDay = now.getDay(); const nowM = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < 7; i++) {
    const h = wh[WH_DAYS[(nowDay + i) % 7]];
    if (!h || h.isClosed || !h.open || !h.close) continue;
    const [oh, om] = h.open.split(":").map(Number); const [ch, cm] = h.close.split(":").map(Number);
    const openM = oh * 60 + om; const closeM = ch * 60 + cm;
    let slotM;
    if (i === 0) {
      if (nowM >= closeM) continue;
      slotM = nowM <= openM ? openM : openM + Math.ceil((nowM - openM) / intervalMins) * intervalMins;
      if (slotM >= closeM) continue;
    } else { slotM = openM; }
    const label = `${String(Math.floor(slotM/60)).padStart(2,"0")}:${String(slotM%60).padStart(2,"0")}`;
    if (i === 0) return label;
    if (i === 1) return `Tomorrow ${label}`;
    return `${WH_DAYS[(nowDay+i)%7].charAt(0).toUpperCase()}${WH_DAYS[(nowDay+i)%7].slice(1,3)} ${label}`;
  }
  return null;
};

// ── Reverse geocode (shared cache with SalonCard) ────────────────
const GEO_KEY = 'salon_geo_cache';
function getGeoCache() { try { return JSON.parse(localStorage.getItem(GEO_KEY) || '{}'); } catch { return {}; } }
function saveGeoCache(c) { try { localStorage.setItem(GEO_KEY, JSON.stringify(c)); } catch {} }
async function reverseGeocode(lat, lng) {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cache = getGeoCache();
  if (cache[key]) return cache[key];
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const d = await r.json();
    const a = d.address || {};
    const place = a.suburb || a.neighbourhood || a.village || a.town || a.city_district || a.quarter || a.county || null;
    if (place) { const c = getGeoCache(); c[key] = place; saveGeoCache(c); }
    return place;
  } catch { return null; }
}

const localDate = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const todayStr = localDate(0);
const addMinutes = (t, m) => {
  const [h, min] = t.split(":").map(Number);
  const total = h * 60 + min + m;
  return `${String(Math.floor(total / 60)).padStart(2,"0")}:${String(total % 60).padStart(2,"0")}`;
};
const timeToMinutes = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const isPastSlot = (date, s) => {
  if (date !== todayStr) return false;
  const now = new Date();
  return timeToMinutes(s) <= now.getHours() * 60 + now.getMinutes();
};
const formatDay = (dateStr) => {
  const d = new Date(dateStr + "T12:00:00");
  return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
};

const CAT_THEMES = {
  barbershop:    { p: '#6366f1', ring: 'rgba(99,102,241,0.55)' },
  salon:         { p: '#818cf8', ring: 'rgba(129,140,248,0.55)' },
  spa_wellness:  { p: '#8b5cf6', ring: 'rgba(139,92,246,0.55)' },
  makeup_bridal: { p: '#a78bfa', ring: 'rgba(167,139,250,0.55)' },
  skin_derma:    { p: '#6366f1', ring: 'rgba(99,102,241,0.55)' },
};
const DEFAULT_THEME = CAT_THEMES.salon;

const BIZ_LABELS    = { barbershop:'barbershop visit', salon:'salon visit', spa_wellness:'spa session', makeup_bridal:'makeover', skin_derma:'skin treatment' };
const BIZ_SUBTITLES = { barbershop:'Precision cuts. Defined character.', salon:'Luxury grooming experience.', spa_wellness:'Wellness & beauty elevated.', makeup_bridal:'Bridal beauty artistry.', skin_derma:'Advanced skin science.' };

function SalonDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast, addNotification } = useNotifications();
  const token = localStorage.getItem("customerToken");

  const [salon, setSalon]           = useState(null);
  const [services, setServices]     = useState([]);
  const [reviews, setReviews]       = useState([]);
  const [offers, setOffers]         = useState([]);
  const [packages, setPackages]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [pkgReqModal, setPkgReqModal]     = useState(null);
  const [pkgNote, setPkgNote]             = useState('');
  const [pkgReqLoading, setPkgReqLoading] = useState(false);
  const [selectedServices, setSelectedServices] = useState([]);
  const [serviceGenderFilter, setServiceGenderFilter] = useState("all");
  const [expandedCats, setExpandedCats] = useState(() => new Set('__all__'));
  const [heroMuted, setHeroMuted]       = useState(true);
  const [heroSlideIdx, setHeroSlideIdx] = useState(0);
  const [photoSlideIdx, setPhotoSlideIdx] = useState(0);
  const [locality, setLocality]          = useState(null);
  const { isDark: darkMode } = useTheme();
  const heroVideoRef2 = useRef(null);
  const heroSwipeStartX = useRef(null);
  const galleryTrackRef = useRef(null);
  const reviewTrackRef  = useRef(null);
  const heroSectionRef = useRef(null);
  const [galleryLightbox, setGalleryLightbox] = useState(null);
  const galleryVideoRef = useRef(null);
  const [videoViewerIdx, setVideoViewerIdx] = useState(null);
  const [showBooking, setShowBooking]     = useState(false);
  const [barbers, setBarbers]             = useState([]);
  const [barberId, setBarberId]           = useState("");
  const [bookDate, setBookDate]           = useState(todayStr);
  const [slot, setSlot]                   = useState("");
  const [slots, setSlots]                 = useState([]);
  const [blockedSlots, setBlockedSlots]   = useState([]);
  const [closedDay, setClosedDay]         = useState(false);
  const [bookingMode, setBookingMode]     = useState("sequential");
  const [slotsLoading, setSlotsLoading]   = useState(false);
  const [slotsKey, setSlotsKey]           = useState(0);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [couponInput, setCouponInput]     = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError]     = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [slotPopup, setSlotPopup]         = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingStatus, setBookingStatus] = useState("confirmed");
  const [bookError, setBookError]         = useState("");

  const [serviceView,         setServiceView]         = useState(() => localStorage.getItem('svc_view') || 'grid');
  const [favServices,         setFavServices]         = useState(() => JSON.parse(localStorage.getItem('svc_favs') || '[]'));
  const [recentSvcIds,        setRecentSvcIds]        = useState(() => JSON.parse(localStorage.getItem('svc_recent') || '[]'));
  const [catClickCounts,      setCatClickCounts]      = useState(() => JSON.parse(localStorage.getItem('svc_cat_clicks') || '{}'));
  const [membershipDismissed, setMembershipDismissed] = useState(() => !!localStorage.getItem('svc_membership_dismissed'));
  const [showFavsOnly,        setShowFavsOnly]        = useState(false);

  const totalPrice    = selectedServices.reduce((s, x) => s + (x.basePrice || x.price || 0), 0);
  const totalDuration = selectedServices.reduce((s, x) => s + (x.duration || 0), 0);
  const finalPrice    = Math.max(0, totalPrice - couponDiscount);
  const advanceDays   = salon?.advanceBookingDays ?? 7;
  const dateDays      = Array.from({ length: Math.max(advanceDays + 1, 8) }, (_, i) => localDate(i));

  useEffect(() => {
    if (!token) return;
    API.get("/customer/auth/me").then(res => {
      const gender = res.data?.data?.gender || res.data?.gender;
      if (gender === "male" || gender === "female") setServiceGenderFilter(gender);
    }).catch(() => {});
  }, [token]);

  useEffect(() => { localStorage.setItem('svc_view', serviceView); }, [serviceView]);
  useEffect(() => { localStorage.setItem('svc_favs', JSON.stringify(favServices)); }, [favServices]);
  useEffect(() => { localStorage.setItem('svc_cat_clicks', JSON.stringify(catClickCounts)); }, [catClickCounts]);

  useEffect(() => {
    Promise.all([loadSalon(), loadServices(), loadReviews(), loadBarbers(), loadOffers(), loadPackages()]).finally(() => setLoading(false));
  }, [id]);

  const loadSalon    = async () => { try { const r = await API.get(`/public/salons/${id}`); const data = r.data.data || r.data.salon; setSalon(data); if (data?.topOffer) setOffers(prev => prev.length > 0 ? prev : [data.topOffer]); } catch {} };
  const loadServices = async () => { try { const r = await API.get(`/public/salons/${id}/services`); setServices(r.data.data?.services || r.data.data || []); } catch {} };
  const loadReviews  = async () => { try { const r = await API.get(`/public/salons/${id}/reviews`);  setReviews(r.data.data?.reviews  || r.data.data || []); } catch {} };
  const loadBarbers  = async () => { try { const r = await API.get(`/public/salons/${id}/barbers`).catch(() => ({ data: { data: { barbers: [] } } })); setBarbers(r.data.data?.barbers || []); } catch {} };
  const loadOffers   = async () => { try { const r = await API.get(`/public/salons/${id}/offers`);  const list = r.data.data?.offers || []; if (list.length > 0) setOffers(list); } catch {} };
  const loadPackages = async () => { try { const r = await API.get(`/public/salons/${id}/packages`); setPackages(r.data.data?.packages || []); } catch {} };

  useEffect(() => {
    if (!showBooking || !totalDuration || !id) return;
    setSlot(""); setSlots([]); setBlockedSlots([]); setClosedDay(false);
    let stale = false;
    const fetchSlots = async () => {
      setSlotsLoading(true);
      try {
        const res = await API.get(`/public/salons/${id}/booked-slots?date=${bookDate}&duration=${totalDuration}`);
        if (stale) return;
        const data = res.data.data || {};
        const mode = data.bookingMode || "sequential";
        setBookingMode(mode); setSlots(data.slots || []); setBlockedSlots(data.blockedSlots || []); setClosedDay(data.closedDay || false);
        if (mode === "sequential" && data.slots?.length === 1 && !isPastSlot(bookDate, data.slots[0])) setSlot(data.slots[0]);
      } catch { if (!stale) setSlots([]); } finally { if (!stale) setSlotsLoading(false); }
    };
    fetchSlots();
    return () => { stale = true; };
  }, [bookDate, id, totalDuration, showBooking, slotsKey]);

  // ── Hero slides: videos only ──
  const heroSlides = useMemo(() => {
    if (!salon) return [];
    const videos = (salon.videos || []).map(v => (typeof v === 'string' ? v : v?.url)).filter(Boolean);
    if (videos.length > 0) return videos.map(url => ({ url, type: 'video' }));
    // Fallback: show cover/photos if no videos
    const photos = (salon.photos || []).map(p => (typeof p === 'string' ? p : p?.url)).filter(Boolean);
    const cover  = salon.coverPhoto || null;
    const result = [];
    if (cover) result.push({ url: cover, type: 'image' });
    photos.filter(u => u !== cover).forEach(u => result.push({ url: u, type: 'image' }));
    return result;
  }, [salon]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset slide index when salon changes
  useEffect(() => { setHeroSlideIdx(0); }, [salon?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reverse geocode salon coordinates → locality
  useEffect(() => {
    if (!salon) return;
    const coords = salon.location?.coordinates;
    if (!coords || coords.length < 2) return;
    const [lng, lat] = coords;
    let cancelled = false;
    setLocality(null);
    reverseGeocode(lat, lng).then(place => { if (!cancelled && place) setLocality(place); });
    return () => { cancelled = true; };
  }, [salon?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore pending service selection after login redirect
  useEffect(() => {
    const pending = location.state?.pendingServices;
    if (pending?.length && salon) {
      setSelectedServices(pending);
      setBookDate(todayStr); setSlot(""); setBarberId(""); setAppliedCoupon(null);
      setCouponDiscount(0); setCouponInput(""); setCouponError(""); setBookingSuccess(false); setBookError("");
      setShowBooking(true);
    }
  }, [salon]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-advance hero — only for image slides (videos advance on onEnded)
  useEffect(() => {
    if (heroSectionRef.current) heroSectionRef.current._slideLen = heroSlides.length;
    if (heroSlides.length <= 1) return;
    const current = heroSlides[heroSlideIdx];
    if (current?.type === 'video') return; // video advances via onEnded
    const t = setTimeout(() => setHeroSlideIdx(i => (i + 1) % heroSlides.length), 3500);
    return () => clearTimeout(t);
  }, [heroSlides.length, heroSlideIdx, heroSlides]);

  // Gallery auto-scroll
  useEffect(() => {
    const interval = setInterval(() => {
      const track = galleryTrackRef.current;
      if (!track) return;
      const max = track.scrollWidth - track.clientWidth;
      if (!max) return;
      if (track.scrollLeft >= max - 20) {
        track.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        track.scrollBy({ left: 310, behavior: 'smooth' });
      }
    }, 2200);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reviews auto-scroll
  useEffect(() => {
    const interval = setInterval(() => {
      const track = reviewTrackRef.current;
      if (!track) return;
      const max = track.scrollWidth - track.clientWidth;
      if (!max) return;
      if (track.scrollLeft >= max - 20) {
        track.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        track.scrollBy({ left: 340, behavior: 'smooth' });
      }
    }, 3200);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Owner section photo slideshow
  useEffect(() => {
    if (!salon) return;
    const photos = (salon.photos || []).map(p => (typeof p === 'string' ? p : p?.url)).filter(Boolean);
    if (photos.length <= 1) return;
    const t = setInterval(() => setPhotoSlideIdx(i => (i + 1) % photos.length), 3800);
    return () => clearInterval(t);
  }, [salon?._id, salon?.photos?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hero swipe — passive listeners so vertical scroll is never blocked
  useEffect(() => {
    const el = heroSectionRef.current;
    if (!el) return;
    let startX = null, startY = null;
    const onStart = (e) => {
      const t = e.touches ? e.touches[0] : e;
      startX = t.clientX; startY = t.clientY;
    };
    const onEnd = (e) => {
      if (startX === null) return;
      const t = e.changedTouches ? e.changedTouches[0] : e;
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      if (Math.abs(dx) > 40 && Math.abs(dx) > dy) {
        setHeroSlideIdx(i => {
          const len = heroSectionRef.current?._slideLen || 1;
          return dx < 0 ? (i + 1) % len : (i - 1 + len) % len;
        });
      }
      startX = null;
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend',   onEnd,   { passive: true });
    el.addEventListener('mousedown',  onStart);
    el.addEventListener('mouseup',    onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchend',   onEnd);
      el.removeEventListener('mousedown',  onStart);
      el.removeEventListener('mouseup',    onEnd);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleService = (service) => {
    setSelectedServices(prev =>
      prev.find(s => s._id === service._id) ? prev.filter(s => s._id !== service._id) : [...prev, service]
    );
  };

  const toggleFav = useCallback((id) => (e) => {
    e.stopPropagation();
    setFavServices(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const openBooking = () => {
    if (!isCustomer()) { clearCustomerAuth(); navigate("/login", { state: { from: location.pathname, bookingState: { pendingServices: selectedServices } } }); return; }
    setBookDate(todayStr); setSlot(""); setBarberId(""); setAppliedCoupon(null);
    setCouponDiscount(0); setCouponInput(""); setCouponError(""); setBookingSuccess(false); setBookError(""); setShowBooking(true);
  };

  const handleBookNow   = () => { if (selectedServices.length === 0) { document.getElementById('lux-services')?.scrollIntoView({ behavior: 'smooth' }); return; } openBooking(); };
  const handleSmartBook = () => { if (selectedServices.length === 0) { document.getElementById('lux-services')?.scrollIntoView({ behavior: 'smooth' }); } else { openBooking(); } };

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponError(""); setCouponLoading(true);
    try {
      const res = await API.post("/customer/coupons/validate", { code: couponInput.trim().toUpperCase(), salonId: id, totalAmount: totalPrice });
      const { coupon, discount } = res.data.data;
      setAppliedCoupon(coupon); setCouponDiscount(discount);
    } catch (err) {
      setCouponError(err.response?.data?.message || "Invalid coupon");
      setAppliedCoupon(null); setCouponDiscount(0);
    } finally { setCouponLoading(false); }
  };
  const removeCoupon = () => { setAppliedCoupon(null); setCouponDiscount(0); setCouponInput(""); setCouponError(""); };

  const handlePackageRequest = async () => {
    if (!isCustomer()) { navigate('/login'); return; }
    if (!pkgReqModal) return;
    setPkgReqLoading(true);
    try {
      await API.post('/customer/package-request', { packageId: pkgReqModal._id, purchaseNote: pkgNote.trim() });
      addToast?.('success', 'Request sent! The salon will confirm after payment.');
      setPkgReqModal(null); setPkgNote('');
    } catch (err) {
      addToast?.('error', err.response?.data?.message || 'Failed to send request');
    } finally { setPkgReqLoading(false); }
  };

  const handleConfirm = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!slot) { setBookError("Please select a time slot."); return; }
    if (isPastSlot(bookDate, slot)) { setSlot(""); setBookError("This time slot has just passed. Please select another."); return; }
    setBookError(""); setBookingLoading(true);
    try {
      const res = await API.post("/customer/bookings", {
        salonId: id, serviceIds: selectedServices.map(s => s._id), barberId: barberId || undefined,
        appointmentDate: bookDate, appointmentTime: slot, paymentMethod: "cash",
        couponCode: appliedCoupon?.code || undefined,
      });
      const status = res.data.data?.booking?.status || res.data.data?.status || "confirmed";
      setBookingStatus(status);
      if (status === "confirmed") {
        addToast("success", "Booking confirmed!");
        addNotification({ type: "booking", title: "Booking Confirmed", message: `${selectedServices.map(s => s.name).join(" + ")} at ${salon?.name} on ${bookDate} at ${slot}` });
      } else {
        addToast("info", "Booking received! Awaiting salon confirmation.");
        addNotification({ type: "booking", title: "Booking Pending", message: `Your booking at ${salon?.name} is awaiting confirmation.` });
      }
      setBookingSuccess(true);
      setRecentSvcIds(prev => {
        const merged = [...new Set([...selectedServices.map(s => s._id), ...prev])].slice(0, 10);
        localStorage.setItem('svc_recent', JSON.stringify(merged));
        return merged;
      });
    } catch (err) {
      setBookError(err.message || "Booking failed. Please try again.");
      addToast("error", err.message || "Booking failed. Please try again.");
    } finally { setBookingLoading(false); }
  };

  // These must be before early returns to satisfy Rules of Hooks
  const salonPhotoUrls = useMemo(() => (salon?.photos || []).map(p => (typeof p === 'string' ? p : p?.url)).filter(Boolean), [salon?._id, salon?.photos?.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const salonVideoUrls = useMemo(() => (salon?.videos || []).map(v => (typeof v === 'string' ? v : v?.url)).filter(Boolean), [salon?._id, salon?.videos?.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const galleryItems   = useMemo(() => [...salonPhotoUrls.map(url => ({ url, type: 'image' })), ...salonVideoUrls.map(url => ({ url, type: 'video' }))], [salonPhotoUrls, salonVideoUrls]);

  if (loading) {
    return (
      <div style={{ background: 'var(--t-bg)', minHeight: '100vh' }}>
        <div style={{ height: '100vh', background: 'linear-gradient(135deg,var(--t-bg),var(--t-bg-2))' }} />
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 20, background: 'rgba(255,255,255,.06)', borderRadius: 2 }} />)}
        </div>
      </div>
    );
  }

  if (!salon) {
    return (
      <div style={{ background: 'var(--t-bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center">
          <Frown className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(255,255,255,.2)' }} />
          <p className="mb-4" style={{ color: 'rgba(255,255,255,.4)' }}>Salon not found.</p>
          <button onClick={() => navigate("/")} style={{ background: '#8b5cf6', color: '#fff', padding: '12px 32px', borderRadius: 2, border: 'none', cursor: 'pointer', fontWeight: 700 }}>Go Home</button>
        </div>
      </div>
    );
  }

  const avgRating = salon.averageRating || salon.rating ? parseFloat(salon.averageRating || salon.rating).toFixed(1) : null;
  const openStatus     = isOpenNow(salon.workingHours);
  const todayHours     = getTodayHours(salon.workingHours);
  const opensAt        = getOpensAt(salon.workingHours);
  const nextSlot       = getNextSlot(salon.workingHours);
  const totalBookings  = salon.totalBookings || 0;
  const dayOrder       = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
  const theme          = CAT_THEMES[salon.businessType] || DEFAULT_THEME;
  const dm = {
    bg:  darkMode ? '#111827' : '#f9fafb',
    fg:  darkMode ? '#ffffff' : '#111827',
    fg75: darkMode ? 'rgba(255,255,255,.75)' : 'rgba(17,24,39,.82)',
    fg65: darkMode ? 'rgba(255,255,255,.65)' : 'rgba(17,24,39,.72)',
    fg55: darkMode ? 'rgba(255,255,255,.55)' : 'rgba(17,24,39,.65)',
    fg50: darkMode ? 'rgba(255,255,255,.50)' : 'rgba(17,24,39,.58)',
    fg48: darkMode ? 'rgba(255,255,255,.48)' : 'rgba(17,24,39,.58)',
    fg45: darkMode ? 'rgba(255,255,255,.45)' : 'rgba(17,24,39,.56)',
    fg42: darkMode ? 'rgba(255,255,255,.42)' : 'rgba(17,24,39,.52)',
    fg40: darkMode ? 'rgba(255,255,255,.40)' : 'rgba(17,24,39,.50)',
    fg38: darkMode ? 'rgba(255,255,255,.38)' : 'rgba(17,24,39,.48)',
    fg35: darkMode ? 'rgba(255,255,255,.35)' : 'rgba(17,24,39,.45)',
    fg32: darkMode ? 'rgba(255,255,255,.32)' : 'rgba(17,24,39,.40)',
    fg30: darkMode ? 'rgba(255,255,255,.30)' : 'rgba(17,24,39,.38)',
    fg28: darkMode ? 'rgba(255,255,255,.28)' : 'rgba(17,24,39,.34)',
    fg25: darkMode ? 'rgba(255,255,255,.25)' : 'rgba(17,24,39,.30)',
    b28:  darkMode ? 'rgba(255,255,255,.28)' : 'rgba(0,0,0,.18)',
    b20:  darkMode ? 'rgba(255,255,255,.20)' : 'rgba(0,0,0,.14)',
    b14:  darkMode ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.10)',
    b12:  darkMode ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.08)',
    b10:  darkMode ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.07)',
    b07:  darkMode ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.05)',
    b05:  darkMode ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.04)',
    b04:  darkMode ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.04)',
    b03:  darkMode ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.03)',
    card:     darkMode ? '#111827' : '#ffffff',
    cardBrd:  darkMode ? '#1f2937' : '#e5e7eb',
    barBg:    darkMode ? '#1f2937' : '#f3f4f6',
    ownerOvr: darkMode ? 'linear-gradient(to right,transparent 35%,rgba(17,24,39,.25) 55%,rgba(17,24,39,.72) 75%,#111827 100%)' : 'linear-gradient(to right,transparent 65%,rgba(0,0,0,.12) 100%)',
    heroOvr1: 'linear-gradient(to top,rgba(0,0,0,.88) 0%,rgba(0,0,0,.60) 18%,rgba(0,0,0,.28) 42%,rgba(0,0,0,.08) 65%,transparent 100%)',
    heroOvr2: 'linear-gradient(to right,rgba(0,0,0,.50) 0%,rgba(0,0,0,.28) 30%,rgba(0,0,0,.10) 55%,transparent 78%)',
    ctaOvr:   darkMode ? 'linear-gradient(to bottom,rgba(0,0,0,.30) 0%,rgba(0,0,0,.55) 100%)' : 'linear-gradient(to bottom,rgba(0,0,0,.25) 0%,rgba(0,0,0,.50) 100%)',
    formInp:  darkMode ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.03)',
    formBrd:  darkMode ? '#374151' : '#e5e7eb',
    modal:    darkMode ? '#111827' : '#ffffff',
    drawer:   darkMode ? '#111827' : '#f9fafb',
    drawerBrd: darkMode ? '0 -20px 80px rgba(0,0,0,.5),0 0 0 1px #1f2937' : '0 -20px 80px rgba(0,0,0,.10),0 0 0 1px rgba(0,0,0,.07)',
  };
  const currentHeroSlide = heroSlides[heroSlideIdx] || null;
  const allOffers        = offers.length > 0 ? offers : salon.topOffer ? [salon.topOffer] : [];

  // ── Pricing analysis ──
  const allPrices    = services.map(s => s.basePrice || s.price || 0);
  const sortedPrices = [...allPrices].sort((a, b) => a - b);
  const priceP80     = sortedPrices[Math.floor(sortedPrices.length * 0.8)] || 0;
  const priceP20     = sortedPrices[Math.floor(sortedPrices.length * 0.2)] || 0;
  const medianDur    = [...services].sort((a,b)=>(a.duration||0)-(b.duration||0))[Math.floor(services.length/2)]?.duration || 0;
  const topBookingCount = Math.max(0, ...services.map(s => s.bookingCount || 0));

  const getBadge = (s) => {
    const price = s.basePrice || s.price || 0;
    if (s.isPopular || (s.bookingCount || 0) > 10) return 'Popular';
    if (price >= priceP80 && priceP80 > 0) return 'Premium';
    if (price <= priceP20 && priceP20 > 0 && (s.duration||0) >= medianDur) return 'Best Value';
    if ((s.duration||0) > 0 && (s.duration||0) < 20) return 'Fast';
    return null;
  };

  const getRecommended = (catServices) => {
    const withBookings = catServices.filter(s => (s.bookingCount||0) > 0 || s.isPopular);
    if (!withBookings.length) return null;
    return withBookings.sort((a,b)=>(b.bookingCount||0)-(a.bookingCount||0))[0]._id;
  };

  const bestOffer = (() => {
    if (!allOffers.length) return null;
    return allOffers
      .filter(o => totalPrice >= (o.minAmount || 0))
      .map(o => ({
        ...o,
        discount: o.discountType === 'percentage' ? Math.round(totalPrice * o.discountValue / 100) : o.discountValue
      }))
      .sort((a,b) => b.discount - a.discount)[0] || null;
  })();

  const offerGap = (() => {
    const next = [...allOffers]
      .filter(o => (o.minAmount || 0) > totalPrice)
      .sort((a,b) => a.minAmount - b.minAmount)[0];
    if (!next) return null;
    const discount = next.discountType === 'percentage'
      ? Math.round(next.minAmount * next.discountValue / 100)
      : next.discountValue;
    return { gap: next.minAmount - totalPrice, discount, offer: next };
  })();

  const comboSuggestions = (() => {
    if (!selectedServices.length) return [];
    const selectedCats = new Set(selectedServices.map(s => s.category));
    const selectedIds  = new Set(selectedServices.map(s => s._id));
    const byCategory   = {};
    services
      .filter(s => !selectedIds.has(s._id) && !selectedCats.has(s.category))
      .forEach(s => {
        if (!byCategory[s.category] || (s.bookingCount||0) > (byCategory[s.category].bookingCount||0))
          byCategory[s.category] = s;
      });
    return Object.values(byCategory).slice(0, 3);
  })();

  const quickRebook = (() => {
    const svcMap = Object.fromEntries(services.map(s => [s._id, s]));
    return recentSvcIds.filter(id => svcMap[id]).slice(0, 3).map(id => svcMap[id]);
  })();

  const catSortBoost = (cat) => -(catClickCounts[cat] || 0);

  const nextAvailableSlot = slots.find(s => !blockedSlots.includes(s) && !isPastSlot(bookDate, s)) || null;

  return (
    <div style={{ background: dm.bg, color: dm.fg, minHeight: '100vh', overflowX: 'hidden', transition: 'background .3s,color .3s', paddingBottom: selectedServices.length > 0 ? 'calc(80px + env(safe-area-inset-bottom, 0px))' : 0 }}>

      {/* ════ PAGE CSS ════ */}
      <style>{`
        .lux-hero{position:relative;height:clamp(300px,60vh,560px);overflow:hidden}
        .lux-media{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
        @keyframes luxKB{from{transform:scale(1)}to{transform:scale(1.06)}}
        .lux-media-img{animation:luxKB 12s ease-in-out infinite alternate}
        @keyframes heroFadeIn{from{opacity:0}to{opacity:1}}
        .lux-hero-slide{position:absolute;inset:0;animation:heroFadeIn 0.25s ease both}
        .lux-section{padding:clamp(44px,8vw,140px) clamp(16px,6vw,96px)}
        .lux-title{font-size:clamp(24px,5vw,72px);font-weight:900;line-height:1.05;letter-spacing:-.025em}
        .lux-hero-title{font-size:clamp(22px,5.5vw,64px);font-weight:900;line-height:.95;letter-spacing:-.03em}
        .lux-overline{font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase}
        .lux-body{font-size:clamp(14px,1.4vw,19px);line-height:1.75}
        .lux-divider{width:36px;height:1px;margin:20px 0}
        .lux-btn-p{display:inline-flex;align-items:center;gap:8px;padding:13px 24px;font-weight:700;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#fff;border-radius:2px;transition:all .25s ease;cursor:pointer;border:none;outline:none;white-space:nowrap}
        .lux-btn-o{display:inline-flex;align-items:center;gap:8px;padding:13px 24px;font-weight:700;font-size:12px;letter-spacing:.12em;text-transform:uppercase;border-radius:2px;transition:all .25s ease;cursor:pointer;background:transparent;text-decoration:none;white-space:nowrap}
        .lux-btn-p:hover,.lux-btn-o:hover{opacity:.8;transform:translateY(-2px)}
        @media(max-width:639px){.lux-btn-p:hover,.lux-btn-o:hover{transform:none!important;opacity:1!important}}
        @media(max-width:479px){.lux-btn-p,.lux-btn-o{padding:11px 16px;font-size:11px;letter-spacing:.07em}}
        @media(max-width:374px){.lux-btn-p,.lux-btn-o{padding:10px 14px;font-size:10px;letter-spacing:.05em}}
        .lux-gallery-track{display:flex;gap:12px;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}
        .lux-gallery-track::-webkit-scrollbar{display:none}
        .lux-gc{position:relative;flex-shrink:0;overflow:hidden;scroll-snap-align:start;cursor:pointer;border-radius:2px}
        .lux-gc .gcm{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .7s ease}
        .lux-gc:hover .gcm{transform:scale(1.06)}
        .lux-svc-cat{border-bottom:1px solid ${dm.b05}}
        .lux-svc-row{padding:14px 0;display:flex;align-items:center;gap:10px;border-bottom:1px solid ${dm.b03};cursor:pointer;transition:padding-left .2s}
        .lux-svc-row:hover{padding-left:8px}
        .lux-rev-track{display:flex;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;padding:0 clamp(16px,6vw,96px)}
        .lux-rev-track::-webkit-scrollbar{display:none}
        .lux-info-row{display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid ${dm.b04}}
        .lux-split{display:grid;grid-template-columns:1fr 1fr}
        @media(max-width:767px){.lux-split{grid-template-columns:1fr}}
        .lux-pkg-card{border:1px solid ${dm.b07};padding:clamp(16px,3vw,32px);border-radius:2px;transition:border-color .2s,transform .2s;display:flex;flex-direction:column}
        .lux-pkg-card:hover{border-color:${dm.b20};transform:translateY(-4px)}
        @media(max-width:639px){.lux-pkg-card:hover{transform:none!important}}
        .lux-cat-header{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%}
        .lux-cat-left{display:flex;align-items:center;gap:12px;flex:1;min-width:0}
        .lux-cat-right{display:flex;align-items:center;gap:16px;flex-shrink:0}
        @media(max-width:479px){.lux-cat-right{gap:10px}}
        .lux-svc-name{overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
        .svc-grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(200px,1fr))}
        @media(max-width:639px){.svc-grid{grid-template-columns:repeat(2,1fr);gap:10px}}
        @keyframes pulse{0%,100%{opacity:.4}50%{opacity:.9}}
      `}</style>

      {/* ════ 1. HERO ════ */}
      <motion.section ref={el => { heroSectionRef.current = el; if (el) el._slideLen = heroSlides.length; }}
        className="lux-hero"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}
        onTouchStart={e => { heroSwipeStartX.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          if (heroSwipeStartX.current === null || heroSlides.length <= 1) return;
          const dx = e.changedTouches[0].clientX - heroSwipeStartX.current;
          heroSwipeStartX.current = null;
          if (Math.abs(dx) < 40) return;
          if (dx < 0) setHeroSlideIdx(i => (i + 1) % heroSlides.length);
          else setHeroSlideIdx(i => (i - 1 + heroSlides.length) % heroSlides.length);
        }}>
        {/* Preload next 2 videos, metadata-only for ones further ahead */}
        {heroSlides.map((s, i) => {
          if (s.type !== 'video' || i === heroSlideIdx) return null;
          const dist = (i - heroSlideIdx + heroSlides.length) % heroSlides.length;
          if (dist > 4) return null;
          return <video key={s.url} src={s.url} preload={dist <= 2 ? 'auto' : 'metadata'} muted playsInline style={{ display: 'none' }} />;
        })}
        {currentHeroSlide ? (
          <div key={heroSlideIdx} className="lux-hero-slide">
            {currentHeroSlide.type === 'video'
              ? <video ref={heroVideoRef2} src={currentHeroSlide.url} autoPlay muted={heroMuted} playsInline className="lux-media"
                  onEnded={() => heroSlides.length > 1 && setHeroSlideIdx(i => (i + 1) % heroSlides.length)} />
              : <img src={currentHeroSlide.url} alt={salon.name} className="lux-media lux-media-img" />
            }
          </div>
        ) : (
          <div className="lux-media" style={{ background: `radial-gradient(ellipse 70% 60% at 20% 40%, ${theme.p}28 0%, transparent 55%), radial-gradient(ellipse 55% 65% at 80% 60%, rgba(139,92,246,0.18) 0%, transparent 50%), linear-gradient(135deg, var(--t-bg) 0%, var(--t-bg-2) 100%)` }} />
        )}
        <div className="absolute inset-0" style={{ background: dm.heroOvr1 }} />
        <div className="absolute inset-0" style={{ background: dm.heroOvr2 }} />
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg,${theme.p}14 0%,transparent 55%)` }} />
        {/* Noise texture to eliminate gradient banding */}
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.04, backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundRepeat: 'repeat', backgroundSize: '200px 200px', mixBlendMode: 'overlay' }} />

        <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)}
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.12)' }}>
            <ArrowLeft className="w-5 h-5 text-white" />
          </motion.button>
          <div className="flex items-center gap-2">
            {currentHeroSlide?.type === 'video' && (
              <button onClick={e => { e.stopPropagation(); setHeroMuted(m => !m); heroVideoRef2.current && (heroVideoRef2.current.muted = !heroMuted); }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.12)' }}>
                {heroMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}
            {salon.isApproved && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white"
                style={{ background: 'rgba(16,185,129,.2)', backdropFilter: 'blur(8px)', border: '1px solid rgba(16,185,129,.35)' }}>
                <BadgeCheck className="w-3.5 h-3.5" /> Verified
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-10" style={{ padding: 'clamp(12px,4vw,60px)', paddingBottom: 'clamp(44px,7vh,90px)' }}>
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .2, duration: .9, ease: [.22,1,.36,1] }}>
            <p className="lux-overline mb-4" style={{ color: 'rgba(255,255,255,.72)', textShadow: '0 1px 8px rgba(0,0,0,.65)' }}>
              {BIZ_SUBTITLES[salon.businessType] || 'Premium grooming experience'}
            </p>
            <h1 className="lux-hero-title text-white mb-5" style={{ maxWidth: 780, textShadow: '0 2px 16px rgba(0,0,0,.55), 0 0 40px rgba(0,0,0,.25)' }}>
              {salon.name.toUpperCase()}
            </h1>
            <div className="flex items-center flex-wrap mb-8" style={{ gap: 'clamp(12px,2vw,28px)' }}>
              {avgRating && (
                <div className="flex items-center gap-2" style={{ textShadow: '0 1px 6px rgba(0,0,0,.55)' }}>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className="w-3.5 h-3.5"
                        style={{ color: s <= Math.round(parseFloat(avgRating)) ? '#fbbf24' : 'rgba(255,255,255,.25)',
                                 fill:  s <= Math.round(parseFloat(avgRating)) ? '#fbbf24' : 'none',
                                 filter: 'drop-shadow(0 1px 4px rgba(0,0,0,.5))' }} />
                    ))}
                  </div>
                  <span className="font-bold text-sm text-white">{avgRating}</span>
                  {(salon.totalReviews || reviews.length) > 0 && (
                    <span className="text-sm" style={{ color: 'rgba(255,255,255,.55)' }}>({salon.totalReviews || reviews.length})</span>
                  )}
                </div>
              )}
              {(locality || salon.address || salon.city) && (
                <div className="flex items-center gap-1.5 text-sm" style={{ color: 'rgba(255,255,255,.70)', textShadow: '0 1px 6px rgba(0,0,0,.6)' }}>
                  <MapPin className="w-3.5 h-3.5" />
                  {[locality, salon.city].filter(Boolean).join(', ') || salon.address}
                </div>
              )}
              {openStatus !== null && (
                <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: openStatus ? '#4ade80' : '#f87171', textShadow: '0 1px 6px rgba(0,0,0,.6)' }}>
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: openStatus ? '#4ade80' : '#f87171', boxShadow: openStatus ? '0 0 8px rgba(74,222,128,.6)' : '0 0 8px rgba(248,113,113,.6)' }} />
                  {openStatus ? (todayHours ? `Open · ${todayHours}` : 'Open Now') : (opensAt ? `Opens ${opensAt}` : 'Closed Today')}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <motion.button whileTap={{ scale: .97 }} whileHover={{ scale: 1.02 }} onClick={handleSmartBook}
                className="lux-btn-p" style={{ background: theme.p, boxShadow: `0 8px 32px ${theme.p}66, 0 2px 8px rgba(0,0,0,.35)` }}>
                <Zap className="w-4 h-4" /> Book Appointment
              </motion.button>
              <motion.button whileTap={{ scale: .97 }} whileHover={{ scale: 1.02 }}
                onClick={() => document.getElementById('lux-services')?.scrollIntoView({ behavior: 'smooth' })}
                className="lux-btn-o" style={{ color: '#fff', border: '1px solid rgba(255,255,255,.35)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', background: 'rgba(255,255,255,.08)' }}>
                View Services
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Slide dot indicators */}
        {heroSlides.length > 1 && (
          <div className="absolute z-10 flex items-center gap-1.5"
            style={{ bottom: 'clamp(76px,8vh,110px)', left: 'clamp(24px,6vw,96px)' }}>
            {heroSlides.map((_, i) => (
              <button key={i} onClick={() => setHeroSlideIdx(i)}
                style={{
                  width: i === heroSlideIdx ? 22 : 5, height: 5, borderRadius: 3, padding: 0, border: 'none', cursor: 'pointer',
                  background: i === heroSlideIdx ? '#fff' : 'rgba(255,255,255,.35)',
                  transition: 'all 0.35s ease',
                  boxShadow: i === heroSlideIdx ? '0 0 8px rgba(255,255,255,.5)' : 'none',
                }}
              />
            ))}
          </div>
        )}

        <motion.div className="absolute right-6 bottom-8 flex flex-col items-center gap-2 hidden sm:flex"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}>
          <span className="lux-overline" style={{ color: 'rgba(255,255,255,.3)', fontSize: 9 }}>SCROLL</span>
          <div style={{ width: 1, height: 44, background: 'linear-gradient(to bottom,rgba(255,255,255,.35),transparent)' }} />
        </motion.div>
      </motion.section>

      {/* ════ 2. STORY ════ */}
      <section className="lux-section" style={{ borderBottom: `1px solid ${dm.b04}` }}>
        <div style={{ maxWidth: 900 }}>
          <motion.p className="lux-overline mb-8" style={{ color: theme.p }}
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .6 }}>
            {salon.name}
          </motion.p>
          <motion.h2 className="lux-title" style={{ marginBottom: 32, color: dm.fg }}
            initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: .85, ease: [.22,1,.36,1] }}>
            More than a {BIZ_LABELS[salon.businessType] || 'visit'}.<br />
            <span style={{ color: dm.fg38 }}>A transformation.</span>
          </motion.h2>
          {salon.description && (
            <motion.p className="lux-body" style={{ color: dm.fg48, maxWidth: 560 }}
              initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: .15, duration: .7 }}>
              {salon.description}
            </motion.p>
          )}
          <motion.div className="flex flex-wrap" style={{ gap: 'clamp(20px,6vw,80px)', marginTop: 'clamp(28px,6vw,64px)' }}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: .25, duration: .7 }}>
            {[
              { val: avgRating || '—',  label: 'Rating' },
              { val: totalBookings >= 1000 ? `${(totalBookings/1000).toFixed(1)}k` : String(totalBookings), label: 'Happy Clients' },
              { val: String(services.length), label: 'Services' },
              { val: salon.experience ? `${salon.experience}+` : '—', label: 'Years' },
            ].map(({ val, label }) => (
              <div key={label}>
                <p style={{ fontSize: 'clamp(36px,4.5vw,60px)', fontWeight: 900, color: dm.fg, lineHeight: 1, letterSpacing: '-.04em' }}>{val}</p>
                <p className="lux-overline mt-2" style={{ color: dm.fg35 }}>{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════ 3. REELS ════ */}
      {salonVideoUrls.length > 0 && (
        <section style={{ paddingTop: 'clamp(64px,8vw,112px)', paddingBottom: 'clamp(64px,8vw,112px)', borderBottom: `1px solid ${dm.b04}` }}>
          <div style={{ padding: '0 clamp(20px,6vw,96px)', marginBottom: 'clamp(24px,4vw,40px)' }}>
            <motion.p className="lux-overline mb-3" style={{ color: theme.p }}
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>Our Reels</motion.p>
            <motion.h2 className="lux-title" style={{ color: dm.fg }}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .7 }}>
              Watch &amp; Explore
            </motion.h2>
          </div>
          <div ref={galleryTrackRef} className="lux-gallery-track" style={{ paddingLeft: 'clamp(20px,6vw,96px)', paddingRight: 'clamp(20px,6vw,96px)' }}>
            {salonVideoUrls.map((url, i) => {
              const thumbUrl = url.includes('/video/upload/')
                ? url.replace('/video/upload/', '/video/upload/w_800,h_560,c_fill,q_auto,f_jpg,vc_none/').replace(/\.(mp4|mov|avi|mkv|webm)(\?.*)?$/i, '.jpg')
                : '';
              return (
                <motion.div key={i} className="lux-gc"
                  style={{ width: 'clamp(180px,42vw,360px)', height: 'clamp(260px,60vw,560px)' }}
                  initial={{ opacity: 0, scale: .96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                  transition={{ delay: Math.min(i * .07, .35), duration: .6 }}
                  onClick={() => setVideoViewerIdx(i)}>
                  <div className="gcm" style={{ background: 'var(--t-bg-2)' }} />
                  {thumbUrl && <img src={thumbUrl} alt="" className="gcm" onError={e => { e.currentTarget.style.display='none'; }} />}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.25)' }}>
                      <Play className="w-6 h-6 text-white" fill="white" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4" style={{ background: 'linear-gradient(to top,rgba(0,0,0,.82) 0%,rgba(0,0,0,.50) 40%,rgba(0,0,0,.15) 70%,transparent 100%)' }}>
                    <span className="lux-overline" style={{ color: 'rgba(255,255,255,.55)', fontSize: 9 }}>▶ REEL {i + 1}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* ════ 4. SERVICES ════ */}
      <section id="lux-services" className="lux-section" style={{ borderBottom: `1px solid ${dm.b04}` }}>

        {/* [A] Header + List/Grid toggle */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div>
            <motion.p className="lux-overline mb-2" style={{ color: theme.p }} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>Services</motion.p>
            <motion.h2 className="lux-title" style={{ color: dm.fg }} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .7 }}>
              What would you like today? ✂️
            </motion.h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: dm.b07, borderRadius: 8, padding: 4, flexShrink: 0, alignSelf: 'flex-start', marginTop: 4 }}>
            <button onClick={() => setServiceView('list')} style={{ padding: '7px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: serviceView === 'list' ? dm.card : 'transparent', color: serviceView === 'list' ? dm.fg : dm.fg40, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, boxShadow: serviceView === 'list' ? '0 1px 4px rgba(0,0,0,.12)' : 'none', transition: 'all .2s' }}>
              <LayoutList style={{ width: 14, height: 14 }} /> List
            </button>
            <button onClick={() => setServiceView('grid')} style={{ padding: '7px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: serviceView === 'grid' ? dm.card : 'transparent', color: serviceView === 'grid' ? dm.fg : dm.fg40, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, boxShadow: serviceView === 'grid' ? '0 1px 4px rgba(0,0,0,.12)' : 'none', transition: 'all .2s' }}>
              <LayoutGrid style={{ width: 14, height: 14 }} /> Grid
            </button>
          </div>
        </div>

        {/* [B] Filter + Favorites bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24, alignItems: 'center' }}>
          {salon.servedGender === 'unisex' && services.length > 0 && (
            <>
              {[{ key: 'all', label: 'All' }, { key: 'male', label: 'Men' }, { key: 'female', label: 'Women' }].map(({ key, label }) => (
                <button key={key} onClick={() => setServiceGenderFilter(key)} className="lux-overline"
                  style={serviceGenderFilter === key
                    ? { background: theme.p, color: '#fff', border: `1px solid ${theme.p}`, padding: '8px 18px', borderRadius: 999 }
                    : { color: dm.fg40, border: `1px solid ${dm.b12}`, background: 'transparent', padding: '8px 18px', borderRadius: 999 }}>
                  {label}
                </button>
              ))}
              <span style={{ width: 1, height: 20, background: dm.b12, flexShrink: 0 }} />
            </>
          )}
          <button onClick={() => setShowFavsOnly(v => !v)} className="lux-overline"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 999, border: `1px solid ${showFavsOnly ? theme.p : dm.b12}`, background: showFavsOnly ? `${theme.p}15` : 'transparent', color: showFavsOnly ? theme.p : dm.fg40 }}>
            <Heart style={{ width: 12, height: 12, fill: showFavsOnly ? theme.p : 'none', color: showFavsOnly ? theme.p : dm.fg40 }} />
            Favourites{favServices.length > 0 ? ` (${favServices.length})` : ''}
          </button>
        </div>

        {/* [C] Offer strip */}
        {allOffers.length > 0 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 20, scrollbarWidth: 'none' }}>
            {allOffers.map((offer) => {
              const isEligible = totalPrice >= (offer.minAmount || 0);
              const saveAmt = offer.discountType === 'percentage' ? Math.round((offer.minAmount || 300) * offer.discountValue / 100) : offer.discountValue;
              return (
                <button key={offer.code} onClick={() => { setCouponInput(offer.code); openBooking(); }}
                  style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999, border: `1px solid ${isEligible ? '#10b981' : dm.b12}`, background: isEligible ? 'rgba(16,185,129,.12)' : dm.b05, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: isEligible ? '#10b981' : dm.fg55, whiteSpace: 'nowrap' }}>
                  {isEligible ? <Check style={{ width: 11, height: 11 }} /> : <Tag style={{ width: 11, height: 11 }} />}
                  {isEligible ? `✓ Eligible! Use ${offer.code}` : `${offer.code} — save ₹${saveAmt} on ₹${offer.minAmount}+`}
                </button>
              );
            })}
          </div>
        )}

        {/* [D] Membership/savings upsell banner */}
        {!membershipDismissed && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderRadius: 10, background: offerGap && offerGap.gap < 600 ? 'rgba(251,191,36,.08)' : `${theme.p}08`, border: `1px solid ${offerGap && offerGap.gap < 600 ? 'rgba(251,191,36,.25)' : `${theme.p}20`}`, marginBottom: 24 }}>
            <p style={{ fontSize: 13, color: offerGap && offerGap.gap < 600 ? '#fbbf24' : dm.fg55, fontWeight: 600 }}>
              {offerGap && offerGap.gap < 600
                ? `🛒 Add ₹${offerGap.gap} more in services → save ₹${offerGap.discount} with ${offerGap.offer.code}`
                : '👑 Save more with a membership — priority booking & exclusive discounts'}
            </p>
            <button onClick={() => { setMembershipDismissed(true); localStorage.setItem('svc_membership_dismissed', '1'); }}
              style={{ fontSize: 11, color: dm.fg35, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, fontWeight: 600 }}>
              Skip
            </button>
          </div>
        )}

        {/* [E] Quick Rebook */}
        {quickRebook.length > 0 && (
          <div style={{ padding: '14px 16px', borderRadius: 10, background: `${theme.p}08`, border: `1px solid ${theme.p}18`, marginBottom: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: dm.fg55, marginBottom: 10 }}>Welcome back! Pick up where you left off</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {quickRebook.map(s => (
                <span key={s._id} style={{ padding: '5px 12px', borderRadius: 999, background: dm.b07, border: `1px solid ${dm.b12}`, fontSize: 12, color: dm.fg55, fontWeight: 600 }}>
                  {s.name} ₹{s.basePrice || s.price || 0}
                </span>
              ))}
              <motion.button whileTap={{ scale: .96 }} onClick={() => { setSelectedServices(quickRebook); openBooking(); }}
                style={{ padding: '6px 16px', borderRadius: 999, background: theme.p, color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Repeat2 style={{ width: 12, height: 12 }} /> Book Again
              </motion.button>
            </div>
          </div>
        )}

        {/* [F] Trending strip */}
        {services.some(s => (s.bookingCount || 0) > 0) && (
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: dm.fg45, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Flame style={{ width: 13, height: 13, color: '#f97316' }} /> Hot right now 🔥
            </p>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {[...services].filter(s => (s.bookingCount||0) > 0).sort((a,b) => (b.bookingCount||0) - (a.bookingCount||0)).slice(0, 8).map(s => (
                <button key={s._id} onClick={() => toggleService(s)}
                  style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 999, border: `1px solid ${selectedServices.some(x => x._id === s._id) ? theme.p : dm.b14}`, background: selectedServices.some(x => x._id === s._id) ? `${theme.p}18` : dm.b05, color: selectedServices.some(x => x._id === s._id) ? theme.p : dm.fg55, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {s.name} <span style={{ color: dm.fg35 }}>{s.bookingCount}+</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Skeleton while loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ display:'flex', gap:12, alignItems:'center', padding:'14px 0' }}>
                <div style={{ width:48, height:48, borderRadius:12, background:dm.b07, animation:'pulse 1.5s ease infinite' }} />
                <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
                  <div style={{ width:'55%', height:14, borderRadius:6, background:dm.b07, animation:'pulse 1.5s ease infinite' }} />
                  <div style={{ width:'35%', height:10, borderRadius:6, background:dm.b05, animation:'pulse 1.5s ease infinite' }} />
                </div>
                <div style={{ width:48, height:20, borderRadius:6, background:dm.b07, animation:'pulse 1.5s ease infinite' }} />
              </div>
            ))}
          </div>
        )}

        {/* [G] Category accordion / grid */}
        {services.length === 0 && !loading
          ? <p style={{ color: dm.fg30 }}>No services listed yet.</p>
          : (() => {
              const isUnisex = salon.servedGender === 'unisex';
              const classifySvc = (s) => {
                const af = s.applicableFor || [];
                if (af.length > 0 && af.includes('male') && !af.includes('female')) return 'male';
                if (af.length > 0 && af.includes('female') && !af.includes('male')) return 'female';
                const uniCat = UNISEX_CATEGORIES.find(u => u.label === (s.category || ''));
                if (uniCat) {
                  const inM = new Set(uniCat.maleSubServices).has(s.name);
                  const inF = new Set(uniCat.femaleSubServices).has(s.name);
                  if (inM && !inF) return 'male';
                  if (inF && !inM) return 'female';
                }
                return 'both';
              };
              let visibleServices = !isUnisex || serviceGenderFilter === 'all'
                ? services
                : services.filter(s => {
                    const cat = s.category || '';
                    if (serviceGenderFilter === 'female' && MALE_ONLY_CAT_LABELS.has(cat)) return false;
                    if (serviceGenderFilter === 'male' && FEMALE_ONLY_CAT_LABELS.has(cat)) return false;
                    const g = classifySvc(s);
                    return g === 'both' || g === serviceGenderFilter;
                  });
              if (showFavsOnly) {
                visibleServices = visibleServices.filter(s => favServices.includes(s._id));
                if (visibleServices.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: dm.fg30 }}>
                      <Heart style={{ width: 32, height: 32, margin: '0 auto 12px', opacity: .4, display: 'block' }} />
                      <p>Heart services you love ♥</p>
                    </div>
                  );
                }
              }
              const grouped = visibleServices.reduce((acc, svc) => {
                const cat = svc.category || 'Other';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(svc);
                return acc;
              }, {});
              const bizCategoryOrder = getCategoryOrderForBusinessType(salon.businessType, salon.servedGender);
              const sortedEntries = Object.entries(grouped).sort(([a], [b]) => {
                const boostDiff = catSortBoost(a) - catSortBoost(b);
                if (boostDiff !== 0) return boostDiff;
                const ai = bizCategoryOrder.indexOf(a), bi = bizCategoryOrder.indexOf(b);
                if (ai === -1 && bi === -1) return a.localeCompare(b);
                if (ai === -1) return 1; if (bi === -1) return -1;
                return ai - bi;
              });

              if (serviceView === 'grid') {
                return (
                  <div>
                    {sortedEntries.map(([cat, catServices], ci) => {
                      const CatIcon = CAT_ICON_COMPONENTS[cat] || Sparkles;
                      const recId = getRecommended(catServices);
                      const ordered = recId ? [catServices.find(s => s._id === recId), ...catServices.filter(s => s._id !== recId)] : catServices;
                      const isOpen = expandedCats.has('__all__') || expandedCats.has(cat);
                      const minPrice = Math.min(...catServices.map(s => s.basePrice || s.price || 0));
                      const toggleCat = () => {
                        setCatClickCounts(prev => ({ ...prev, [cat]: (prev[cat] || 0) + 1 }));
                        setExpandedCats(prev => { const next = new Set(prev); next.delete('__all__'); if (next.has(cat)) next.delete(cat); else next.add(cat); return next; });
                      };
                      return (
                        <motion.div key={cat} className="lux-svc-cat" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(ci * .05, .3), duration: .5 }}>
                          <button onClick={toggleCat} className="lux-cat-header w-full text-left" style={{ padding: 'clamp(14px,2vw,22px) 0', transition: 'opacity .2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                            <div className="lux-cat-left">
                              <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: `${theme.p}18`, border: `1px solid ${theme.p}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CatIcon style={{ width: 18, height: 18, color: theme.p, strokeWidth: 1.8 }} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <p className="lux-svc-name" style={{ fontSize: 'clamp(15px,2.2vw,22px)', fontWeight: 800, color: dm.fg, letterSpacing: '-.015em' }}>{cat}</p>
                                <p className="lux-overline mt-1" style={{ color: dm.fg28 }}>{catServices.length} service{catServices.length !== 1 ? 's' : ''}</p>
                              </div>
                            </div>
                            <div className="lux-cat-right">
                              <span style={{ fontSize: 'clamp(12px,1.5vw,15px)', fontWeight: 700, color: theme.p, whiteSpace: 'nowrap' }}>from ₹{minPrice}</span>
                              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ border: `1px solid ${dm.b12}`, color: dm.fg45, flexShrink: 0 }}>
                                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </div>
                          </button>
                          <AnimatePresence>
                            {isOpen && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: .32 }} style={{ overflow: 'hidden', paddingBottom: 16 }}>
                                <div className="svc-grid">
                                  {ordered.map((s) => {
                                    if (!s) return null;
                                    const isSel = selectedServices.some(x => x._id === s._id);
                                    const isRec = s._id === recId;
                                    const badge = getBadge(s);
                                    const svcImgSrc = getServiceImage(s);
                                    const price = s.basePrice || s.price || 0;
                                    const isFav = favServices.includes(s._id);
                                    return (
                                      <div key={s._id} onClick={() => toggleService(s)}
                                        style={{ borderRadius: 12, overflow: 'hidden', cursor: 'pointer', border: isSel ? `2px solid ${theme.p}` : `1px solid ${dm.b07}`, boxShadow: isSel ? `0 0 20px ${theme.p}35` : 'none', transition: 'all .2s', background: dm.card }}>
                                        <div style={{ position: 'relative', aspectRatio: '4/3', background: dm.b07 }}>
                                          {svcImgSrc
                                            ? <img src={svcImgSrc} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0, transition: 'opacity .15s', display: 'block' }} onLoad={e => { e.currentTarget.style.opacity = '1'; }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg,${theme.p}15,${theme.p}05)` }}>
                                                <CatIcon style={{ width: 32, height: 32, color: theme.p, opacity: .5 }} />
                                              </div>
                                          }
                                          {badge && <span style={{ position: 'absolute', top: 8, left: 8, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: badge === 'Popular' ? theme.p : badge === 'Premium' ? '#7c3aed' : badge === 'Best Value' ? '#059669' : '#0891b2', color: '#fff' }}>{badge}</span>}
                                          <button onClick={toggleFav(s._id)} style={{ position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Heart style={{ width: 13, height: 13, color: isFav ? '#f43f5e' : '#fff', fill: isFav ? '#f43f5e' : 'none' }} />
                                          </button>
                                          {isSel && <div style={{ position: 'absolute', inset: 0, background: `${theme.p}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check style={{ width: 28, height: 28, color: theme.p }} /></div>}
                                        </div>
                                        <div style={{ padding: 'clamp(10px,1.2vw,16px) clamp(12px,1.4vw,18px)' }}>
                                          {isRec && <span style={{ fontSize: 'clamp(10px,0.85vw,12px)', fontWeight: 700, color: theme.p, display: 'block', marginBottom: 3 }}>⭐ Recommended</span>}
                                          <p style={{ fontSize: 'clamp(13px,1.1vw,16px)', fontWeight: 700, color: dm.fg, marginBottom: 2 }}>{s.name}</p>
                                          <p style={{ fontSize: 'clamp(11px,0.85vw,13px)', color: dm.fg35 }}>{s.duration ? `${s.duration} min` : ''}{(s.bookingCount||0) > 0 && ` · ${s.bookingCount}+ booked`}</p>
                                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                                            <div>
                                              <span style={{ fontSize: 'clamp(11px,0.85vw,13px)', color: dm.fg28, textDecoration: 'line-through', marginRight: 4 }}>₹{Math.round(price * 1.12)}</span>
                                              <span style={{ fontSize: 'clamp(14px,1.2vw,17px)', fontWeight: 800, color: dm.fg }}>₹{price}</span>
                                            </div>
                                            <motion.button whileTap={{ scale: .88 }} onClick={e => { e.stopPropagation(); toggleService(s); }}
                                              style={{ width: 'clamp(28px,2vw,34px)', height: 'clamp(28px,2vw,34px)', borderRadius: '50%', border: 'none', cursor: 'pointer', background: isSel ? theme.p : dm.b12, color: isSel ? '#fff' : dm.fg55, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                                              {isSel ? <Check style={{ width: 13, height: 13 }} /> : '+'}
                                            </motion.button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              }

              // LIST VIEW — Zomato/Zepto style
              return (
                <div>
                  {sortedEntries.map(([cat, catServices], ci) => {
                    const isOpen = expandedCats.has('__all__') || expandedCats.has(cat);
                    const CatIcon = CAT_ICON_COMPONENTS[cat] || Sparkles;
                    const recId = getRecommended(catServices);
                    const ordered = recId ? [catServices.find(s => s._id === recId), ...catServices.filter(s => s._id !== recId)] : catServices;
                    const toggleCat = () => {
                      setCatClickCounts(prev => ({ ...prev, [cat]: (prev[cat] || 0) + 1 }));
                      setExpandedCats(prev => { const next = new Set(prev); next.delete('__all__'); if (next.has(cat)) next.delete(cat); else next.add(cat); return next; });
                    };
                    return (
                      <motion.div key={cat} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(ci * .05, .25), duration: .45 }}
                        style={{ marginBottom: 4, borderRadius: 16, overflow: 'hidden', border: `1px solid ${dm.b07}`, background: dm.card }}>

                        {/* Category header */}
                        <button onClick={toggleCat} className="w-full text-left"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', background: 'none', border: 'none', cursor: 'pointer', gap: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: `${theme.p}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <CatIcon style={{ width: 17, height: 17, color: theme.p, strokeWidth: 2 }} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: 15, fontWeight: 800, color: dm.fg, letterSpacing: '-.01em', lineHeight: 1.2 }}>{cat}</p>
                              <p style={{ fontSize: 11, color: dm.fg35, fontWeight: 500, marginTop: 1 }}>{catServices.length} service{catServices.length !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: theme.p }}>from ₹{Math.min(...catServices.map(s => s.basePrice || s.price || 0))}</span>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', border: `1.5px solid ${dm.b14}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: dm.fg45 }}>
                              {isOpen ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
                            </div>
                          </div>
                        </button>

                        {/* Service rows */}
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: .28 }} style={{ overflow: 'hidden' }}>
                              {ordered.map((s, svcIdx) => {
                                if (!s) return null;
                                const isSel = selectedServices.some(x => x._id === s._id);
                                const isRec = s._id === recId;
                                const badge = getBadge(s);
                                const svcImgSrc = getServiceImage(s);
                                const isFav = favServices.includes(s._id);
                                const price = s.basePrice || s.price || 0;
                                const isFast = (s.duration || 0) > 0 && (s.duration || 0) <= 20;
                                const isTopBooked = topBookingCount > 0 && s.bookingCount === topBookingCount;
                                return (
                                  <div key={s._id}
                                    style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 18px', borderTop: `1px solid ${dm.b06}`, cursor: 'pointer', transition: 'background .15s', background: isSel ? `${theme.p}08` : 'transparent', position: 'relative' }}
                                    onClick={() => toggleService(s)}
                                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = dm.b04; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = isSel ? `${theme.p}08` : 'transparent'; }}>

                                    {/* Left accent bar when selected */}
                                    {isSel && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: theme.p, borderRadius: '0 2px 2px 0' }} />}

                                    {/* Text content */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      {/* Badges row */}
                                      {(isRec || badge || isFast || isTopBooked) && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                                          {isRec && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: `${theme.p}20`, color: theme.p }}>⭐ Recommended</span>}
                                          {badge && !isRec && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                                            background: badge === 'Popular' ? `${theme.p}15` : badge === 'Premium' ? 'rgba(124,58,237,.15)' : badge === 'Best Value' ? 'rgba(5,150,105,.15)' : 'rgba(8,145,178,.15)',
                                            color: badge === 'Popular' ? theme.p : badge === 'Premium' ? '#7c3aed' : badge === 'Best Value' ? '#059669' : '#0891b2' }}>{badge}</span>}
                                          {isFast && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'rgba(6,182,212,.12)', color: '#06b6d4' }}>⚡ Quick</span>}
                                          {isTopBooked && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'rgba(217,119,6,.12)', color: '#d97706' }}>🏆 #1 Choice</span>}
                                        </div>
                                      )}

                                      {/* Name */}
                                      <p style={{ fontSize: 15, fontWeight: 700, color: dm.fg, lineHeight: 1.3, marginBottom: 5 }}>{s.name}</p>

                                      {/* Rating + duration row */}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                                        {(s.bookingCount || 0) > 0 && (
                                          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: '#22c55e' }}>
                                            <span style={{ fontSize: 10 }}>★</span>
                                            4.{5 + Math.min((s.bookingCount || 0) % 4, 3)}
                                            <span style={{ color: dm.fg35, fontWeight: 400 }}>({s.bookingCount}+)</span>
                                          </span>
                                        )}
                                        {s.duration > 0 && (
                                          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: dm.fg40 }}>
                                            <span>⏱</span> {s.duration} min
                                          </span>
                                        )}
                                        {s.applicableFor?.length === 1 && (
                                          <span style={{ fontSize: 11, color: dm.fg35 }}>{s.applicableFor[0] === 'male' ? '♂ Men' : '♀ Women'}</span>
                                        )}
                                      </div>

                                      {/* Description if exists */}
                                      {s.description && (
                                        <p style={{ fontSize: 12, color: dm.fg35, lineHeight: 1.5, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.description}</p>
                                      )}

                                      {/* Price row */}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 16, fontWeight: 800, color: dm.fg, letterSpacing: '-.02em' }}>₹{price}</span>
                                        {isSel && nextAvailableSlot && (
                                          <span style={{ fontSize: 11, color: theme.p, fontWeight: 600 }}>· Next: {nextAvailableSlot}</span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Right: image + ADD button */}
                                    <div style={{ flexShrink: 0, position: 'relative', width: 96, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                      {/* Fav button */}
                                      <button
                                        style={{ position: 'absolute', top: 4, right: 4, zIndex: 2, width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.35)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        onClick={e => { e.stopPropagation(); toggleFav(s._id)(e); }}>
                                        <Heart style={{ width: 11, height: 11, color: isFav ? '#f43f5e' : '#fff', fill: isFav ? '#f43f5e' : 'none' }} />
                                      </button>

                                      {/* Image */}
                                      <div style={{ width: 96, height: 86, borderRadius: 12, overflow: 'hidden', background: `linear-gradient(135deg,${theme.p}15,${theme.p}05)`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${dm.b08}` }}>
                                        {svcImgSrc
                                          ? <img src={svcImgSrc} alt={s.name} loading={svcIdx < 4 ? 'eager' : 'lazy'}
                                              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0, transition: 'opacity .2s' }}
                                              onLoad={e => { e.currentTarget.style.opacity = '1'; }}
                                              onError={e => { e.currentTarget.parentNode.style.background = `linear-gradient(135deg,${theme.p}12,${theme.p}04)`; e.currentTarget.style.display = 'none'; }} />
                                          : <CatIcon style={{ width: 26, height: 26, color: theme.p, opacity: .45 }} />
                                        }
                                      </div>

                                      {/* ADD / ✓ button */}
                                      <motion.button whileTap={{ scale: .88 }}
                                        onClick={e => { e.stopPropagation(); toggleService(s); }}
                                        style={{
                                          width: 80, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 13, letterSpacing: '.02em',
                                          background: isSel ? theme.p : dm.card,
                                          color: isSel ? '#fff' : theme.p,
                                          boxShadow: isSel ? `0 2px 12px ${theme.p}40` : `0 0 0 1.5px ${theme.p}`,
                                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                          transition: 'all .18s',
                                        }}>
                                        {isSel ? <><Check style={{ width: 13, height: 13 }} /> ADDED</> : '+ ADD'}
                                      </motion.button>
                                    </div>
                                  </div>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              );
            })()
        }
      </section>

      {/* ════ 5. OFFERS ════ */}
      {allOffers.length > 0 && (
        <section className="lux-section" style={{ paddingTop: 'clamp(60px,7vw,100px)', paddingBottom: 'clamp(60px,7vw,100px)', borderBottom: `1px solid ${dm.b04}` }}>
          <motion.p className="lux-overline mb-6" style={{ color: theme.p }}
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>Exclusive Offers</motion.p>
          <div className="flex flex-wrap gap-4">
            {allOffers.map((offer, i) => {
              const lbl = offer.discountType === 'percentage' ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`;
              return (
                <motion.button key={offer.code}
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * .08 }}
                  whileTap={{ scale: .97 }} whileHover={{ y: -2 }}
                  onClick={() => { setCouponInput(offer.code); if (!showBooking) openBooking(); }}
                  className="flex items-center gap-5 px-7 py-5 text-left"
                  style={{ border: `1px solid ${theme.p}35`, background: `${theme.p}08`, borderRadius: 2, minWidth: 200 }}>
                  <div>
                    <p style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 900, color: theme.p, letterSpacing: '-.025em', lineHeight: 1 }}>{lbl}</p>
                    <p className="lux-overline mt-2" style={{ color: dm.fg45 }}>{offer.code}</p>
                    {offer.minAmount > 0 && <p style={{ fontSize: 12, color: dm.fg28, marginTop: 4 }}>On orders ₹{offer.minAmount}+</p>}
                  </div>
                  <ChevronRight className="w-5 h-5 ml-auto shrink-0" style={{ color: dm.fg25 }} />
                </motion.button>
              );
            })}
          </div>
        </section>
      )}

      {/* ════ 6. PACKAGES ════ */}
      {packages.length > 0 && (
        <section className="lux-section" style={{ borderBottom: `1px solid ${dm.b04}` }}>
          <motion.p className="lux-overline mb-4" style={{ color: theme.p }}
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>Packages & Memberships</motion.p>
          <motion.h2 className="lux-title mb-12" style={{ color: dm.fg }}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .7 }}>
            Curated Packages
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {packages.map((pkg, i) => (
              <motion.div key={pkg._id} className="lux-pkg-card"
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: Math.min(i * .08, .4), duration: .6 }}>
                <div className="flex items-start gap-3 mb-6">
                  <span style={{ fontSize: 32 }}>{pkg.icon || (pkg.type === 'package' ? '🎁' : '💳')}</span>
                  <div className="flex-1">
                    {pkg.tag && <p className="lux-overline mb-2" style={{ color: theme.p }}>{pkg.tag === 'popular' ? 'Most Popular' : pkg.tag === 'recommended' ? 'Recommended' : 'Best Value'}</p>}
                    <h3 style={{ fontSize: 'clamp(17px,1.8vw,21px)', fontWeight: 800, color: dm.fg, letterSpacing: '-.015em' }}>{pkg.name}</h3>
                    {pkg.description && <p style={{ fontSize: 13, color: dm.fg38, marginTop: 5, lineHeight: 1.55 }}>{pkg.description}</p>}
                  </div>
                </div>
                {pkg.services?.length > 0 && (
                  <div className="mb-6" style={{ borderTop: `1px solid ${dm.b05}`, paddingTop: 16 }}>
                    {pkg.services.map((s, j) => (
                      <div key={j} className="flex items-center gap-2.5 py-2" style={{ borderBottom: `1px solid ${dm.b03}` }}>
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: theme.p }} />
                        <span style={{ fontSize: 13, color: dm.fg55 }}>{s.serviceName}</span>
                      </div>
                    ))}
                  </div>
                )}
                {pkg.benefits && (
                  <div className="mb-6 space-y-2">
                    {pkg.benefits.discountPercent > 0 && <div className="flex items-center gap-2 text-sm" style={{ color: dm.fg45 }}><Check className="w-3.5 h-3.5 shrink-0" style={{ color: theme.p }} />{pkg.benefits.discountPercent}% off all services</div>}
                    {pkg.benefits.priorityBooking && <div className="flex items-center gap-2 text-sm" style={{ color: dm.fg45 }}><Zap className="w-3.5 h-3.5 shrink-0" style={{ color: theme.p }} />Priority booking</div>}
                    {(pkg.benefits.freeServices || []).map((fs, j) => (
                      <div key={j} className="flex items-center gap-2 text-sm" style={{ color: dm.fg45 }}><Check className="w-3.5 h-3.5 shrink-0" style={{ color: theme.p }} />{fs.serviceName} × {fs.usageLimit}</div>
                    ))}
                  </div>
                )}
                <div className="flex items-end justify-between mt-auto pt-5" style={{ borderTop: `1px solid ${dm.b05}` }}>
                  <div>
                    <p style={{ fontSize: 'clamp(26px,3vw,36px)', fontWeight: 900, color: dm.fg, letterSpacing: '-.04em', lineHeight: 1 }}>₹{pkg.discountedPrice || pkg.price}</p>
                    {pkg.type === 'membership' && <p style={{ fontSize: 12, color: dm.fg32, marginTop: 3 }}>/{pkg.billingCycle === 'monthly' ? 'month' : pkg.billingCycle === 'quarterly' ? 'quarter' : 'year'}</p>}
                    {pkg.originalPrice > 0 && pkg.originalPrice !== pkg.discountedPrice && <p style={{ fontSize: 12, color: dm.fg28, marginTop: 2 }}><span className="line-through">₹{pkg.originalPrice}</span> · {pkg.discountPercent}% off</p>}
                  </div>
                  <motion.button whileTap={{ scale: .96 }} whileHover={{ scale: 1.02 }}
                    onClick={() => { if (!isCustomer()) { navigate('/login'); return; } setPkgReqModal(pkg); setPkgNote(''); }}
                    className="lux-btn-p" style={{ background: theme.p, boxShadow: `0 4px 20px ${theme.p}40`, fontSize: 11, padding: '12px 24px' }}>
                    {pkg.type === 'package' ? 'Buy Now' : 'Subscribe'}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ════ 7. OWNER ════ */}
      {(salon.ownerName || salon.ownerPhoto) && (
        <section style={{ borderBottom: `1px solid ${dm.b04}` }}>
          <div className="lux-split">
            {/* Left: auto-sliding business photos */}
            <div className="relative overflow-hidden" style={{ minHeight: 'clamp(260px,55vw,480px)' }}>
              {salonPhotoUrls.length > 0 ? (
                <>
                  {salonPhotoUrls.map((url, i) => (
                    <div key={i} style={{
                      position: 'absolute', inset: 0,
                      opacity: i === photoSlideIdx % salonPhotoUrls.length ? 1 : 0,
                      transition: 'opacity 1.1s ease',
                      pointerEvents: 'none',
                    }}>
                      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'contrast(1.06) saturate(1.08)', transition: 'transform 8s ease' }} />
                    </div>
                  ))}
                  {/* dot indicators */}
                  {salonPhotoUrls.length > 1 && (
                    <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5, zIndex: 5 }}>
                      {salonPhotoUrls.map((_, i) => (
                        <button key={i} onClick={() => setPhotoSlideIdx(i)}
                          style={{ width: i === photoSlideIdx % salonPhotoUrls.length ? 18 : 5, height: 5, borderRadius: 3, border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.3s ease', background: i === photoSlideIdx % salonPhotoUrls.length ? '#fff' : 'rgba(255,255,255,.35)' }} />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-8xl" style={{ background: `linear-gradient(135deg,${theme.p}18,${theme.p}33)` }}>🧑‍🎨</div>
              )}
              <div className="absolute inset-0" style={{ background: dm.ownerOvr }} />
            </div>
            <div className="lux-section flex flex-col justify-center">
              <motion.p className="lux-overline mb-4" style={{ color: theme.p }}
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>Meet the founder</motion.p>
              <motion.h2 style={{ fontSize: 'clamp(30px,4vw,52px)', fontWeight: 900, color: dm.fg, lineHeight: 1.1, letterSpacing: '-.025em', marginBottom: 16 }}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .7 }}>
                {salon.ownerName || 'Our Owner'}
              </motion.h2>
              <div className="lux-divider" style={{ background: theme.p }} />
              <motion.p className="lux-body" style={{ color: dm.fg45, maxWidth: 440 }}
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: .15, duration: .7 }}>
                Founder &amp; Head Stylist. Passionate about creating transformative experiences that leave every client feeling their absolute best.
              </motion.p>
              {salon.experience > 0 && (
                <div style={{ marginTop: 40 }}>
                  <p style={{ fontSize: 'clamp(44px,5.5vw,72px)', fontWeight: 900, color: dm.fg, lineHeight: 1, letterSpacing: '-.045em' }}>{salon.experience}+</p>
                  <p className="lux-overline mt-2" style={{ color: dm.fg35 }}>Years of mastery</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ════ 8. REVIEWS ════ */}
      {reviews.length > 0 && (
        <section style={{ paddingTop: 'clamp(80px,10vw,140px)', paddingBottom: 'clamp(80px,10vw,140px)', borderBottom: `1px solid ${dm.b04}` }}>
          <div style={{ padding: '0 clamp(20px,6vw,96px)', marginBottom: 'clamp(28px,4vw,48px)' }}>
            <motion.p className="lux-overline mb-3" style={{ color: theme.p }}
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>Client Love</motion.p>
            <div className="flex items-end justify-between flex-wrap gap-4">
              <motion.h2 className="lux-title" style={{ color: dm.fg }}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .7 }}>
                {avgRating ? <><span style={{ color: theme.p }}>{avgRating}</span> out of 5</> : 'What clients say'}
              </motion.h2>
              <div className="flex items-center gap-4">
                <p style={{ fontSize: 14, color: dm.fg35 }}>{reviews.length} verified review{reviews.length !== 1 ? 's' : ''}</p>
                <button onClick={() => navigate(`${salonPath(salon)}/reviews`)}
                  style={{ fontSize: 13, fontWeight: 600, color: theme.p, background: 'none', border: `1px solid ${theme.p}55`, borderRadius: 999, padding: '5px 16px', cursor: 'pointer' }}>
                  See All
                </button>
              </div>
            </div>
          </div>
          <div ref={reviewTrackRef} className="lux-rev-track" style={{ gap: 1 }}>
            {reviews.map((r, i) => {
              const starRating = Math.round(r.salonRating || r.rating || 5);
              const name = r.customerId?.name || r.customerName || 'Guest';
              const avatarColors = ['#e94560','#8b5cf6','#10b981','#f59e0b','#38bdf8'];
              return (
                <motion.div key={r._id}
                  initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                  transition={{ delay: Math.min(i * .06, .35), duration: .6 }}
                  style={{ flexShrink: 0, width: 'clamp(260px,80vw,460px)', padding: 'clamp(20px,3vw,44px)', background: dm.card, border: `1px solid ${dm.cardBrd}`, scrollSnapAlign: 'start' }}>
                  <div className="flex mb-5">
                    {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: 16, color: s <= starRating ? '#fbbf24' : dm.b10 }}>★</span>)}
                  </div>
                  {r.comment && (
                    <p style={{ fontSize: 'clamp(14px,1.5vw,17px)', lineHeight: 1.8, color: dm.fg75, marginBottom: 28, display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      &ldquo;{r.comment}&rdquo;
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0"
                      style={{ background: avatarColors[i % avatarColors.length], fontSize: 15 }}>
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: dm.fg }}>{name}</p>
                      <p style={{ fontSize: 11, color: dm.fg30, letterSpacing: '.04em' }}>
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN',{ day:'2-digit',month:'short',year:'numeric' }) : ''}
                        {r.serviceId?.name && ` · ${r.serviceId.name}`}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* ════ 9. INFO ════ */}
      <section className="lux-section" style={{ borderBottom: `1px solid ${dm.b04}` }}>
        <div className="lux-split" style={{ gap: 'clamp(24px,6vw,100px)' }}>
          <div>
            <motion.p className="lux-overline mb-5" style={{ color: theme.p }}
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>Find Us</motion.p>
            {[
              (locality || salon.address || salon.city) && { icon: <MapPin className="w-4 h-4" />, text: [locality, salon.city, salon.address].filter(Boolean).join(', ') },
              salon.phone   && { icon: <Phone className="w-4 h-4" />, text: salon.phone, href: `tel:${salon.phone}` },
              salon.email   && { icon: <Mail className="w-4 h-4" />, text: salon.email, href: `mailto:${salon.email}` },
            ].filter(Boolean).map(({ icon, text, href }, i) => (
              <div key={i} className="lux-info-row">
                <div style={{ color: theme.p, marginTop: 1 }}>{icon}</div>
                {href
                  ? <a href={href} style={{ fontSize: 15, color: dm.fg65, textDecoration: 'none' }}
                      onMouseEnter={e => { e.currentTarget.style.color=dm.fg; }} onMouseLeave={e => { e.currentTarget.style.color=dm.fg65; }}>
                      {text}
                    </a>
                  : <p style={{ fontSize: 15, color: dm.fg65 }}>{text}</p>
                }
              </div>
            ))}
            {(salon.address || salon.city) && (
              <a href={`https://maps.google.com/?q=${encodeURIComponent(salon.address || salon.city)}`}
                target="_blank" rel="noreferrer" className="lux-btn-o inline-flex mt-7"
                style={{ fontSize: 11, padding: '11px 22px', color: dm.fg, border: `1px solid ${dm.b28}` }}>
                <Navigation className="w-3.5 h-3.5" /> Get Directions
              </a>
            )}
          </div>
          {salon.workingHours && (
            <div>
              <motion.p className="lux-overline mb-5" style={{ color: theme.p }}
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>Hours</motion.p>
              {["monday","tuesday","wednesday","thursday","friday","saturday","sunday"].map(day => {
                const h = salon.workingHours[day];
                if (!h) return null;
                const isToday = new Date().toLocaleDateString('en-US',{ weekday:'long' }).toLowerCase() === day;
                return (
                  <div key={day} className="lux-info-row"
                    style={{ background: isToday ? `${theme.p}08` : 'transparent', paddingLeft: isToday ? 12 : 0, paddingRight: isToday ? 12 : 0 }}>
                    <span className="capitalize flex-1" style={{ fontSize: 14, fontWeight: isToday ? 700 : 400, color: isToday ? dm.fg : dm.fg42 }}>
                      {isToday && <span style={{ color: theme.p }}>→ </span>}{day}
                    </span>
                    {h.isClosed
                      ? <span style={{ fontSize: 12, color: '#f87171', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' }}>Closed</span>
                      : <span style={{ fontSize: 14, color: isToday ? dm.fg : dm.fg50, fontWeight: isToday ? 700 : 400 }}>{h.open} – {h.close}</span>
                    }
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ════ 10. FINAL CTA ════ */}
      <section className="relative overflow-hidden flex items-center" style={{ minHeight: 'clamp(300px,55vh,900px)' }}>
        {salon.ctaPhoto || salonPhotoUrls[1] || salonPhotoUrls[0]
          ? <img src={salon.ctaPhoto || salonPhotoUrls[1] || salonPhotoUrls[0]} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'brightness(.35) saturate(.70) contrast(1.1)' }} />
          : <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 65% 55% at 30% 50%, ${theme.p}30 0%, transparent 60%), radial-gradient(ellipse 50% 60% at 75% 50%, rgba(139,92,246,0.20) 0%, transparent 55%), var(--t-bg)` }} />
        }
        <div className="absolute inset-0" style={{ background: dm.ctaOvr }} />
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg,${theme.p}14 0%,transparent 55%)` }} />
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.035, backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundRepeat: 'repeat', backgroundSize: '200px 200px', mixBlendMode: 'overlay' }} />
        <div className="relative z-10 lux-section">
          <motion.p className="lux-overline mb-6" style={{ color: theme.p }}
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>{salon.name}</motion.p>
          <motion.h2 style={{ fontSize: 'clamp(28px,6vw,88px)', fontWeight: 900, lineHeight: 1, letterSpacing: '-.04em', marginBottom: 'clamp(24px,4vw,36px)', maxWidth: 680, color: dm.fg }}
            initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: .85, ease: [.22,1,.36,1] }}>
            Ready for your<br />transformation?
          </motion.h2>
          <motion.div className="flex flex-wrap gap-4"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: .2, duration: .7 }}>
            <motion.button whileTap={{ scale: .97 }} whileHover={{ scale: 1.02 }} onClick={handleSmartBook}
              className="lux-btn-p" style={{ background: theme.p, boxShadow: `0 12px 40px ${theme.p}50`, fontSize: 'clamp(11px,2.5vw,13px)', padding: 'clamp(13px,3vw,17px) clamp(22px,5vw,42px)' }}>
              <Zap className="w-4 h-4" /> Book Now
            </motion.button>
            {salon.phone && (
              <motion.a whileTap={{ scale: .97 }} href={`tel:${salon.phone}`}
                className="lux-btn-o" style={{ fontSize: 'clamp(11px,2.5vw,13px)', padding: 'clamp(13px,3vw,17px) clamp(22px,5vw,42px)', color: dm.fg, border: `1px solid ${dm.b28}` }}>
                <Phone className="w-4 h-4" /> Call Us
              </motion.a>
            )}
          </motion.div>
        </div>
      </section>

      {/* ════ STICKY BOOKING BAR (unified — combo suggestions inside) ════ */}
      <AnimatePresence>
        {selectedServices.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-40 md:bottom-4 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl md:rounded-2xl overflow-hidden"
            style={{ background: dm.barBg, borderTop: `1px solid ${theme.p}22`, boxShadow: `0 -12px 48px rgba(0,0,0,.55),0 0 0 1px ${theme.p}12`, transition: 'background .3s', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>

            {/* Combo suggestions row — only when present */}
            <AnimatePresence>
              {comboSuggestions.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  style={{ borderBottom: `1px solid ${dm.b07}`, overflow: 'hidden' }}>
                  <div className="px-4 pt-2.5 pb-2">
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: dm.fg35, marginBottom: 6 }}>Complete your visit</p>
                    <div style={{ display: 'flex', gap: 7, overflowX: 'auto', scrollbarWidth: 'none' }}>
                      {comboSuggestions.map(s => (
                        <button key={s._id} onClick={() => toggleService(s)}
                          style={{ flexShrink: 0, padding: '4px 11px', borderRadius: 999, border: `1px solid ${theme.p}35`, background: `${theme.p}0d`, color: theme.p, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>
                          + {s.name} · ₹{s.basePrice || s.price || 0}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main booking row */}
            <div className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${theme.p}18` }}>
                  <ShoppingBag className="w-5 h-5" style={{ color: theme.p }} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm" style={{ color: dm.fg }}>{selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} · {totalDuration} min</p>
                  <p className="text-xs font-semibold" style={{ color: theme.p }}>₹{totalPrice}</p>
                  {bestOffer
                    ? <p style={{ fontSize: 10, color: '#10b981', fontWeight: 600, marginTop: 1 }}>🎫 Save ₹{bestOffer.discount} with {bestOffer.code}</p>
                    : offerGap
                      ? <p style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600, marginTop: 1 }}>Add ₹{offerGap.gap} more → save ₹{offerGap.discount}</p>
                      : null
                  }
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setSelectedServices([])} className="text-sm px-3 py-2" style={{ color: dm.fg40 }}>Clear</button>
                <motion.button whileTap={{ scale: .96 }} whileHover={{ scale: 1.03 }} onClick={handleBookNow}
                  className="lux-btn-p" style={{ background: theme.p, boxShadow: `0 4px 20px ${theme.p}45`, fontSize: 11, padding: '11px 22px' }}>
                  <Zap className="w-3.5 h-3.5" /> Book Now →
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════ VIDEO VIEWER ════ */}
      {videoViewerIdx !== null && salonVideoUrls.length > 0 && (
        <SalonVideoViewer videos={salonVideoUrls} startIdx={videoViewerIdx} salon={salon}
          onClose={() => setVideoViewerIdx(null)}
          onBook={() => { setVideoViewerIdx(null); setTimeout(() => document.getElementById('lux-services')?.scrollIntoView({ behavior: 'smooth' }), 80); }} />
      )}

      {/* ════ GALLERY LIGHTBOX ════ */}
      <AnimatePresence>
        {galleryLightbox !== null && galleryItems[galleryLightbox] && (() => {
          const lbItem = galleryItems[galleryLightbox];
          const isVideo = lbItem.type === 'video';
          const goPrev  = () => { galleryVideoRef.current?.pause(); setGalleryLightbox(n => n - 1); };
          const goNext  = () => { galleryVideoRef.current?.pause(); setGalleryLightbox(n => n + 1); };
          const closeLb = () => { galleryVideoRef.current?.pause(); setGalleryLightbox(null); };
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4" onClick={closeLb}>
              <button onClick={closeLb} className="absolute top-5 right-5 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white"><X className="w-5 h-5" /></button>
              <div className="absolute top-5 left-1/2 -translate-x-1/2 z-10">
                <span className="text-white text-sm font-semibold bg-white/10 px-3 py-1 rounded-full">{galleryLightbox + 1} / {galleryItems.length}</span>
              </div>
              <div className="max-w-4xl w-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                {isVideo
                  ? <video ref={galleryVideoRef} src={lbItem.url} controls autoPlay className="max-h-[80vh] max-w-full rounded-xl" />
                  : <img src={lbItem.url} alt="" className="max-h-[80vh] max-w-full rounded-xl object-contain" />
                }
              </div>
              {galleryLightbox > 0 && <button onClick={e => { e.stopPropagation(); goPrev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white"><ChevronLeft className="w-6 h-6" /></button>}
              {galleryLightbox < galleryItems.length - 1 && <button onClick={e => { e.stopPropagation(); goNext(); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white"><ChevronRight className="w-6 h-6" /></button>}
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ════ BOOKING DRAWER ════ */}
      {showBooking && (
        <div className="fixed inset-0 z-50 flex flex-col md:items-center md:justify-center"
          style={{ background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget && !bookingSuccess) setShowBooking(false); }}>
          <div className="mt-auto w-full max-h-[92vh] rounded-t-3xl flex flex-col md:mt-0 md:rounded-3xl md:max-w-xl md:max-h-[88vh]"
            style={{ background: dm.drawer, boxShadow: dm.drawerBrd, transition: 'background .3s' }}>
            {bookingSuccess ? (
              <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                  style={{ background: bookingStatus === 'pending' ? 'rgba(251,191,36,.15)' : 'rgba(34,197,94,.15)' }}>
                  {bookingStatus === 'pending' ? <span className="text-4xl">⏳</span> : <CheckCircle className="w-10 h-10" style={{ color: '#4ade80' }} />}
                </div>
                <h2 className="text-xl font-extrabold mb-1" style={{ color: dm.fg }}>{bookingStatus === 'pending' ? 'Booking Received!' : 'Booking Confirmed!'}</h2>
                {bookingStatus === 'pending' && (
                  <div className="rounded-xl px-4 py-2.5 mb-3 text-sm" style={{ background: 'rgba(251,191,36,.1)', color: '#fbbf24' }}>
                    Awaiting salon confirmation. You'll be notified once approved.
                  </div>
                )}
                <div className="rounded-2xl p-4 w-full mb-5 text-sm space-y-1.5" style={{ background: dm.card, border: `1px solid ${dm.b07}` }}>
                  <p className="font-bold" style={{ color: dm.fg }}>{salon.name}</p>
                  <p style={{ color: dm.fg55 }}>{selectedServices.map(s => s.name).join(' + ')}</p>
                  <p style={{ color: dm.fg35 }}>{formatDate(bookDate + 'T12:00:00')} · {slot}</p>
                  <p style={{ color: theme.p }}>₹{finalPrice} · Pay at salon</p>
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <button onClick={() => { setShowBooking(false); navigate('/dashboard'); }}
                    className="w-full py-3 font-bold text-white rounded-2xl" style={{ background: theme.p }}>View My Bookings</button>
                  <button onClick={() => { setShowBooking(false); navigate('/'); }}
                    className="w-full py-3 font-semibold rounded-2xl"
                    style={{ background: dm.formInp, color: dm.fg55, border: `1px solid ${dm.b10}` }}>
                    Browse More Salons
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-t-3xl pt-3 pb-4 px-5 relative overflow-hidden shrink-0"
                  style={{ background: `linear-gradient(135deg,${theme.p}dd,${theme.p}aa)`, boxShadow: `0 4px 24px ${theme.p}40` }}>
                  <div style={{ position:'absolute',top:-50,right:-30,width:150,height:150,borderRadius:'50%',background:'rgba(255,255,255,.07)',pointerEvents:'none' }} />
                  <div style={{ position:'absolute',top:-15,right:70,width:90,height:90,borderRadius:'50%',background:'rgba(255,255,255,.04)',pointerEvents:'none' }} />
                  <div className="w-10 h-1 rounded-full bg-white/30 mx-auto mb-4" />
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-extrabold text-white">Book Appointment</h2>
                      <p className="text-xs text-white/70 mt-0.5 truncate max-w-[220px]">
                        {salon.name}{selectedServices.length > 0 && ` · ${selectedServices.map(s => s.name).join(', ')}`}
                      </p>
                    </div>
                    <button onClick={() => setShowBooking(false)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,.15)' }}>
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                  {selectedServices.length > 0 && (
                    <div className="mt-3 flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,.12)' }}>
                      <Scissors className="w-4 h-4 text-white/70 shrink-0" />
                      <span className="text-xs text-white/80 font-semibold flex-1 truncate">{totalDuration} min · ₹{totalPrice}</span>
                    </div>
                  )}
                </div>

                <form onSubmit={handleConfirm} className="px-5 py-5 space-y-6 overflow-y-auto flex-1 min-h-0 pb-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold mb-3" style={{ color: dm.fg }}>
                      <Calendar className="w-4 h-4" style={{ color: theme.p }} /> Select Date
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {dateDays.map((d, i) => {
                        const active = bookDate === d;
                        const dateObj = new Date(d + 'T12:00:00');
                        const label = i === 0 ? 'Today' : i === 1 ? 'Tmrw' : null;
                        const labelColor = i === 0 ? '#4ade80' : '#fbbf24';
                        return (
                          <motion.button key={d} type="button" onClick={() => setBookDate(d)}
                            whileTap={{ scale: 0.93 }}
                            className="flex flex-col items-center justify-center rounded-2xl shrink-0"
                            style={{ width: 58, height: label ? 76 : 62, borderWidth: 1.5,
                              background: active ? theme.p : dm.formInp,
                              borderColor: active ? theme.p : dm.b10,
                              boxShadow: active ? `0 6px 18px ${theme.p}65` : 'none',
                              transform: active ? 'scale(1.1)' : 'scale(1)',
                              transition: 'all .2s ease' }}>
                            {label && <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.04em', color: active ? 'rgba(255,255,255,.9)' : labelColor, marginBottom: 1 }}>{label}</span>}
                            <span className="text-[10px] font-bold" style={{ color: active ? 'rgba(255,255,255,.8)' : dm.fg35 }}>{formatDay(d)}</span>
                            <span className="text-lg font-extrabold" style={{ color: active ? '#fff' : dm.fg75 }}>{dateObj.getDate()}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {barbers.length > 0 && (
                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold mb-3" style={{ color: dm.fg }}>
                        <User className="w-4 h-4" style={{ color: theme.p }} />
                        Select Stylist <span className="font-normal text-xs" style={{ color: dm.fg35 }}>(optional)</span>
                      </label>
                      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                        <button type="button" onClick={() => setBarberId('')} className="flex flex-col items-center gap-1.5 shrink-0 transition-all hover:scale-105">
                          <div className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold"
                            style={barberId === '' ? { background: theme.p, color: '#fff', boxShadow: `0 4px 12px ${theme.p}50` } : { background: dm.formInp, color: dm.fg55, border: `2px solid ${dm.b10}` }}>
                            Any
                          </div>
                          <span className="text-xs font-medium" style={{ color: barberId === '' ? theme.p : dm.fg45 }}>No Pref</span>
                        </button>
                        {barbers.map(b => (
                          <button key={b._id} type="button" onClick={() => setBarberId(b._id)} className="flex flex-col items-center gap-1.5 shrink-0 transition-all hover:scale-105">
                            <div className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden"
                              style={barberId === b._id ? { border: `3px solid ${theme.p}`, background: theme.p, color: '#fff', boxShadow: `0 4px 12px ${theme.p}50` } : { background: dm.formInp, color: dm.fg55, border: `2px solid ${dm.b10}` }}>
                              {b.photo ? <img src={b.photo} alt={b.name} className="w-full h-full object-cover" /> : (b.name?.charAt(0)?.toUpperCase() || '?')}
                            </div>
                            <span className="text-xs font-medium text-center max-w-[60px] truncate" style={{ color: barberId === b._id ? theme.p : dm.fg45 }}>{b.name}</span>
                            {b.experience > 0 && <span className="text-[10px]" style={{ color: dm.fg25, marginTop: -4 }}>{b.experience}yr</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold mb-3" style={{ color: dm.fg }}>
                      <Clock className="w-4 h-4" style={{ color: theme.p }} />
                      Select Time {totalDuration > 0 && <span className="font-normal text-xs" style={{ color: dm.fg35 }}>({totalDuration} min)</span>}
                    </label>
                    {slotsLoading ? (
                      <div className="flex items-center gap-2 py-4 text-sm" style={{ color: dm.fg40 }}>
                        <div className="w-4 h-4 rounded-full animate-spin" style={{ border: `2px solid ${dm.b10}`, borderTopColor: dm.fg80 }} /> Loading available slots…
                      </div>
                    ) : closedDay ? (
                      <div className="p-5 rounded-2xl text-center space-y-1" style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)' }}>
                        <p style={{ fontSize: 22 }}>🚫</p>
                        <p className="font-bold text-sm" style={{ color: '#f87171' }}>Salon is closed on this day</p>
                        <p className="text-xs" style={{ color: '#fca5a5' }}>Please pick another date from the calendar above</p>
                      </div>
                    ) : slots.length === 0 ? (
                      <div className="p-4 rounded-xl text-sm text-center" style={{ background: dm.formInp, color: dm.fg40 }}>
                        No available slots for this date.
                      </div>
                    ) : bookingMode === 'sequential' ? (
                      isPastSlot(bookDate, slots[0]) ? (
                        <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(251,191,36,.08)', border: '1px solid rgba(251,191,36,.25)' }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', marginBottom: 6 }}>⏰ Slot expired</p>
                          <p style={{ fontSize: 11, color: dm.fg40, marginBottom: 12 }}>This slot has passed. Tap below to find the next one.</p>
                          <button type="button" onClick={() => { setSlot(''); setSlotsKey(k => k + 1); }}
                            className="px-4 py-2 rounded-xl text-sm font-bold text-white"
                            style={{ background: theme.p }}>Find Next Slot</button>
                        </div>
                      ) : (
                        <>
                          <motion.div
                            animate={{ boxShadow: [`0 0 0px ${theme.p}00`, `0 0 14px ${theme.p}40`, `0 0 0px ${theme.p}00`] }}
                            transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                            className="rounded-xl p-4" style={{ background: `${theme.p}10`, border: `1px solid ${theme.p}30` }}>
                            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: dm.fg40, marginBottom: 6 }}>✨ Best available slot for you</p>
                            <p className="font-extrabold text-xl" style={{ color: theme.p, marginBottom: 4 }}>{slots[0]} – {addMinutes(slots[0], totalDuration)}</p>
                            <p style={{ fontSize: 11, color: dm.fg45, fontWeight: 500 }}>Perfectly fits your selected services</p>
                            <p style={{ fontSize: 10, color: dm.fg30, marginTop: 2 }}>No overlap • No waiting</p>
                          </motion.div>
                          <p style={{ fontSize: 10, fontWeight: 600, color: '#fbbf24', textAlign: 'center', marginTop: 6 }}>High demand — slots fill quickly today</p>
                        </>
                      )
                    ) : (
                      <>
                        <div className="flex items-center gap-4 mb-3 text-xs flex-wrap" style={{ color: dm.fg30 }}>
                          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ background: dm.b10 }} /> Past</span>
                          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-500/40" /> Booked</span>
                          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ background: theme.p }} /> Selected</span>
                          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ border: `1px solid ${dm.b14}` }} /> Available</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {slots.map(s => {
                            const past    = isPastSlot(bookDate, s);
                            const blocked = !past && blockedSlots.includes(s);
                            const selected = slot === s;
                            const endTime = addMinutes(s, totalDuration);
                            return (
                              <button key={s} type="button"
                                onClick={() => { if (past) { setSlotPopup('past'); return; } if (blocked) { setSlotPopup('booked'); return; } setSlot(s); }}
                                className="py-2 px-1 text-xs rounded-xl border transition-all font-medium text-center leading-tight hover:scale-[1.03]"
                                style={past    ? { background:dm.formInp,color:dm.fg28,borderColor:dm.b07,cursor:'not-allowed' }
                                      :blocked ? { background:'rgba(239,68,68,.08)',color:'#f87171',borderColor:'rgba(239,68,68,.2)',cursor:'not-allowed' }
                                      :selected? { background:theme.p,color:'#fff',borderColor:theme.p,boxShadow:`0 4px 12px ${theme.p}40` }
                                               : { background:dm.formInp,color:dm.fg65,borderColor:dm.b10 }}>
                                <span className="block">{s}</span>
                                <span className="block opacity-60">– {endTime}</span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex gap-4 flex-wrap">
                    {['Slot confirmed instantly', 'No waiting at salon', 'Pay after service'].map(t => (
                      <span key={t} style={{ fontSize: 11, color: '#4ade80', fontWeight: 600 }}>✔ {t}</span>
                    ))}
                  </div>

                  {slot && salon?.hasCoupons && (
                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold mb-3" style={{ color: dm.fg }}>
                        <Tag className="w-4 h-4" style={{ color: theme.p }} /> Have a coupon?
                      </label>
                      {appliedCoupon ? (
                        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)' }}>
                          <span className="font-medium" style={{ color: '#4ade80' }}>✓ {appliedCoupon.code} — ₹{couponDiscount} off</span>
                          <button type="button" onClick={removeCoupon} className="text-xs ml-2" style={{ color: '#f87171' }}>Remove</button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input type="text" value={couponInput}
                            onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                            placeholder="Enter coupon code" className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                            style={{ background: dm.formInp, border: `1px solid ${dm.formBrd}`, color: dm.fg }} />
                          <button type="button" onClick={applyCoupon} disabled={couponLoading || !couponInput.trim()}
                            className="px-4 py-2 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
                            style={{ background: theme.p }}>{couponLoading ? '…' : 'Apply'}</button>
                        </div>
                      )}
                      {couponError && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{couponError}</p>}
                    </div>
                  )}

                  {slot && (
                    <div className="rounded-2xl p-4 text-sm" style={{ background: dm.card, border: `1px solid ${dm.b07}` }}>
                      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide mb-3" style={{ color: theme.p }}>
                        <CreditCard className="w-3.5 h-3.5" /> Booking Summary
                      </p>
                      <div className="space-y-2">
                        {selectedServices.map(s => (
                          <div key={s._id} className="flex justify-between">
                            <span style={{ color: dm.fg55 }}>{s.name}</span>
                            <span className="font-semibold" style={{ color: dm.fg }}>₹{s.basePrice || s.price}</span>
                          </div>
                        ))}
                        <div className="flex justify-between">
                          <span style={{ color: dm.fg30 }}>Date & Time</span>
                          <span className="font-medium" style={{ color: dm.fg55 }}>{formatDate(bookDate + 'T12:00:00')} · {slot}</span>
                        </div>
                        {couponDiscount > 0 && (
                          <div className="flex justify-between" style={{ color: '#4ade80' }}>
                            <span>Discount ({appliedCoupon?.code})</span>
                            <span className="font-medium">−₹{couponDiscount}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center px-3 py-2.5 rounded-xl mt-2"
                          style={{ background: `${theme.p}12`, border: `1px solid ${theme.p}25` }}>
                          <span className="font-bold text-sm" style={{ color: dm.fg }}>Total · Pay at salon</span>
                          <span className="font-extrabold text-lg" style={{ color: theme.p }}>₹{finalPrice}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </form>

                <div className="shrink-0 px-5 py-4" style={{ borderTop: `1px solid ${dm.b07}`, background: dm.drawer, transition: 'background .3s' }}>
                  {bookError && <div className="mb-3 p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,.08)', color: '#f87171', border: '1px solid rgba(239,68,68,.2)' }}>{bookError}</div>}
                  {slot && !bookingLoading && (
                    <p className="text-center text-xs font-semibold mb-2" style={{ color: dm.fg45 }}>You're all set! Just one tap to confirm ✨</p>
                  )}
                  <button onClick={handleConfirm} disabled={bookingLoading || !slot || closedDay}
                    className="w-full py-3.5 text-base font-bold text-white rounded-2xl transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{ background: `linear-gradient(135deg,${theme.p},${theme.p}cc)`, boxShadow: slot && !closedDay ? `0 4px 20px ${theme.p}45` : 'none' }}>
                    {bookingLoading
                      ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 rounded-full animate-spin border-2 border-white/30 border-t-white" />Securing your slot…</span>
                      : closedDay ? 'Salon closed — pick another date'
                      : !slot ? 'Select a time slot' : 'Lock My Slot 🔒'}
                  </button>
                  <p className="text-center mt-2" style={{ fontSize: 10, color: dm.fg30 }}>Instant confirmation • No payment now</p>
                </div>
              </>
            )}
          </div>

          {slotPopup && (
            <div className="absolute inset-0 flex items-center justify-center px-6 z-20" style={{ background: 'rgba(0,0,0,.7)' }}>
              <div className="rounded-2xl p-6 max-w-sm w-full text-center" style={{ background: dm.modal, border: `1px solid ${dm.b10}` }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl mx-auto mb-3"
                  style={{ background: slotPopup === 'past' ? dm.formInp : 'rgba(239,68,68,.1)' }}>
                  {slotPopup === 'past' ? '⏰' : '🚫'}
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: dm.fg }}>{slotPopup === 'past' ? 'Time Has Passed' : 'Slot Already Booked'}</h3>
                <p className="text-sm mb-5" style={{ color: dm.fg45 }}>
                  {slotPopup === 'past' ? 'This time slot has already passed.' : 'This slot is taken. Please choose another.'}
                </p>
                <button onClick={() => setSlotPopup(null)} className="w-full py-2.5 font-bold text-white rounded-2xl" style={{ background: theme.p }}>
                  Choose Another Slot
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════ PACKAGE REQUEST MODAL ════ */}
      {pkgReqModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(8px)' }}>
          <div className="rounded-2xl w-full max-w-sm p-6" style={{ background: dm.modal, border: `1px solid ${dm.b10}`, transition: 'background .3s' }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{pkgReqModal.icon || (pkgReqModal.type === 'package' ? '🎁' : '💳')}</span>
              <div>
                <p className="font-bold text-sm" style={{ color: dm.fg }}>{pkgReqModal.name}</p>
                <p className="text-xs" style={{ color: dm.fg40 }}>
                  {pkgReqModal.type === 'package' ? `₹${pkgReqModal.discountedPrice}` : `₹${pkgReqModal.price}/${pkgReqModal.billingCycle === 'monthly' ? 'month' : pkgReqModal.billingCycle === 'quarterly' ? 'quarter' : 'year'}`}
                </p>
              </div>
            </div>
            <div className="rounded-xl p-3 mb-4 text-xs" style={{ background: `${theme.p}10`, color: theme.p, border: `1px solid ${theme.p}25` }}>
              Pay directly at the salon. The owner will confirm after receiving your payment.
            </div>
            <label className="block text-xs font-semibold mb-1" style={{ color: dm.fg45 }}>Note (optional)</label>
            <textarea value={pkgNote} onChange={e => setPkgNote(e.target.value)} rows={2}
              placeholder="Any message to the salon owner..."
              className="w-full px-3 py-2 rounded-xl text-sm resize-none mb-4"
              style={{ background: dm.formInp, border: `1px solid ${dm.formBrd}`, color: dm.fg, outline: 'none' }} />
            <div className="flex gap-3">
              <button onClick={() => { setPkgReqModal(null); setPkgNote(''); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ border: `1px solid ${dm.b12}`, color: dm.fg50 }}>Cancel</button>
              <button onClick={handlePackageRequest} disabled={pkgReqLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background: `linear-gradient(135deg,${theme.p},${theme.p}cc)` }}>
                {pkgReqLoading ? 'Sending…' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Helpers + CSS — SalonVideoViewer (mirrors Reels.jsx design)
────────────────────────────────────────────────────────────────── */
function svvSessionId() {
  let id = localStorage.getItem('reelSessionId');
  if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('reelSessionId', id); }
  return id;
}
function svvFmt(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}
function svvTimeAgo(date) {
  if (!date) return '';
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60)    return `${Math.floor(diff)}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const SVV_CSS = `
  /* ── layout ── */
  .svv-outer { position: fixed; inset: 0; z-index: 9999; }

  @media (max-width: 767px) {
    .svv-outer { background: #000; }
    .svv-col   { position: absolute; inset: 0; }
  }
  @media (min-width: 768px) {
    .svv-outer {
      background: var(--t-bg);
      background-image:
        radial-gradient(ellipse 60% 50% at 30% 20%, rgba(99,102,241,0.10) 0%, transparent 70%),
        radial-gradient(ellipse 60% 50% at 70% 80%, rgba(139,92,246,0.07) 0%, transparent 70%);
      display: flex; align-items: center; justify-content: center;
    }
    .svv-col {
      position: relative; width: 390px;
      height: calc(100vh - 80px); max-height: 820px; min-height: 500px;
      border-radius: 30px; overflow: hidden;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.07), 0 32px 96px rgba(0,0,0,0.95), 0 0 80px rgba(99,102,241,0.06);
    }
  }
  .svv-feed { position: absolute; inset: 0; overflow: hidden; touch-action: pan-y; background: #000; }
  .svv-strip { display: flex; flex-direction: column; will-change: transform; }

  /* ── progress bar (identical to Reels) ── */
  .reel-progress-wrap {
    position: absolute; top: 0; left: 0; right: 0;
    height: 3px; background: rgba(255,255,255,0.10); z-index: 26;
  }
  .reel-progress-bar {
    height: 100%;
    background: linear-gradient(to right, #6366f1, #a78bfa, #f0abfc);
    border-radius: 0 3px 3px 0;
    box-shadow: 0 0 10px rgba(167,139,250,0.75);
    transition: width 0.2s linear; will-change: width;
  }

  /* ── gradient overlay (identical to Reels) ── */
  .reel-gradient {
    position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(to bottom,
      rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.30) 12%,
      rgba(0,0,0,0.08) 25%, transparent 38%,
      transparent 50%, rgba(0,0,0,0.12) 60%,
      rgba(0,0,0,0.48) 75%, rgba(0,0,0,0.88) 100%);
  }

  /* ── action buttons — identical to Reels ── */
  .btn-action {
    background: none; border: none; cursor: pointer;
    display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 0;
    -webkit-tap-highlight-color: transparent;
  }
  .btn-action-icon {
    width: 54px; height: 54px; border-radius: 50%;
    background: rgba(10,10,10,0.55);
    backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
    border: 1px solid rgba(255,255,255,0.14);
    display: flex; align-items: center; justify-content: center;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.10), 0 4px 16px rgba(0,0,0,0.4);
    transition: transform 0.15s ease, box-shadow 0.2s ease;
  }
  .btn-action:active .btn-action-icon { transform: scale(0.90); }
  .btn-action-label {
    color: rgba(255,255,255,0.92); font-size: 11px; font-weight: 800;
    text-shadow: 0 1px 6px rgba(0,0,0,0.9); letter-spacing: 0.3px;
    line-height: 1.1; text-align: center; max-width: 58px;
  }
  .btn-action-sub {
    color: rgba(255,255,255,0.40); font-size: 9px; font-weight: 600; margin-top: -3px;
  }

  /* ── keyframes ── */
  @keyframes svvHeartPop {
    0%, 100% { transform: scale(1); }
    40%       { transform: scale(1.55); }
  }
  @keyframes svvHeartBurst {
    0%   { opacity: 1; transform: scale(0.25); }
    45%  { opacity: 1; transform: scale(1.75); }
    100% { opacity: 0; transform: scale(2.4); }
  }
  @keyframes svvScaleIn {
    from { opacity: 0; transform: scale(0.88) translateY(16px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes svvSpin { to { transform: rotate(360deg); } }
  @keyframes svvGlowLike {
    0%, 100% { box-shadow: 0 0 14px rgba(239,68,68,0.45), inset 0 1px 0 rgba(255,255,255,0.12); }
    50%       { box-shadow: 0 0 32px rgba(239,68,68,0.80), inset 0 1px 0 rgba(255,255,255,0.12); }
  }

  .svv-heart-pop   { animation: svvHeartPop   0.35s cubic-bezier(.36,.07,.19,.97); }
  .svv-heart-burst { animation: svvHeartBurst 0.72s ease forwards; pointer-events: none; }
  .svv-scale-in    { animation: svvScaleIn    0.42s cubic-bezier(0.22,1,0.36,1) both; }
  .svv-like-glow   { animation: svvGlowLike   1.6s ease infinite; }

  /* ── comment input ── */
  .svv-comment-input {
    flex: 1; background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.10); border-radius: 16px;
    padding: 12px 16px; color: #fff; font-size: 13px; outline: none;
    font-family: inherit; transition: border-color 0.2s; resize: none;
  }
  .svv-comment-input:focus { border-color: rgba(139,92,246,0.5); }
  .svv-comment-input::placeholder { color: rgba(255,255,255,0.28); }

  /* ── bottom info slide-up ── */
  @keyframes svvSlideUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .svv-info-in { animation: svvSlideUp 0.42s cubic-bezier(0.22,1,0.36,1) both; }
`;

/* ────────────────────────────────────────────────────────────────
   SalonVideoViewer — mirrors Reels.jsx look exactly
────────────────────────────────────────────────────────────────── */
function SalonVideoViewer({ videos, startIdx, salon, onClose, onBook }) {
  const [idx, setIdx]         = useState(startIdx ?? 0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted]     = useState(false);
  const [feedH, setFeedH]     = useState(window.innerHeight);
  const [progress, setProgress] = useState(0);

  // Like
  const [liked, setLiked]               = useState(false);
  const [likeCount, setLikeCount]       = useState(0);
  const [heartPop, setHeartPop]         = useState(false);
  const [doubleTapHeart, setDoubleTapHeart] = useState(false);

  // Comment
  const [showComments, setShowComments]       = useState(false);
  const [comments, setComments]               = useState([]);
  const [commentCount, setCommentCount]       = useState(0);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText]         = useState('');
  const [posting, setPosting]                 = useState(false);

  // Share
  const [copied, setCopied] = useState(false);

  const videoRef    = useRef(null);
  const feedRef     = useRef(null);
  const stripRef    = useRef(null);
  const currentI    = useRef(startIdx ?? 0);
  const mutedRef    = useRef(false);
  const scrolling   = useRef(false);
  const touchStartY = useRef(0);
  const touchDeltaY = useRef(0);
  const lastTapRef  = useRef(0);

  const total     = videos.length;
  const salonName = salon?.name || 'Salon';
  const salonLogo = salon?.logo || null;
  const city      = salon?.city || salon?.address || '';
  const rating    = salon?.averageRating ? parseFloat(salon.averageRating).toFixed(1) : null;
  const salonId   = salon?._id;
  const videoUrl  = videos[idx] || '';
  const initial   = salonName[0]?.toUpperCase() || 'S';
  const safeBottom = 'env(safe-area-inset-bottom, 0px)';

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Measure feed height after mount — desktop col is CSS-sized, not 100vh
  useLayoutEffect(() => {
    const feed = feedRef.current;
    if (feed && feed.clientHeight > 0) setFeedH(feed.clientHeight);
  }, []);

  // Sync muted → DOM ref (React muted attr is ignored by browsers)
  useEffect(() => {
    mutedRef.current = muted;
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  // Fetch like/comment counts for current video
  useEffect(() => {
    setLiked(false); setLikeCount(0); setCommentCount(0); setProgress(0);
    if (!videoUrl || !salonId) return;
    const fp = svvSessionId();
    API.get(`/public/reels?fingerprint=${encodeURIComponent(fp)}`)
      .then(r => {
        const reels = r.data.data || r.data.reels || [];
        const match = reels.find(reel => reel.videoUrl === videoUrl);
        if (match) {
          setLikeCount(match.likeCount || 0);
          setLiked(match.liked || false);
          setCommentCount(match.commentCount || 0);
        }
      })
      .catch(() => {});
  }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch comments when panel opens
  useEffect(() => {
    if (!showComments || !videoUrl) { if (!showComments) setComments([]); return; }
    setCommentsLoading(true);
    API.get(`/public/reels/comments?videoUrl=${encodeURIComponent(videoUrl)}`)
      .then(r => setComments(r.data.data || []))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));
  }, [showComments, videoUrl]);

  // Progress bar
  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress((v.currentTime / v.duration) * 100);
  }, []);

  // Like — optimistic with rollback
  const handleLike = useCallback(async () => {
    if (!salonId) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount(c => Math.max(0, c + (wasLiked ? -1 : 1)));
    setHeartPop(true);
    setTimeout(() => setHeartPop(false), 400);
    try {
      const r = await API.post('/public/reels/like', { videoUrl, salonId });
      setLiked(r.data.liked);
      setLikeCount(r.data.count ?? (wasLiked ? likeCount - 1 : likeCount + 1));
    } catch {
      setLiked(wasLiked);
      setLikeCount(c => Math.max(0, c + (wasLiked ? 1 : -1)));
    }
  }, [liked, likeCount, videoUrl, salonId]);

  // Share — copies salon page link
  const handleShare = useCallback(() => {
    const url = `${window.location.origin}${salonPath(salon)}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }, [salon]);

  // Post comment
  const postComment = useCallback(async () => {
    const text = commentText.trim();
    if (!text || !videoUrl || !salonId || posting) return;
    setPosting(true);
    try {
      const r = await API.post('/public/reels/comments', { videoUrl, salonId, text });
      setComments(prev => [r.data.data, ...prev]);
      setCommentCount(c => c + 1);
      setCommentText('');
    } catch { /* silent */ }
    finally { setPosting(false); }
  }, [commentText, videoUrl, salonId, posting]);

  /* ── Core navigation ── */
  const goTo = useCallback((i, animated = true) => {
    const clamped = Math.max(0, Math.min(i, total - 1));
    currentI.current = clamped;
    setIdx(clamped);
    const strip = stripRef.current;
    const feed  = feedRef.current;
    if (!strip || !feed) return;
    strip.style.transition = animated ? 'transform 0.30s cubic-bezier(0.25,0.46,0.45,0.94)' : 'none';
    strip.style.transform  = `translateY(-${clamped * feed.clientHeight}px)`;
    setShowComments(false);
  }, [total]);

  // Play current video when idx changes (src is already set by JSX)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = mutedRef.current;
    v.play().catch(() => {});
    setPlaying(true);
  }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Wheel (desktop) ── */
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    let t = null;
    const onWheel = (e) => {
      e.preventDefault();
      if (scrolling.current) return;
      scrolling.current = true;
      clearTimeout(t);
      goTo(currentI.current + (e.deltaY > 0 ? 1 : -1));
      t = setTimeout(() => { scrolling.current = false; }, 450);
    };
    feed.addEventListener('wheel', onWheel, { passive: false });
    return () => { feed.removeEventListener('wheel', onWheel); clearTimeout(t); };
  }, [goTo]);

  /* ── Touch (mobile) ── */
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    const onTouchStart = (e) => {
      touchStartY.current = e.touches[0].clientY;
      touchDeltaY.current = 0;
      if (stripRef.current) stripRef.current.style.transition = 'none';
    };
    const onTouchMove = (e) => {
      const strip = stripRef.current;
      if (!strip) return;
      touchDeltaY.current = e.touches[0].clientY - touchStartY.current;
      strip.style.transform = `translateY(${-currentI.current * feed.clientHeight + touchDeltaY.current}px)`;
    };
    const onTouchEnd = () => {
      const threshold = feed.clientHeight * 0.22;
      if      (touchDeltaY.current < -threshold) goTo(currentI.current + 1);
      else if (touchDeltaY.current >  threshold) goTo(currentI.current - 1);
      else                                        goTo(currentI.current);
    };
    feed.addEventListener('touchstart', onTouchStart, { passive: true });
    feed.addEventListener('touchmove',  onTouchMove,  { passive: true });
    feed.addEventListener('touchend',   onTouchEnd,   { passive: true });
    return () => {
      feed.removeEventListener('touchstart', onTouchStart);
      feed.removeEventListener('touchmove',  onTouchMove);
      feed.removeEventListener('touchend',   onTouchEnd);
    };
  }, [goTo]);

  /* ── Keyboard ── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape')    { onClose(); return; }
      if (e.key === 'ArrowDown') goTo(currentI.current + 1);
      if (e.key === 'ArrowUp')   goTo(currentI.current - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo, onClose]);

  /* ── Resize ── */
  useEffect(() => {
    const onResize = () => {
      const feed = feedRef.current; const strip = stripRef.current;
      if (!feed || !strip) return;
      setFeedH(feed.clientHeight);
      strip.style.transition = 'none';
      strip.style.transform  = `translateY(-${currentI.current * feed.clientHeight}px)`;
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); setPlaying(true); }
    else          { v.pause(); setPlaying(false); }
  };

  /* ── Double-tap to like, single-tap to pause/play ── */
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      if (!liked) handleLike();
      setDoubleTapHeart(true);
      setTimeout(() => setDoubleTapHeart(false), 750);
    } else {
      togglePlay();
    }
    lastTapRef.current = now;
  }, [liked, handleLike]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoggedIn = () => !!localStorage.getItem('customerToken');

  return (
    <>
      <style>{SVV_CSS}</style>

      <div className="svv-outer">
        <div className="svv-col">

          {/* ── Feed ── */}
          <div ref={feedRef} className="svv-feed">
            <div ref={stripRef} className="svv-strip">
              {videos.map((vUrl, i) => (
                <div key={i} style={{ width: '100%', height: feedH, flexShrink: 0, position: 'relative', background: '#080808', touchAction: 'pan-y' }}>
                  {i === idx && (
                    <video
                      ref={videoRef}
                      src={vUrl}
                      loop playsInline autoPlay
                      onClick={handleTap}
                      onTimeUpdate={handleTimeUpdate}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer', display: 'block' }}
                    />
                  )}
                  <div className="reel-gradient" />
                  {/* Paused overlay */}
                  {i === idx && !playing && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 5 }}>
                      <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Play style={{ width: 30, height: 30, color: '#fff', fill: '#fff', marginLeft: 4 }} />
                      </div>
                    </div>
                  )}
                  {/* Double-tap heart */}
                  {i === idx && doubleTapHeart && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 30, pointerEvents: 'none' }}>
                      <div className="svv-heart-burst">
                        <svg viewBox="0 0 24 24" width={120} height={120} fill="#ef4444" style={{ filter: 'drop-shadow(0 0 24px rgba(239,68,68,0.9)) drop-shadow(0 0 48px rgba(239,68,68,0.5))' }}>
                          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Progress bar ── */}
          <div className="reel-progress-wrap">
            <div className="reel-progress-bar" style={{ width: `${progress}%` }} />
          </div>

          {/* ── Top bar: close + title + mute ── */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
            padding: 'max(44px,calc(env(safe-area-inset-top,14px) + 14px)) 16px 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.72), transparent)',
          }}>
            <button onClick={onClose} style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
              <X style={{ width: 17, height: 17 }} />
            </button>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#fff', fontSize: 13.5, fontWeight: 800, margin: 0, letterSpacing: '-0.1px' }}>{salonName}</p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, margin: 0 }}>{idx + 1} / {total} videos</p>
            </div>
            <button onClick={() => setMuted(m => !m)} style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
              {muted
                ? <svg viewBox="0 0 24 24" width={18} height={18} fill="#fff"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                : <svg viewBox="0 0 24 24" width={18} height={18} fill="#fff"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
              }
            </button>
          </div>

          {/* ── Right rail: Like · Comment · Share (exact Reels look) ── */}
          <div style={{
            position: 'absolute', right: 14,
            bottom: `calc(${safeBottom} + 120px)`,
            zIndex: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22,
          }}>
            {/* Like */}
            <button className="btn-action" onClick={handleLike}>
              <div className={`btn-action-icon${heartPop ? ' svv-heart-pop' : ''}${liked ? ' svv-like-glow' : ''}`}
                style={liked ? { borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.12)' } : {}}>
                <svg viewBox="0 0 24 24" width={26} height={26}
                  fill={liked ? '#ef4444' : 'none'}
                  stroke={liked ? '#ef4444' : '#fff'} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <span className="btn-action-label" style={liked ? { color: '#ef4444' } : {}}>{svvFmt(likeCount)}</span>
              <span className="btn-action-sub">Like</span>
            </button>

            {/* Comment */}
            <button className="btn-action" onClick={() => setShowComments(true)}>
              <div className="btn-action-icon">
                <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="#fff" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <span className="btn-action-label">{svvFmt(commentCount)}</span>
              <span className="btn-action-sub">Comment</span>
            </button>

            {/* Share */}
            <button className="btn-action" onClick={handleShare}>
              <div className="btn-action-icon">
                {copied
                  ? <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="#4ade80" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                  : <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="#fff" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                }
              </div>
              <span className="btn-action-label" style={copied ? { color: '#4ade80' } : {}}>{copied ? 'Copied!' : 'Share'}</span>
            </button>

            {/* Salon avatar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 50, height: 50, borderRadius: '50%', overflow: 'hidden',
                border: '2px solid rgba(255,255,255,0.8)',
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
              }}>
                {salonLogo
                  ? <img src={salonLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ color: '#fff', fontWeight: 900, fontSize: 17, lineHeight: 1 }}>{initial}</span>
                }
              </div>
              <span style={{ color: 'rgba(255,255,255,0.82)', fontSize: 10, fontWeight: 700, maxWidth: 58, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 1px 5px rgba(0,0,0,0.9)' }}>
                {salonName.split(' ')[0]}
              </span>
            </div>
          </div>

          {/* ── Bottom info + Book CTA (exact Reels layout) ── */}
          <div className="svv-info-in" style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
            padding: `20px 16px calc(${safeBottom} + 20px)`,
            paddingRight: 82,
          }}>
            {/* Salon row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                {salonLogo
                  ? <img src={salonLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ color: '#fff', fontWeight: 900, fontSize: 16, lineHeight: 1 }}>{initial}</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#fff', fontWeight: 900, fontSize: 14.5, margin: 0, textShadow: '0 2px 10px rgba(0,0,0,0.95)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.1px' }}>
                  {salonName}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3, flexWrap: 'wrap' }}>
                  <svg viewBox="0 0 24 24" width={9} height={9} fill="rgba(255,255,255,0.58)"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                  {city && <span style={{ color: 'rgba(255,255,255,0.58)', fontSize: 11, fontWeight: 500 }}>{city}</span>}
                  {rating && <>
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>•</span>
                    <span style={{ color: '#fbbf24', fontSize: 11, fontWeight: 800 }}>★ {rating}</span>
                  </>}
                </div>
              </div>
            </div>

            {/* Book CTA — same gradient + style as Reels */}
            <button onClick={onBook} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
              borderRadius: 18, padding: '13px 20px',
              color: '#fff', border: '1px solid rgba(139,92,246,0.45)',
              fontSize: 14, fontWeight: 800, letterSpacing: 0.3, cursor: 'pointer',
              boxShadow: '0 6px 28px rgba(99,102,241,0.55), inset 0 1px 0 rgba(255,255,255,0.22)',
            }}>
              <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
                <path d="M20 4H8.12A6 6 0 003 9.6M20 20H8.12A6 6 0 013 14.4" />
              </svg>
              Book Appointment
            </button>
          </div>

        </div>{/* end .svv-col */}

        {/* ── Comment sheet — outside col so it overlays everything on desktop ── */}
        {showComments && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 10010, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }} onClick={() => setShowComments(false)} />
            <div className="svv-scale-in" style={{
              position: 'relative', zIndex: 1,
              background: 'linear-gradient(160deg, #111118, #0d0d14)',
              border: '1px solid rgba(255,255,255,0.07)', borderBottom: 'none',
              borderRadius: '26px 26px 0 0',
              width: '100%', maxWidth: 540,
              maxHeight: '82vh', display: 'flex', flexDirection: 'column',
              padding: '0 0 max(24px,env(safe-area-inset-bottom,24px))',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
            }}>
              {/* Handle + header */}
              <div style={{ padding: '14px 16px 0', flexShrink: 0 }}>
                <div style={{ width: 36, height: 4, background: 'linear-gradient(to right,#6366f1,#a78bfa)', borderRadius: 2, margin: '0 auto 16px', boxShadow: '0 0 8px rgba(99,102,241,0.5)' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <p style={{ color: '#fff', fontWeight: 900, fontSize: 15, margin: 0, letterSpacing: '-0.2px' }}>Comments</p>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '2px 0 0', fontWeight: 600 }}>{salonName}</p>
                  </div>
                  <button onClick={() => setShowComments(false)} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 14 }}>✕</button>
                </div>
              </div>

              {/* Comment list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 4px' }}>
                {commentsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'conic-gradient(from 0deg,#6366f1,#a78bfa,transparent)', animation: 'svvSpin 0.9s linear infinite', padding: 4 }}>
                      <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#111118' }} />
                    </div>
                  </div>
                ) : comments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                    <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13, margin: 0 }}>No comments yet. Be the first!</p>
                  </div>
                ) : comments.map(c => (
                  <div key={c._id || c.createdAt} style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff' }}>
                        {c.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 4 }}>
                          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 800 }}>{c.name}</span>
                          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>{svvTimeAgo(c.createdAt)}</span>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>{c.text}</p>
                      </div>
                    </div>
                    {c.replies?.map((r, ri) => (
                      <div key={ri} style={{ marginTop: 10, marginLeft: 46, paddingLeft: 12, borderLeft: '2px solid rgba(139,92,246,0.4)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ color: '#a78bfa', fontSize: 12, fontWeight: 800 }}>{r.ownerName}</span>
                          <span style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.3))', color: '#c4b5fd', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 5, border: '1px solid rgba(139,92,246,0.2)' }}>OWNER</span>
                          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>{svvTimeAgo(r.createdAt)}</span>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>{r.text}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Input */}
              <div style={{ padding: '12px 16px 0', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {isLoggedIn() ? (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                    <input
                      className="svv-comment-input"
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && postComment()}
                      placeholder="Add a comment…"
                      autoFocus
                    />
                    <button onClick={postComment} disabled={posting || !commentText.trim()} style={{
                      flexShrink: 0, height: 48, padding: '0 20px', borderRadius: 14, border: 'none',
                      background: posting || !commentText.trim() ? 'rgba(99,102,241,0.25)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                      color: '#fff', fontWeight: 800, fontSize: 13, cursor: posting || !commentText.trim() ? 'not-allowed' : 'pointer',
                      transition: 'background 0.2s',
                      boxShadow: commentText.trim() && !posting ? '0 4px 16px rgba(99,102,241,0.4)' : 'none',
                    }}>
                      {posting ? '…' : 'Post'}
                    </button>
                  </div>
                ) : (
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center', margin: '4px 0 0', padding: '8px 0' }}>
                    Sign in to leave a comment
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

export default SalonDetails;
