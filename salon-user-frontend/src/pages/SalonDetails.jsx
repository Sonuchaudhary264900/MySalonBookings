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
  getCategoryImage,
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
  barbershop:    { p: '#6366f1', acc: '#818cf8', ring: 'rgba(99,102,241,0.55)' },
  salon:         { p: '#818cf8', acc: '#a5b4fc', ring: 'rgba(129,140,248,0.55)' },
  spa_wellness:  { p: '#8b5cf6', acc: '#a78bfa', ring: 'rgba(139,92,246,0.55)' },
  makeup_bridal: { p: '#a78bfa', acc: '#c4b5fd', ring: 'rgba(167,139,250,0.55)' },
  skin_derma:    { p: '#6366f1', acc: '#818cf8', ring: 'rgba(99,102,241,0.55)' },
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
  const locality = salon?.locality || null;
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
  const [activeTab, setActiveTab] = useState('services');
  const [followed, setFollowed] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [reviewFilter, setReviewFilter] = useState('all');

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
    if (token) {
      API.get(`/customer/salons/${id}/follow-status`).then(r => { if (r.data?.following !== undefined) setFollowed(r.data.following); }).catch((error) => {
        // Ignore 404 errors (route not deployed yet) and auth errors, but log other errors
        if (error.response?.status !== 404 && error.response?.status !== 401) {
          console.error('Error checking follow status:', error);
        }
      });
    }
  }, [id]);

  const loadSalon    = async () => { try { const r = await API.get(`/public/salons/${id}`); const data = r.data.data || r.data.salon; setSalon(data); setFollowersCount(data?.followersCount || 0); if (data?.topOffer) setOffers(prev => prev.length > 0 ? prev : [data.topOffer]); } catch {} };
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

  const handleBookNow   = () => { if (selectedServices.length === 0) { setActiveTab('services'); return; } openBooking(); };
  const handleSmartBook = () => { if (selectedServices.length === 0) { setActiveTab('services'); } else { openBooking(); } };

  const handleFollow = async () => {
    if (!token) { navigate('/login'); return; }
    if (followLoading) return;
    setFollowLoading(true);
    const newFollowed = !followed;
    setFollowed(newFollowed);
    setFollowersCount(c => newFollowed ? c + 1 : Math.max(0, c - 1));
    try {
      const r = await API.post(`/customer/salons/${id}/follow`);
      setFollowed(r.data.following);
      if (r.data.followersCount !== undefined) setFollowersCount(r.data.followersCount);
    } catch (error) {
      // Ignore 404 errors (route not deployed yet) and revert optimistic update
      if (error.response?.status !== 404) {
        setFollowed(!newFollowed);
        setFollowersCount(c => newFollowed ? Math.max(0, c - 1) : c + 1);
      }
    } finally { setFollowLoading(false); }
  };

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
          {[1,2,3].map(i => <div key={i} style={{ height: 20, background: 'var(--t-b07)', borderRadius: 2 }} />)}
        </div>
      </div>
    );
  }

  if (!salon) {
    return (
      <div style={{ background: 'var(--t-bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center">
          <Frown className="w-12 h-12 mx-auto mb-4" style={{ color: 'rgba(255,255,255,.2)' }} />
          <p className="mb-4" style={{ color: 'var(--t-fg-40)' }}>Salon not found.</p>
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
    bg:  darkMode ? '#060114' : '#f9fafb',
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
    card:     darkMode ? '#0D0520' : '#ffffff',
    cardBrd:  darkMode ? '#1f2937' : '#e5e7eb',
    barBg:    darkMode ? '#0D0520' : '#f3f4f6',
    cardBg2:  darkMode ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.03)',
    border1:  darkMode ? 'rgba(167,139,250,.12)' : 'rgba(0,0,0,.08)',
    ownerOvr: darkMode ? 'linear-gradient(to right,transparent 35%,rgba(17,24,39,.25) 55%,rgba(17,24,39,.72) 75%,#111827 100%)' : 'linear-gradient(to right,transparent 65%,rgba(0,0,0,.12) 100%)',
    heroOvr1: 'linear-gradient(to top,rgba(0,0,0,.88) 0%,rgba(0,0,0,.55) 28%,rgba(0,0,0,.15) 52%,transparent 70%)',
    heroOvr2: 'linear-gradient(to right,rgba(0,0,0,.20) 0%,transparent 40%)',
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
    <>

      {/* ════ PAGE CSS ════ */}
      <style>{`
        @keyframes heroFadeIn{from{opacity:0}to{opacity:1}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes pulse{0%,100%{opacity:.4}50%{opacity:.9}}
        .glw-shimmer{background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.09) 50%,rgba(255,255,255,.04) 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:8px}
        .glw-col{max-width:480px;margin:0 auto;position:relative;background:var(--t-bg);min-height:100vh}
        @media(min-width:768px){
          .glw-col{max-width:935px}
          .glw-desktop-profile{display:flex;gap:40px;align-items:flex-start;padding:32px 32px 24px}
          .glw-desktop-avatar{width:150px;height:150px;border-radius:50%;border:3px solid #7C3AED;overflow:hidden;flex-shrink:0;background:#1A0528;box-shadow:0 4px 32px rgba(124,58,237,.5)}
          .glw-desktop-info{flex:1;min-width:0}
          .glw-desktop-stats{display:flex;gap:32px;margin:16px 0}
          .glw-mobile-profile{display:block}
        }
        @media(min-width:768px){.glw-mobile-profile{display:none}.glw-desktop-profile{display:flex !important}}
        .glw-tab-btn{flex:1;padding:14px 4px;font-size:11px;font-weight:700;letter-spacing:.10em;text-transform:uppercase;border:none;background:none;cursor:pointer;position:relative;transition:color .2s;white-space:nowrap}
        .glw-photo-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:3px}
        .glw-reel-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:3px}
        .glw-photo-cell{aspect-ratio:1;overflow:hidden;cursor:pointer;position:relative}
        .glw-reel-cell{aspect-ratio:9/16;border-radius:12px;overflow:hidden;cursor:pointer;position:relative;background:rgba(255,255,255,.04)}
        .glw-star-bar-track{flex:1;height:6px;border-radius:999px;background:rgba(255,255,255,.10);overflow:hidden}
        .glw-star-bar-fill{height:100%;border-radius:999px;background:#7C3AED;transition:width 0.8s cubic-bezier(.22,1,.36,1)}
        .lux-btn-p{display:inline-flex;align-items:center;gap:8px;padding:13px 24px;font-weight:700;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#fff;border-radius:12px;transition:all .25s ease;cursor:pointer;border:none;outline:none;white-space:nowrap}
        .svc-grid{display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}
        @media(max-width:639px){.svc-grid{grid-template-columns:repeat(2,1fr);gap:8px}}
        .scrollbar-hide{scrollbar-width:none;-ms-overflow-style:none}
        .scrollbar-hide::-webkit-scrollbar{display:none}
      `}</style>

      {/* ════ OUTER SHELL ════ */}
      <div style={{ background: dm.bg, minHeight: '100vh', paddingBottom: selectedServices.length > 0 ? 'calc(140px + env(safe-area-inset-bottom,0px))' : 'calc(60px + env(safe-area-inset-bottom,0px))' }}>
        <div className="glw-col">

          {/* ════ A. BANNER ════ */}
          <div ref={heroSectionRef} style={{ position: 'relative', height: 'clamp(180px,50vw,220px)', overflow: 'hidden', background: dm.card }}>
            {heroSlides.map((s, i) => {
              if (s.type !== 'video' || i === heroSlideIdx) return null;
              const dist = (i - heroSlideIdx + heroSlides.length) % heroSlides.length;
              if (dist > 4) return null;
              return <video key={s.url} src={s.url} preload={dist <= 2 ? 'auto' : 'metadata'} muted playsInline style={{ display: 'none' }} />;
            })}
            {currentHeroSlide ? (
              <div key={heroSlideIdx} style={{ position: 'absolute', inset: 0, animation: 'heroFadeIn 0.25s ease both' }}>
                {currentHeroSlide.type === 'video'
                  ? <video ref={heroVideoRef2} src={currentHeroSlide.url} autoPlay muted={heroMuted} playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
                      loop={heroSlides.length === 1}
                      onEnded={() => heroSlides.length > 1 && setHeroSlideIdx(i => (i + 1) % heroSlides.length)} />
                  : <img src={currentHeroSlide.url} alt={salon.name} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                }
              </div>
            ) : (
              <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 70% 60% at 20% 40%, ${theme.p}47 0%, transparent 55%), linear-gradient(135deg, ${dm.card} 0%, ${dm.card} 100%)` }} />
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(13,5,32,.05) 0%, rgba(13,5,32,.60) 75%, #0D0520 100%)' }} />
            {currentHeroSlide?.type === 'video' && (
              <button onClick={e => { e.stopPropagation(); setHeroMuted(m => !m); heroVideoRef2.current && (heroVideoRef2.current.muted = !heroMuted); }}
                style={{ position: 'absolute', top: 12, right: 12, width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.12)', cursor: 'pointer', zIndex: 5, color: '#fff' }}>
                {heroMuted ? <VolumeX style={{ width: 15, height: 15 }} /> : <Volume2 style={{ width: 15, height: 15 }} />}
              </button>
            )}
          </div>

          {/* ════ B. PROFILE INFO — mobile ════ */}
          <div className="glw-mobile-profile" style={{ padding: '0 16px 0', marginTop: -28, position: 'relative', zIndex: 2 }}>
            {/* Avatar row: avatar left, Book button right */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', border: `3px solid ${theme.p}`, overflow: 'hidden', flexShrink: 0, background: dm.card, boxShadow: `0 4px 20px ${theme.p}66` }}>
                {(salon.profilePhoto || salon.coverPhoto || salonPhotoUrls[0])
                  ? <img src={salon.profilePhoto || salon.coverPhoto || salonPhotoUrls[0]} alt={salon.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(124,58,237,.2)', fontSize: 28, fontWeight: 900, color: theme.acc }}>{(salon.name||'S').charAt(0)}</div>
                }
              </div>
              <motion.button whileTap={{ scale: .96 }} onClick={handleSmartBook}
                style={{ background: theme.p, boxShadow: '0 6px 20px rgba(124,58,237,.45)', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap style={{ width: 14, height: 14 }} /> Book Your Look ✨
              </motion.button>
            </div>
            {/* Name + badge + rating */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <h1 style={{ fontSize: 20, fontWeight: 900, color: dm.fg, letterSpacing: '-.02em', lineHeight: 1.1 }}>{salon.name}</h1>
              {avgRating >= 4.5 && <BadgeCheck style={{ width: 17, height: 17, color: theme.p, flexShrink: 0 }} />}
              {avgRating && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, marginLeft: 4 }}>
                  <span style={{ color: '#FDE68A', fontSize: 12 }}>★</span>
                  <span style={{ fontWeight: 700, fontSize: 12, color: '#FDE68A' }}>{avgRating}</span>
                  <span style={{ fontSize: 10, color: 'rgba(253,230,138,.5)' }}>({reviews.length})</span>
                </span>
              )}
            </div>
            {salon.tagline && <p style={{ fontSize: 12, color: theme.acc, marginBottom: 5 }}>{salon.tagline}</p>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {(locality || salon.city) && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: dm.fg45 }}>
                  <MapPin style={{ width: 11, height: 11 }} />
                  {locality && salon.city ? `${locality}, ${salon.city}` : locality || salon.city}
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
                color: openStatus === 'open' ? '#4ADE80' : '#F87171',
                padding: '2px 8px', borderRadius: 999,
                background: openStatus === 'open' ? 'rgba(74,222,128,.1)' : 'rgba(248,113,113,.1)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: openStatus === 'open' ? '#4ADE80' : '#F87171', flexShrink: 0 }} />
                {openStatus === 'open' ? `Open · ${todayHours || ''}` : opensAt ? `Opens ${opensAt}` : 'Closed'}
              </span>
            </div>
          </div>

          {/* ════ B2. PROFILE INFO — desktop (Instagram-style) ════ */}
          <div className="glw-desktop-profile" style={{ display: 'none' }}>
            <div className="glw-desktop-avatar">
              {(salon.profilePhoto || salon.coverPhoto || salonPhotoUrls[0])
                ? <img src={salon.profilePhoto || salon.coverPhoto || salonPhotoUrls[0]} alt={salon.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(124,58,237,.2)', fontSize: 52, fontWeight: 900, color: theme.acc }}>{(salon.name||'S').charAt(0)}</div>
              }
            </div>
            <div className="glw-desktop-info">
              {/* Name row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 26, fontWeight: 900, color: dm.fg, letterSpacing: '-.02em', margin: 0 }}>{salon.name}</h1>
                {avgRating >= 4.5 && <BadgeCheck style={{ width: 22, height: 22, color: theme.p, flexShrink: 0 }} />}
                <motion.button whileTap={{ scale: .96 }} onClick={handleSmartBook}
                  style={{ background: theme.p, boxShadow: '0 6px 20px rgba(124,58,237,.45)', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Zap style={{ width: 15, height: 15 }} /> Book Your Look ✨
                </motion.button>
                <motion.button whileTap={{ scale: .96 }}
                  animate={followed ? { scale: [1, 1.1, 1] } : {}}
                  onClick={handleFollow}
                  disabled={followLoading}
                  style={{ background: followed ? 'rgba(124,58,237,.15)' : 'transparent', border: `1.5px solid ${followed ? theme.p : `${theme.p}66`}`, color: theme.acc, borderRadius: 12, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Heart style={{ width: 15, height: 15, fill: followed ? theme.acc : 'none' }} />
                  {followed ? 'Following' : 'Follow'}
                </motion.button>
              </div>
              {/* Stats row */}
              <div className="glw-desktop-stats">
                {[
                  { val: followersCount > 0 ? (followersCount >= 1000 ? `${(followersCount/1000).toFixed(1)}k` : followersCount) : '—', label: 'Followers' },
                  { val: totalBookings >= 1000 ? `${(totalBookings/1000).toFixed(1)}k` : totalBookings > 0 ? `${totalBookings}+` : '—', label: 'Customers' },
                  { val: services.length > 0 ? services.length : '—', label: 'Services' },
                ].map(({ val, label }) => (
                  <div key={label} style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: 18, fontWeight: 900, color: dm.fg, margin: '0 0 2px' }}>{val}</p>
                    <p style={{ fontSize: 12, color: dm.fg45, margin: 0 }}>{label}</p>
                  </div>
                ))}
              </div>
              {/* Bio + location */}
              {salon.tagline && <p style={{ fontSize: 13, color: theme.acc, marginBottom: 6 }}>{salon.tagline}</p>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {avgRating && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ color: '#FDE68A', fontSize: 13 }}>★</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#FDE68A' }}>{avgRating}</span>
                    <span style={{ fontSize: 11, color: 'rgba(253,230,138,.5)' }}>({reviews.length})</span>
                  </span>
                )}
                {(locality || salon.city) && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: dm.fg45 }}>
                    <MapPin style={{ width: 12, height: 12 }} />
                    {locality && salon.city ? `${locality}, ${salon.city}` : locality || salon.city}
                  </span>
                )}
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600,
                  color: openStatus === 'open' ? '#4ADE80' : '#F87171' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: openStatus === 'open' ? '#4ADE80' : '#F87171', flexShrink: 0 }} />
                  {openStatus === 'open' ? `Open · ${todayHours || ''}` : opensAt ? `Opens ${opensAt}` : 'Closed'}
                </span>
              </div>
            </div>
          </div>

          {/* ════ D. ACTION BUTTONS — mobile only ════ */}
          <div className="glw-mobile-profile" style={{ display: 'flex', gap: 10, padding: '0 16px 16px' }}>
            <motion.button whileTap={{ scale: .96 }}
              animate={followed ? { scale: [1, 1.1, 1] } : {}}
              onClick={handleFollow}
              disabled={followLoading}
              style={{ flex: 1, background: followed ? 'rgba(124,58,237,.15)' : 'transparent', border: `1.5px solid ${followed ? theme.p : `${theme.p}66`}`, color: theme.acc, borderRadius: 12, padding: '11px 8px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Heart style={{ width: 14, height: 14, fill: followed ? theme.acc : 'none' }} />
              {followed ? 'Following' : 'Follow'}
            </motion.button>
            <motion.button whileTap={{ scale: .96 }}
              onClick={() => { if (navigator.share) { navigator.share({ title: salon.name, url: window.location.href }); } else { navigator.clipboard?.writeText(window.location.href); } }}
              style={{ flex: 1, background: 'transparent', border: `1.5px solid ${theme.p}66`, color: theme.acc, borderRadius: 12, padding: '11px 8px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Share2 style={{ width: 14, height: 14 }} /> Share
            </motion.button>
          </div>

          {/* ════ E. STICKY TAB BAR ════ */}
          <div style={{ position: 'sticky', top: 0, zIndex: 40, background: darkMode ? 'rgba(13,5,32,.88)' : 'rgba(249,250,251,.95)', backdropFilter: 'blur(24px)', borderBottom: `1px solid ${theme.p}1a`, display: 'flex' }}>
            {['services','reels','photos','reviews'].map(tab => (
              <button key={tab} className="glw-tab-btn" onClick={() => setActiveTab(tab)}
                style={{ color: activeTab === tab ? theme.acc : dm.fg38 }}>
                {tab.toUpperCase()}
                {activeTab === tab && (
                  <motion.div layoutId="glwTabLine"
                    style={{ position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 2, background: theme.p, borderRadius: 1 }} />
                )}
              </button>
            ))}
          </div>

          {/* ════ F. TAB CONTENT ════ */}
          <AnimatePresence mode="wait">
            <motion.div key={activeTab}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: .18 }}>

              {/* ── F1. SERVICES ── */}
              {activeTab === 'services' && (
                <div style={{ padding: '16px 0' }}>

                  {/* Offer strip */}
                  {allOffers.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px 12px', scrollbarWidth: 'none' }}>
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

                  {/* Quick Rebook */}
                  {quickRebook.length > 0 && (
                    <div style={{ margin: '0 16px 14px', padding: '12px 14px', borderRadius: 12, background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.18)' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: dm.fg55, marginBottom: 8 }}>Welcome back! Pick up where you left off</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {quickRebook.map(s => (
                          <span key={s._id} style={{ padding: '4px 10px', borderRadius: 999, background: dm.b07, border: `1px solid ${dm.b12}`, fontSize: 11, color: dm.fg55, fontWeight: 600 }}>
                            {s.name} ₹{s.basePrice || s.price || 0}
                          </span>
                        ))}
                        <motion.button whileTap={{ scale: .96 }} onClick={() => { setSelectedServices(quickRebook); openBooking(); }}
                          style={{ padding: '5px 14px', borderRadius: 999, background: theme.p, color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Repeat2 style={{ width: 11, height: 11 }} /> Book Again
                        </motion.button>
                      </div>
                    </div>
                  )}

                  {/* Gender + Favs filter */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, padding: '0 16px 14px', alignItems: 'center' }}>
                    {salon.servedGender === 'unisex' && services.length > 0 && (
                      <>
                        {[{ key: 'all', label: 'All' }, { key: 'male', label: 'Men' }, { key: 'female', label: 'Women' }].map(({ key, label }) => (
                          <button key={key} onClick={() => setServiceGenderFilter(key)}
                            style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase', background: serviceGenderFilter === key ? theme.p : 'transparent', color: serviceGenderFilter === key ? '#fff' : dm.fg40, border: `1px solid ${serviceGenderFilter === key ? theme.p : dm.b12}`, padding: '7px 16px', borderRadius: 999, cursor: 'pointer' }}>
                            {label}
                          </button>
                        ))}
                        <span style={{ width: 1, height: 18, background: dm.b12, flexShrink: 0 }} />
                      </>
                    )}
                    <button onClick={() => setShowFavsOnly(v => !v)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 999, border: `1px solid ${showFavsOnly ? theme.p : dm.b12}`, background: showFavsOnly ? 'rgba(124,58,237,.15)' : 'transparent', color: showFavsOnly ? theme.acc : dm.fg40, fontSize: 10, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase', cursor: 'pointer' }}>
                      <Heart style={{ width: 11, height: 11, fill: showFavsOnly ? theme.acc : 'none', color: showFavsOnly ? theme.acc : dm.fg40 }} />
                      Favourites{favServices.length > 0 ? ` (${favServices.length})` : ''}
                    </button>
                  </div>

                  {/* Loading skeleton */}
                  {loading && (
                    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[1,2,3,4].map(i => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '14px', borderRadius: 14, background: dm.b03 }}>
                          <div className="glw-shimmer" style={{ width: 76, height: 76, borderRadius: 12, flexShrink: 0 }} />
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                            <div className="glw-shimmer" style={{ width: '60%', height: 14 }} />
                            <div className="glw-shimmer" style={{ width: '40%', height: 10 }} />
                            <div className="glw-shimmer" style={{ width: '25%', height: 12 }} />
                          </div>
                          <div className="glw-shimmer" style={{ width: 60, height: 26, borderRadius: 999 }} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Services accordion */}
                  {services.length === 0 && !loading
                    ? <p style={{ color: dm.fg30, padding: '24px 16px' }}>No services listed yet.</p>
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
                              <div style={{ textAlign: 'center', padding: '40px 16px', color: dm.fg30 }}>
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
                        return (
                          <div>
                            {sortedEntries.map(([cat, catServices], ci) => {
                              const isOpen = expandedCats.has('__all__') || expandedCats.has(cat);
                              const CatIcon = CAT_ICON_COMPONENTS[cat] || Sparkles;
                              const catImg = getCategoryImage(cat, salon);
                              const recId = getRecommended(catServices);
                              const ordered = recId ? [catServices.find(s => s._id === recId), ...catServices.filter(s => s._id !== recId)] : catServices;
                              const toggleCat = () => {
                                setCatClickCounts(prev => ({ ...prev, [cat]: (prev[cat] || 0) + 1 }));
                                setExpandedCats(prev => { const next = new Set(prev); next.delete('__all__'); if (next.has(cat)) next.delete(cat); else next.add(cat); return next; });
                              };
                              return (
                                <motion.div key={cat} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(ci * .05, .25), duration: .45 }}
                                  style={{ overflow: 'hidden', borderBottom: `1px solid ${dm.b07}` }}>
                                  <button onClick={toggleCat} style={{ display: 'flex', alignItems: 'stretch', gap: 14, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                                    {/* Category image — large left */}
                                    <div style={{ width: 90, height: 90, borderRadius: 14, flexShrink: 0, overflow: 'hidden', border: `1px solid ${dm.border1}`, background: 'rgba(124,58,237,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      {catImg
                                        ? <img src={catImg} alt={cat} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                                        : <CatIcon style={{ width: 32, height: 32, color: theme.acc, strokeWidth: 2, opacity: .6 }} />
                                      }
                                    </div>
                                    {/* Category info — right */}
                                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                        <p style={{ fontSize: 15, fontWeight: 800, color: dm.fg, letterSpacing: '-.01em', lineHeight: 1.3, margin: 0 }}>{cat}</p>
                                        <span style={{ fontSize: 15, fontWeight: 800, color: theme.acc, whiteSpace: 'nowrap', flexShrink: 0 }}>from ₹{Math.min(...catServices.map(s => s.basePrice || s.price || 0))}+</span>
                                      </div>
                                      <p style={{ fontSize: 12, color: dm.fg35, fontWeight: 500, margin: '5px 0 0' }}>{catServices.length} service{catServices.length !== 1 ? 's' : ''}</p>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: theme.acc }}>
                                          {isOpen ? 'Hide' : 'View All'}
                                          {isOpen ? <ChevronUp style={{ width: 13, height: 13 }} /> : <ChevronDown style={{ width: 13, height: 13 }} />}
                                        </div>
                                      </div>
                                    </div>
                                  </button>
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
                                              style={{ display: 'flex', alignItems: 'stretch', gap: 14, padding: '14px 16px', borderTop: `1px solid ${dm.b07}`, cursor: 'pointer', transition: 'background .15s', background: isSel ? 'rgba(124,58,237,.08)' : 'transparent', position: 'relative' }}
                                              onClick={() => toggleService(s)}
                                              onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = dm.b04; }}
                                              onMouseLeave={e => { e.currentTarget.style.background = isSel ? 'rgba(124,58,237,.08)' : 'transparent'; }}>
                                              {isSel && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: theme.p, borderRadius: '0 2px 2px 0' }} />}
                                              {/* Large image — left */}
                                              <div style={{ position: 'relative', width: 90, height: 90, borderRadius: 14, overflow: 'hidden', flexShrink: 0, background: 'rgba(124,58,237,.12)', border: `1px solid ${dm.border1}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {svcImgSrc
                                                  ? <img src={svcImgSrc} alt={s.name} loading={svcIdx < 4 ? 'eager' : 'lazy'}
                                                      style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0, transition: 'opacity .2s' }}
                                                      onLoad={e => { e.currentTarget.style.opacity = '1'; }}
                                                      onError={e => { e.currentTarget.parentNode.style.background = 'rgba(124,58,237,.08)'; e.currentTarget.style.display = 'none'; }} />
                                                  : <CatIcon style={{ width: 32, height: 32, color: theme.acc, opacity: .45 }} />
                                                }
                                                <button style={{ position: 'absolute', top: 5, right: 5, zIndex: 2, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                  onClick={e => { e.stopPropagation(); toggleFav(s._id)(e); }}>
                                                  <Heart style={{ width: 10, height: 10, color: isFav ? '#f43f5e' : '#fff', fill: isFav ? '#f43f5e' : 'none' }} />
                                                </button>
                                              </div>
                                              {/* Text — right */}
                                              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                                {/* Name + price row */}
                                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                                  <p style={{ fontSize: 15, fontWeight: 700, color: dm.fg, lineHeight: 1.3, margin: 0 }}>{s.name}</p>
                                                  <span style={{ fontSize: 15, fontWeight: 800, color: theme.acc, whiteSpace: 'nowrap', flexShrink: 0 }}>₹{price}+</span>
                                                </div>
                                                {/* Badges */}
                                                {(isRec || badge || isFast || isTopBooked) && (
                                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                                                    {isRec && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(124,58,237,.25)', color: theme.acc, textTransform: 'uppercase', letterSpacing: '.04em' }}>⭐ Recommended</span>}
                                                    {badge && !isRec && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '.04em',
                                                      background: badge === 'Popular' ? 'rgba(124,58,237,.25)' : badge === 'Best Value' ? 'rgba(5,150,105,.2)' : 'rgba(8,145,178,.2)',
                                                      color: badge === 'Popular' ? theme.acc : badge === 'Best Value' ? '#34d399' : '#38bdf8' }}>
                                                      {badge === 'Popular' ? 'Popular Service' : badge === 'Best Value' ? 'Best Value' : badge === 'Premium' ? 'Premium' : 'Quick'}
                                                    </span>}
                                                    {isFast && !badge && !isRec && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(6,182,212,.12)', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '.04em' }}>⚡ Quick</span>}
                                                    {isTopBooked && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(217,119,6,.12)', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '.04em' }}>#1 Choice</span>}
                                                  </div>
                                                )}
                                                {/* Duration + Book Now row */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    {s.duration > 0 && (
                                                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: dm.fg40 }}>
                                                        <Clock style={{ width: 12, height: 12 }} />
                                                        {s.duration >= 60 ? `${(s.duration / 60).toFixed(1).replace('.0', '')} hrs` : `${s.duration} min`}
                                                      </span>
                                                    )}
                                                    {s.applicableFor?.length === 1 && (
                                                      <span style={{ fontSize: 11, color: dm.fg30 }}>{s.applicableFor[0] === 'male' ? '♂ Men' : '♀ Women'}</span>
                                                    )}
                                                  </div>
                                                  <motion.button whileTap={{ scale: .88 }}
                                                    onClick={e => { e.stopPropagation(); toggleService(s); }}
                                                    style={{ background: isSel ? 'rgba(124,58,237,.15)' : 'transparent', border: `1.5px solid ${isSel ? theme.p : theme.p}`, borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 800, color: isSel ? '#4ADE80' : theme.acc, letterSpacing: '.04em', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    {isSel ? <><Check style={{ width: 11, height: 11 }} /> ADDED</> : '+ ADD'}
                                                  </motion.button>
                                                </div>
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

                  {/* Packages */}
                  {packages.length > 0 && (
                    <div style={{ padding: '20px 16px 0' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: theme.acc, marginBottom: 12 }}>Packages &amp; Memberships</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {packages.map((pkg) => (
                          <div key={pkg._id} style={{ borderRadius: 14, padding: '16px', background: dm.b04, border: `1px solid ${theme.p}1a` }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                              <span style={{ fontSize: 26 }}>{pkg.icon || (pkg.type === 'package' ? '🎁' : '💳')}</span>
                              <div style={{ flex: 1 }}>
                                {pkg.tag && <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: theme.acc, marginBottom: 2 }}>{pkg.tag === 'popular' ? 'Most Popular' : pkg.tag === 'recommended' ? 'Recommended' : 'Best Value'}</p>}
                                <p style={{ fontSize: 15, fontWeight: 800, color: dm.fg }}>{pkg.name}</p>
                                {pkg.description && <p style={{ fontSize: 12, color: dm.fg40, marginTop: 3, lineHeight: 1.5 }}>{pkg.description}</p>}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div>
                                <p style={{ fontSize: 22, fontWeight: 900, color: dm.fg, letterSpacing: '-.03em' }}>₹{pkg.discountedPrice || pkg.price}</p>
                                {pkg.type === 'membership' && <p style={{ fontSize: 11, color: dm.fg32, marginTop: 1 }}>/{pkg.billingCycle === 'monthly' ? 'month' : pkg.billingCycle === 'quarterly' ? 'quarter' : 'year'}</p>}
                              </div>
                              <motion.button whileTap={{ scale: .96 }}
                                onClick={() => { if (!isCustomer()) { navigate('/login'); return; } setPkgReqModal(pkg); setPkgNote(''); }}
                                style={{ background: theme.p, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(124,58,237,.4)' }}>
                                {pkg.type === 'package' ? 'Buy Now' : 'Subscribe'}
                              </motion.button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── F2. REELS ── */}
              {activeTab === 'reels' && (
                <div style={{ padding: '4px 0' }}>
                  {salonVideoUrls.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 24px', color: dm.fg30 }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
                      <p style={{ fontWeight: 600 }}>No reels yet</p>
                    </div>
                  ) : (
                    <div className="glw-reel-grid">
                      {salonVideoUrls.map((url, i) => {
                        const thumb = url.replace('/upload/', '/upload/so_0,f_jpg,q_60,w_400/').replace(/\.(mp4|mov|webm)$/, '.jpg');
                        return (
                          <div key={url} className="glw-reel-cell" onClick={() => setVideoViewerIdx(i)}>
                            <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.25)' }} />
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,.18)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ width: 0, height: 0, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '14px solid #fff', marginLeft: 3 }} />
                            </div>
                            <div style={{ position: 'absolute', bottom: 8, left: 8 }}>
                              <p style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>{i + 1}/{salonVideoUrls.length}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── F3. PHOTOS ── */}
              {activeTab === 'photos' && (
                <div style={{ padding: '4px 0' }}>
                  {salonPhotoUrls.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 24px', color: dm.fg30 }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
                      <p style={{ fontWeight: 600 }}>No photos yet</p>
                    </div>
                  ) : (
                    <div className="glw-photo-grid">
                      {salonPhotoUrls.map((url, i) => (
                        <div key={url} className="glw-photo-cell" onClick={() => setGalleryLightbox(i)}>
                          <img src={url} alt="" loading={i < 4 ? 'eager' : 'lazy'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform .3s' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── F4. REVIEWS ── */}
              {activeTab === 'reviews' && (() => {
                const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
                reviews.forEach(r => { const s = Math.round(r.salonRating || r.rating || 5); starCounts[s] = (starCounts[s] || 0) + 1; });
                const recommendRate = reviews.length ? Math.round(reviews.filter(r => (r.salonRating || r.rating || 0) >= 4).length / reviews.length * 100) : 0;
                const filteredReviews = reviewFilter === 'with_photos' ? reviews.filter(r => r.photos?.length > 0) : reviews;
                const avatarColors = ['#e94560', '#8b5cf6', '#10b981', '#f59e0b', '#38bdf8'];
                return (
                  <div style={{ padding: '20px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <h3 style={{ fontSize: 18, fontWeight: 900, color: dm.fg, letterSpacing: '-.01em' }}>Reflections of Glow</h3>
                      <button onClick={() => navigate(`${salonPath(salon)}/reviews`)}
                        style={{ fontSize: 12, fontWeight: 700, color: theme.acc, background: 'rgba(124,58,237,.12)', border: '1px solid rgba(124,58,237,.3)', borderRadius: 999, padding: '6px 14px', cursor: 'pointer' }}>
                        Write Review
                      </button>
                    </div>
                    <p style={{ fontSize: 12, color: dm.fg35, marginBottom: 20 }}>Our community's experience with {salon.name}.</p>
                    {reviews.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: dm.fg30 }}>
                        <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
                        <p>No reviews yet. Be the first!</p>
                      </div>
                    ) : (
                      <>
                        <div style={{ borderRadius: 16, background: dm.b04, border: `1px solid ${dm.border1}`, padding: '20px', marginBottom: 20 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                            <div style={{ textAlign: 'center', flexShrink: 0 }}>
                              <p style={{ fontSize: 48, fontWeight: 900, color: dm.fg, lineHeight: 1, letterSpacing: '-.04em' }}>{avgRating || '—'}</p>
                              <div style={{ display: 'flex', gap: 2, justifyContent: 'center', margin: '4px 0' }}>
                                {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: 14, color: s <= Math.round(Number(avgRating || 0)) ? '#FDE68A' : dm.fg25 }}>★</span>)}
                              </div>
                              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: dm.fg35, marginTop: 2 }}>BASED ON {reviews.length}</p>
                            </div>
                            <div style={{ flex: 1 }}>
                              {[5,4,3,2,1].map(star => {
                                const pct = reviews.length > 0 ? Math.round((starCounts[star] || 0) / reviews.length * 100) : 0;
                                return (
                                  <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                                    <span style={{ fontSize: 10, color: dm.fg35, fontWeight: 600, width: 10, textAlign: 'right' }}>{star}</span>
                                    <span style={{ fontSize: 10, color: '#FDE68A' }}>★</span>
                                    <div className="glw-star-bar-track">
                                      <motion.div className="glw-star-bar-fill" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: .8, delay: (5-star)*.08 }} />
                                    </div>
                                    <span style={{ fontSize: 9, color: dm.fg35, fontWeight: 600, width: 26, textAlign: 'right' }}>{pct}%</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div style={{ borderTop: `1px solid ${dm.b07}`, paddingTop: 14, textAlign: 'center' }}>
                            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: dm.fg35, marginBottom: 4 }}>RECOMMENDATION RATE</p>
                            <p style={{ fontSize: 36, fontWeight: 900, color: dm.fg, letterSpacing: '-.03em' }}>{recommendRate}%</p>
                            <p style={{ fontSize: 11, color: dm.fg35, marginTop: 3 }}>of clients would recommend to a friend.</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                          {[{ key: 'all', label: 'All Reviews' }, { key: 'with_photos', label: 'With Photos' }].map(({ key, label }) => (
                            <button key={key} onClick={() => setReviewFilter(key)}
                              style={{ padding: '7px 16px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${reviewFilter === key ? theme.p : dm.b12}`, background: reviewFilter === key ? theme.p : 'transparent', color: reviewFilter === key ? '#fff' : dm.fg50 }}>
                              {label}
                            </button>
                          ))}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {filteredReviews.map((r, i) => {
                            const starRating = Math.round(r.salonRating || r.rating || 5);
                            const name = r.customerId?.name || r.customerName || 'Guest';
                            return (
                              <div key={r._id} style={{ borderRadius: 14, padding: '16px', background: dm.b04, border: `1px solid ${theme.p}1a` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                  <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: avatarColors[i % avatarColors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 14 }}>
                                    {name.charAt(0).toUpperCase()}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: dm.fg }}>{name}</p>
                                    <p style={{ fontSize: 10, color: dm.fg30 }}>
                                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : ''}
                                      {r.serviceId?.name && ` · ${r.serviceId.name}`}
                                    </p>
                                  </div>
                                  <div style={{ display: 'flex', gap: 1 }}>
                                    {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: 12, color: s <= starRating ? '#FDE68A' : dm.fg25 }}>★</span>)}
                                  </div>
                                </div>
                                {r.comment && <p style={{ fontSize: 13, color: dm.fg65, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>&ldquo;{r.comment}&rdquo;</p>}
                                {r.photos?.length > 0 && (
                                  <div style={{ display: 'flex', gap: 6, marginTop: 10, overflowX: 'auto' }}>
                                    {r.photos.map((p, pi) => (
                                      <img key={pi} src={typeof p === 'string' ? p : p?.url} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

            </motion.div>
          </AnimatePresence>

        </div>{/* end .glw-col */}
      </div>{/* end outer */}


      {/* ════ STICKY BOOKING BAR (unified — combo suggestions inside) ════ */}
      <AnimatePresence>
        {selectedServices.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="fixed bottom-[60px] left-0 right-0 z-[110] overflow-hidden"
            style={{ background: dm.barBg, borderTop: `1px solid ${theme.p}22`, boxShadow: `0 -12px 48px rgba(0,0,0,.55),0 0 0 1px ${theme.p}12`, transition: 'background .3s', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>


            {/* Main booking row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px' }}>
              {/* Left: icon + info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${theme.p}20` }}>
                  <ShoppingBag style={{ width: 20, height: 20, color: theme.p }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: dm.fg, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} · {selectedServices.map(s => s.name).join(', ')}
                  </p>
                  <p style={{ fontSize: 13, fontWeight: 800, color: theme.p, margin: '2px 0 0' }}>₹{totalPrice}</p>
                  {bestOffer
                    ? <p style={{ fontSize: 10, color: '#10b981', fontWeight: 600, margin: '2px 0 0' }}>🎫 Save ₹{bestOffer.discount} with {bestOffer.code}</p>
                    : offerGap
                      ? <p style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600, margin: '2px 0 0' }}>Add ₹{offerGap.gap} more → save ₹{offerGap.discount}</p>
                      : null
                  }
                </div>
              </div>
              {/* Right: clear + book */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <button onClick={() => setSelectedServices([])}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: dm.fg40, padding: '8px 4px' }}>
                  Clear
                </button>
                <motion.button whileTap={{ scale: .96 }} whileHover={{ scale: 1.03 }} onClick={handleBookNow}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: theme.p, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 20px', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: `0 4px 20px ${theme.p}45`, whiteSpace: 'nowrap' }}>
                  <Zap style={{ width: 14, height: 14 }} /> Book Now →
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
          onBook={() => { setVideoViewerIdx(null); setActiveTab('services'); }} />
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
                  <div style={{ position:'absolute',top:-50,right:-30,width:150,height:150,borderRadius:'50%',background:dm.b07,pointerEvents:'none' }} />
                  <div style={{ position:'absolute',top:-15,right:70,width:90,height:90,borderRadius:'50%',background:dm.b04,pointerEvents:'none' }} />
                  <div className="w-10 h-1 rounded-full bg-white/30 mx-auto mb-4" />
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-extrabold text-white">Book Appointment</h2>
                      <p className="text-xs text-white/70 mt-0.5 truncate max-w-[220px]">
                        {salon.name}{selectedServices.length > 0 && ` · ${selectedServices.map(s => s.name).join(', ')}`}
                      </p>
                    </div>
                    <button onClick={() => setShowBooking(false)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: dm.fg25 }}>
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                  {selectedServices.length > 0 && (
                    <div className="mt-3 flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: dm.b12 }}>
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
    </>
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
  .svv-heart-burst { animation: svvHeartBurst 0.42s ease forwards; pointer-events: none; }
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

  // Locality

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
  const city      = [salon?.locality, salon?.city].filter(Boolean).join(', ') || salon?.address || '';
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

  // Share — opens native share sheet, falls back to clipboard copy
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}${salonPath(salon)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: salon.name, text: `Check out ${salon.name} on GlowLoox!`, url });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
        // share failed, fall through to clipboard
      }
    }
    try { await navigator.clipboard?.writeText(url); } catch {}
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
      setTimeout(() => setDoubleTapHeart(false), 420);
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
                        <svg viewBox="0 0 24 24" width={58} height={58} fill="#ef4444" style={{ filter: 'drop-shadow(0 0 14px rgba(239,68,68,0.9)) drop-shadow(0 0 28px rgba(239,68,68,0.5))' }}>
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
