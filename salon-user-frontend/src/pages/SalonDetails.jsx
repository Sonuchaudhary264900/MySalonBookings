import { useParams, useNavigate } from "react-router-dom";
import SEOHead from "../components/SEOHead";
import { useEffect, useState, useRef, useCallback, useLayoutEffect } from "react";
import {
  Scissors, Phone, Star, Check, MessageSquare, Frown, Building2,
  Mail, ShoppingBag, MapPin, Navigation, ChevronDown, ChevronUp,
  Clock, Sparkles, Award, Users, ArrowLeft, Zap, X, Calendar,
  User, Tag, CreditCard, CheckCircle, Gift, Play, ChevronLeft, ChevronRight, Heart,
} from "lucide-react";
import API from "../services/api";
import ServiceCard from "../components/ServiceCard";
import ReviewCard from "../components/ReviewCard";
import { isCustomer, clearCustomerAuth } from "../utils/auth";
import { formatDate } from "../utils/formatters";
import { useNotifications } from "../context/NotificationContext";
import {
  UNISEX_CATEGORIES,
  CATEGORY_ICON_MAP,
  ALL_CATEGORY_ORDER,
  MALE_ONLY_CAT_LABELS,
  FEMALE_ONLY_CAT_LABELS,
} from "../constants/salonCategories";

const BASE_TABS = ["Services", "Packages", "Reviews", "Info"];

// ── Working hours helpers (shared with SalonCard) ─────────────────────────────
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
// ─────────────────────────────────────────────────────────────────────────────

// ── Booking helpers ──────────────────────────────────────────────────────────
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
// ────────────────────────────────────────────────────────────────────────────

function SalonDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast, addNotification } = useNotifications();
  const token = localStorage.getItem("customerToken");

  // ── Salon details state ──────────────────────────────────────────────────
  const [salon, setSalon]           = useState(null);
  const [services, setServices]     = useState([]);
  const [reviews, setReviews]       = useState([]);
  const [offers, setOffers]         = useState([]);
  const [packages, setPackages]     = useState([]);
  const [tab, setTab]               = useState("Services");
  const [loading, setLoading]       = useState(true);

  // Package request modal state
  const [pkgReqModal, setPkgReqModal]   = useState(null); // the pkg being requested
  const [pkgNote, setPkgNote]           = useState('');
  const [pkgReqLoading, setPkgReqLoading] = useState(false);
  const [selectedServices, setSelectedServices] = useState([]);
  const [serviceGenderFilter, setServiceGenderFilter] = useState("all");
  const [expandedCat, setExpandedCat] = useState(null);

  const TABS = BASE_TABS;
  const activeTab = TABS.includes(tab) ? tab : "Services";

  // ── Booking state ────────────────────────────────────────────────────────
  const [galleryLightbox, setGalleryLightbox] = useState(null); // index into galleryItems
  const galleryVideoRef = useRef(null);
  const [videoViewerIdx, setVideoViewerIdx] = useState(null); // index into salonVideoUrls
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

  // ── Computed booking values ──────────────────────────────────────────────
  const totalPrice    = selectedServices.reduce((s, x) => s + (x.basePrice || x.price || 0), 0);
  const totalDuration = selectedServices.reduce((s, x) => s + (x.duration || 0), 0);
  const finalPrice    = Math.max(0, totalPrice - couponDiscount);
  const advanceDays   = salon?.advanceBookingDays ?? 7;
  const maxDateStr    = localDate(advanceDays);
  const dateDays      = Array.from({ length: Math.max(advanceDays + 1, 8) }, (_, i) => localDate(i));

  // ── Auto-set gender filter from profile ─────────────────────────────────
  useEffect(() => {
    if (!token) return;
    API.get("/customer/auth/me")
      .then((res) => {
        const gender = res.data?.data?.gender || res.data?.gender;
        if (gender === "male" || gender === "female") setServiceGenderFilter(gender);
      })
      .catch(() => {});
  }, [token]);

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([loadSalon(), loadServices(), loadReviews(), loadBarbers(), loadOffers(), loadPackages()]).finally(() => setLoading(false));
  }, [id]);

  const loadSalon = async () => {
    try {
      const r = await API.get(`/public/salons/${id}`);
      const data = r.data.data || r.data.salon;
      setSalon(data);
      // Immediately seed offers from topOffer — guarantees something shows even if /offers call fails
      if (data?.topOffer) setOffers(prev => prev.length > 0 ? prev : [data.topOffer]);
    } catch {}
  };
  const loadServices = async () => { try { const r = await API.get(`/public/salons/${id}/services`); setServices(r.data.data?.services || r.data.data || []); } catch {} };
  const loadReviews  = async () => { try { const r = await API.get(`/public/salons/${id}/reviews`);  setReviews(r.data.data?.reviews || r.data.data || []); } catch {} };
  const loadBarbers  = async () => { try { const r = await API.get(`/public/salons/${id}/barbers`).catch(() => ({ data: { data: { barbers: [] } } })); setBarbers(r.data.data?.barbers || []); } catch {} };
  const loadOffers   = async () => { try { const r = await API.get(`/public/salons/${id}/offers`); const list = r.data.data?.offers || []; if (list.length > 0) setOffers(list); } catch {} };
  const loadPackages = async () => { try { const r = await API.get(`/public/salons/${id}/packages`); setPackages(r.data.data?.packages || []); } catch {} };

  // ── Slot fetch when booking modal open + date/duration changes ───────────
  useEffect(() => {
    if (!showBooking || !totalDuration || !id) return;
    setSlot("");
    setSlots([]);
    setBlockedSlots([]);
    setClosedDay(false);
    const fetchSlots = async () => {
      setSlotsLoading(true);
      try {
        const res = await API.get(`/public/salons/${id}/booked-slots?date=${bookDate}&duration=${totalDuration}`);
        const data = res.data.data || {};
        const mode = data.bookingMode || "sequential";
        setBookingMode(mode);
        setSlots(data.slots || []);
        setBlockedSlots(data.blockedSlots || []);
        setClosedDay(data.closedDay || false);
        if (mode === "sequential" && data.slots?.length === 1) setSlot(data.slots[0]);
      } catch { setSlots([]); } finally { setSlotsLoading(false); }
    };
    fetchSlots();
  }, [bookDate, id, totalDuration, showBooking]);

  // ── Service selection ────────────────────────────────────────────────────
  const toggleService = (service) => {
    setSelectedServices(prev =>
      prev.find(s => s._id === service._id)
        ? prev.filter(s => s._id !== service._id)
        : [...prev, service]
    );
  };

  // ── Open booking drawer ──────────────────────────────────────────────────
  const openBooking = () => {
    if (!isCustomer()) {
      clearCustomerAuth();
      navigate("/login", { state: { from: `/salons/${id}` } });
      return;
    }
    setBookDate(todayStr);
    setSlot("");
    setBarberId("");
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponInput("");
    setCouponError("");
    setBookingSuccess(false);
    setBookError("");
    setShowBooking(true);
  };

  const handleBookNow      = () => { if (selectedServices.length === 0) { addToast("error", "Please select at least one service."); return; } openBooking(); };
  const handleBookNowEmpty = () => openBooking();

  // ── Coupon ───────────────────────────────────────────────────────────────
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

  // ── Package request ──────────────────────────────────────────────────────
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

  // ── Confirm booking ──────────────────────────────────────────────────────
  const handleConfirm = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!slot) { setBookError("Please select a time slot."); return; }
    setBookError(""); setBookingLoading(true);
    try {
      const res = await API.post("/customer/bookings", {
        salonId: id,
        serviceIds: selectedServices.map(s => s._id),
        barberId: barberId || undefined,
        appointmentDate: bookDate,
        appointmentTime: slot,
        paymentMethod: "cash",
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
    } catch (err) {
      setBookError(err.message || "Booking failed. Please try again.");
      addToast("error", err.message || "Booking failed. Please try again.");
    } finally { setBookingLoading(false); }
  };

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="t-page">
        <div className="h-80 skeleton" />
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          <div className="h-8 skeleton rounded-xl w-2/3" />
          <div className="h-4 skeleton rounded w-1/2" />
          <div className="flex gap-2 mt-3">
            {[1,2,3].map(i => <div key={i} className="h-8 skeleton rounded-full w-24" />)}
          </div>
          <div className="h-12 skeleton rounded-xl mt-4" />
          {[1,2,3].map(i => <div key={i} className="h-24 skeleton rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="t-page min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4"><Frown className="w-12 h-12" style={{ color: 'var(--t-text-3)' }} /></div>
          <p className="mb-4" style={{ color: 'var(--t-text-2)' }}>Salon not found.</p>
          <button onClick={() => navigate("/")} className="btn-primary">Go Home</button>
        </div>
      </div>
    );
  }

  const avgRating = salon.averageRating || salon.rating
    ? parseFloat(salon.averageRating || salon.rating).toFixed(1)
    : null;

  // Normalize — DB may return plain strings or objects {url,...}
  const salonPhotoUrls = (salon.photos || [])
    .map(p => (typeof p === 'string' ? p : p?.url)).filter(Boolean);
  const salonVideoUrls = (salon.videos || [])
    .map(v => (typeof v === 'string' ? v : v?.url)).filter(Boolean);
  const galleryItems = [
    ...salonPhotoUrls.map(url => ({ url, type: 'image' })),
    ...salonVideoUrls.map(url => ({ url, type: 'video' })),
  ];

  const openStatus = isOpenNow(salon.workingHours);
  const todayHours = getTodayHours(salon.workingHours);
  const opensAt    = getOpensAt(salon.workingHours);
  const nextSlot   = getNextSlot(salon.workingHours);
  const totalBookings = salon.totalBookings || 0;


  const dayOrder = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
  const TAB_ICONS = { Services: <Scissors className="w-4 h-4" />, Packages: <Gift className="w-4 h-4" />, Reviews: <Star className="w-4 h-4" />, Info: <Building2 className="w-4 h-4" /> };

  const salonCity = salon.city || salon.address?.city || '';
  const salonSchema = {
    '@type': 'LocalBusiness',
    name: salon.name,
    url: `https://mysalonbookings.com/salon/${id}`,
    image: salon.coverPhoto || salon.image || salon.photos?.[0] || 'https://mysalonbookings.com/icon.png',
    description: salon.description || `Book appointments at ${salon.name}${salonCity ? ` in ${salonCity}` : ''} — verified salon on MySalonBookings.`,
    telephone: salon.phone || salon.ownerPhone || undefined,
    address: salonCity ? { '@type': 'PostalAddress', addressLocality: salonCity, addressCountry: 'IN' } : undefined,
    ...(salon.rating ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: salon.rating, reviewCount: salon.reviewCount || 1, bestRating: 5 } } : {}),
  };

  return (
    <>
      <SEOHead
        title={`${salon.name}${salonCity ? ` in ${salonCity}` : ''} — Book Online | MySalonBookings`}
        description={`Book appointments at ${salon.name}${salonCity ? ` in ${salonCity}` : ''}. View services, prices, reviews and available slots. Instant online booking — no calls needed.`}
        canonical={`https://mysalonbookings.com/salon/${id}`}
        schema={salonSchema}
      />
    <div className="t-page">

      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      <div className="relative h-72 sm:h-96 overflow-hidden" style={{ background: 'linear-gradient(135deg,#312e81 0%,#4c1d95 50%,#1e1b4b 100%)' }}>
        {(salon.coverPhoto || salon.image || salon.photos?.[0] || salon.ownerPhoto) ? (
          <img
            src={salon.coverPhoto || salon.image || salon.photos?.[0] || salon.ownerPhoto}
            alt={salon.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Scissors className="w-20 h-20 text-white/10" />
          </div>
        )}

        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.15) 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, transparent 60%)' }} />

        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {salon.isApproved && (
          <div
            className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ background: 'rgba(34,197,94,0.2)', backdropFilter: 'blur(8px)', border: '1px solid rgba(34,197,94,0.4)', color: '#4ade80' }}
          >
            <Check className="w-3 h-3" /> Verified
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 pt-8">
          {avgRating && parseFloat(avgRating) >= 4.0 && (
            <div className="flex items-center gap-1.5 mb-2">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                style={{ background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24' }}
              >
                <Award className="w-3 h-3" /> Top Rated in Your Area
              </div>
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-1">{salon.name}</h1>

          {(salon.address || salon.city) && (
            <p className="flex items-center gap-1.5 text-sm text-white/75 mb-3">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {salon.address || salon.city}
            </p>
          )}

          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {avgRating && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold"
                style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.35)', color: '#fbbf24' }}>
                <Star className="w-3.5 h-3.5 fill-current" /> {avgRating}
                {(salon.totalReviews || salon.reviewCount || reviews.length) > 0 && <span className="font-normal text-white/60 text-xs">({salon.totalReviews || salon.reviewCount || reviews.length})</span>}
              </div>
            )}
            {services.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white/75"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Scissors className="w-3 h-3" /> {services.length} Services
              </div>
            )}
          </div>

          <div className="flex gap-2.5 flex-wrap">
            <button
              onClick={handleBookNowEmpty}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:scale-105 hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}
            >
              <Zap className="w-4 h-4" /> Book Now
            </button>
            {salon.phone && (
              <a
                href={`tel:${salon.phone}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-105"
                style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <Phone className="w-4 h-4" /> Call
              </a>
            )}
            {(salon.address || salon.city) && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(salon.address || salon.city)}`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-105"
                style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <Navigation className="w-4 h-4" /> Directions
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ══ TRUST STRIP ═══════════════════════════════════════════════════ */}
      <div className="border-b" style={{ borderColor: 'var(--t-border)', background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, var(--t-card) 60%)' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3 overflow-x-auto scrollbar-hide text-xs font-semibold whitespace-nowrap">
          {/* Open / Closed status */}
          {openStatus !== null && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{
                background: openStatus ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)',
                color: openStatus ? '#10b981' : '#ef4444',
                border: `1px solid ${openStatus ? 'rgba(16,185,129,0.28)' : 'rgba(239,68,68,0.22)'}`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: openStatus ? '#10b981' : '#ef4444' }} />
              {openStatus ? 'Open Now' : opensAt ? `Opens ${opensAt}` : 'Closed'}
            </div>
          )}
          {todayHours && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)', color: '#818cf8' }}>
              <Clock className="w-3.5 h-3.5" />
              <span>{todayHours}</span>
            </div>
          )}
          {avgRating && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', color: '#f59e0b' }}>
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>{avgRating} Rating</span>
            </div>
          )}
          {(() => {
            const rc = salon.totalReviews || salon.reviewCount || reviews.length;
            return (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)', color: rc > 0 ? '#818cf8' : 'var(--t-text-3)' }}>
                <Users className="w-3.5 h-3.5" />
                <span>{rc > 0 ? `${rc} ${rc === 1 ? "Review" : "Reviews"}` : "No reviews yet"}</span>
              </div>
            );
          })()}
          {salon.isApproved && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981' }}>
              <Check className="w-3.5 h-3.5" />
              <span>Verified</span>
            </div>
          )}
          {services.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)', color: '#818cf8' }}>
              <Scissors className="w-3.5 h-3.5" />
              <span>{services.length} Services</span>
            </div>
          )}
          {totalBookings >= 10 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: '#f87171' }}>
              <span>🔥</span>
              <span>{totalBookings >= 1000 ? `${(totalBookings/1000).toFixed(1)}k` : `${totalBookings}+`} booked</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)', color: '#a78bfa' }}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>Instant Booking</span>
          </div>
        </div>
      </div>

      {/* ══ QUICK INFO ROW ═════════════════════════════════════════════════ */}
      {(nextSlot || salon.minPrice || salon.kidsHaircut || salon.atHomeServices) && (
        <div className="border-b" style={{ borderColor: 'var(--t-border)', background: 'linear-gradient(135deg, rgba(99,102,241,0.04) 0%, var(--t-bg-2) 60%)' }}>
          <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center gap-3 overflow-x-auto scrollbar-hide whitespace-nowrap">
            {nextSlot && (
              <span
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.18)', color: 'var(--t-accent)' }}
              >
                ⏱ Next slot: {nextSlot}
              </span>
            )}
            {salon.minPrice && (
              <span
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', color: 'var(--t-accent)' }}
              >
                💰 From ₹{salon.minPrice}
              </span>
            )}
            {salon.kidsHaircut && (
              <span
                className="text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(234,179,8,0.12)', color: '#f59e0b', border: '1px solid rgba(234,179,8,0.2)' }}
              >
                👶 Kids Haircut
              </span>
            )}
            {salon.atHomeServices && (
              <span
                className="text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
              >
                🏠 At-Home Service
              </span>
            )}
          </div>
        </div>
      )}

      {/* ══ CONTENT ════════════════════════════════════════════════════════ */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 pb-2">

        {/* Info chips */}
        <div className="flex flex-wrap gap-2 mb-5">
          {salon.servedGender && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all hover:scale-105"
              style={
                salon.servedGender === 'male'   ? { background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' } :
                salon.servedGender === 'female' ? { background: 'rgba(236,72,153,0.12)', color: '#f472b6', border: '1px solid rgba(236,72,153,0.2)' } :
                                                  { background: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }
              }>
              {salon.servedGender === 'male' ? '👨' : salon.servedGender === 'female' ? '👩' : '👥'}
              {' '}{salon.servedGender === 'male' ? 'Men' : salon.servedGender === 'female' ? 'Women' : 'Unisex'}
            </span>
          )}
          {salon.ownerGender && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-105"
              style={
                salon.ownerGender === 'male'   ? { background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' } :
                salon.ownerGender === 'female' ? { background: 'rgba(236,72,153,0.12)', color: '#f472b6', border: '1px solid rgba(236,72,153,0.2)' } :
                                                 { background: 'rgba(148,163,184,0.1)', color: 'var(--t-text-2)', border: '1px solid var(--t-border)' }
              }>
              {salon.ownerGender === 'male' ? '👨' : salon.ownerGender === 'female' ? '👩' : '🧑'}
              {' Owner: '}{salon.ownerGender.charAt(0).toUpperCase() + salon.ownerGender.slice(1)}
            </span>
          )}
          {salon.phone && (
            <a href={`tel:${salon.phone}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-105"
              style={{ background: 'var(--t-bg-2)', color: 'var(--t-text-2)', border: '1px solid var(--t-border)' }}>
              <Phone className="w-3 h-3" /> {salon.phone}
            </a>
          )}
        </div>

        {/* Offers / promo section — uses /offers API list or falls back to salon.topOffer */}
        {(() => {
          const allOffers = offers.length > 0 ? offers : salon.topOffer ? [salon.topOffer] : [];
          if (allOffers.length === 0) return null;
          return (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-sm font-bold" style={{ color: 'var(--t-text)' }}>🏷️ Offers & Coupons</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(16,185,129,0.12)', color: '#059669' }}>{allOffers.length}</span>
            </div>
            <div className="space-y-2">
              {allOffers.map((offer) => {
                const offerLabel = offer.discountType === "percentage"
                  ? `${offer.discountValue}% OFF${offer.minAmount > 0 ? ` on ₹${offer.minAmount}+` : ""}`
                  : `₹${offer.discountValue} OFF${offer.minAmount > 0 ? ` on ₹${offer.minAmount}+` : ""}`;
                const isFire     = !offer.isExpiringSoon && !offer.isLimited;
                const borderClr  = offer.isExpiringSoon ? 'rgba(245,158,11,0.35)' : offer.isLimited ? 'rgba(239,68,68,0.28)' : 'rgba(16,185,129,0.25)';
                const bgClr      = offer.isExpiringSoon ? 'rgba(245,158,11,0.07)' : offer.isLimited ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.07)';
                const textClr    = offer.isExpiringSoon ? '#d97706' : offer.isLimited ? '#dc2626' : '#059669';
                return (
                  <div key={offer.code}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ background: bgClr, border: `1px solid ${borderClr}` }}
                  >
                    <span style={{ fontSize: 20 }}>{offer.isExpiringSoon ? '⏰' : offer.isLimited ? '🔥' : '🏷️'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold" style={{ color: textClr }}>{offerLabel}</span>
                        {offer.isExpiringSoon && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.15)', color: '#d97706', border: '1px solid rgba(245,158,11,0.3)' }}>
                            ⏰ Expiring Soon
                          </span>
                        )}
                        {offer.isLimited && !offer.isExpiringSoon && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.12)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.25)' }}>
                            ⚡ Limited Offer
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {offer.expiresLabel && (
                          <span className="text-[11px]" style={{ color: offer.isExpiringSoon ? '#d97706' : 'var(--t-text-3)' }}>
                            {offer.daysLeft === 0 ? '🔴' : offer.daysLeft === 1 ? '🟡' : '🟢'} {offer.expiresLabel}
                          </span>
                        )}
                        {offer.remaining !== null && (
                          <span className="text-[11px] font-semibold" style={{ color: offer.isLimited ? '#dc2626' : 'var(--t-text-3)' }}>
                            {offer.remaining <= 5 ? `🔴 Only ${offer.remaining} left!` : offer.remaining <= 10 ? `🟡 Only ${offer.remaining} left` : `${offer.remaining} uses left`}
                          </span>
                        )}
                        {offer.description && (
                          <span className="text-[11px]" style={{ color: 'var(--t-text-3)' }}>{offer.description}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => { setCouponInput(offer.code); if (!showBooking) openBooking(); }}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl shrink-0 transition-all hover:scale-105"
                      style={{ background: `rgba(${offer.isExpiringSoon ? '245,158,11' : offer.isLimited ? '239,68,68' : '5,150,105'},0.15)`, color: textClr, border: `1px solid ${borderClr}`, letterSpacing: '0.5px' }}
                    >
                      {offer.code}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          );
        })()}

        {/* ── TABS ── */}
        <div
          className="flex gap-1 rounded-xl p-1 mb-6"
          style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)' }}
        >
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5"
              style={
                activeTab === t
                  ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', boxShadow: '0 2px 12px rgba(99,102,241,0.3)' }
                  : { color: 'var(--t-text-2)' }
              }
            >
              {TAB_ICONS[t]}
              {t}
              {(t === "Services" && services.length > 0) || (t === "Packages" && packages.length > 0) || (t === "Reviews" && reviews.length > 0) ? (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: activeTab === t ? 'rgba(255,255,255,0.25)' : 'var(--t-bg-2)' }}
                >
                  {t === "Services" ? services.length : t === "Packages" ? packages.length : reviews.length}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* ══ SERVICES TAB ═══════════════════════════════════════════════ */}
        {activeTab === "Services" && (() => {
          const isUnisex = salon.servedGender === "unisex";

          const classifySvc = (s) => {
            const af = s.applicableFor || [];
            if (af.length > 0 && af.includes("male")   && !af.includes("female")) return "male";
            if (af.length > 0 && af.includes("female") && !af.includes("male"))   return "female";
            const uniCat = UNISEX_CATEGORIES.find(u => u.label === (s.category || ""));
            if (uniCat) {
              const inM = new Set(uniCat.maleSubServices).has(s.name);
              const inF = new Set(uniCat.femaleSubServices).has(s.name);
              if (inM && !inF) return "male";
              if (inF && !inM) return "female";
            }
            return "both";
          };

          const visibleServices = !isUnisex || serviceGenderFilter === "all"
            ? services
            : services.filter((s) => {
                const cat = s.category || "";
                if (serviceGenderFilter === "female" && MALE_ONLY_CAT_LABELS.has(cat))   return false;
                if (serviceGenderFilter === "male"   && FEMALE_ONLY_CAT_LABELS.has(cat)) return false;
                const gender = classifySvc(s);
                return gender === "both" || gender === serviceGenderFilter;
              });

          const grouped = visibleServices.reduce((acc, svc) => {
            const cat = svc.category || "Other";
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(svc);
            return acc;
          }, {});

          const sortedGroupEntries = Object.entries(grouped).sort(([a], [b]) => {
            const ai = ALL_CATEGORY_ORDER.indexOf(a), bi = ALL_CATEGORY_ORDER.indexOf(b);
            if (ai === -1 && bi === -1) return a.localeCompare(b);
            if (ai === -1) return 1; if (bi === -1) return -1;
            return ai - bi;
          });

          return (
            <div className="fade-in">
              {isUnisex && services.length > 0 && (
                <div className="flex gap-2 mb-5">
                  {[
                    { key: "all",    label: "All",       emoji: "👥" },
                    { key: "male",   label: "For Men",   emoji: "👨" },
                    { key: "female", label: "For Women", emoji: "👩" },
                  ].map(({ key, label, emoji }) => (
                    <button
                      key={key}
                      onClick={() => setServiceGenderFilter(key)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-200 hover:scale-105"
                      style={
                        serviceGenderFilter === key
                          ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }
                          : { background: 'var(--t-bg-2)', color: 'var(--t-text-2)', border: '1px solid var(--t-border)' }
                      }
                    >
                      <span>{emoji}</span> {label}
                    </button>
                  ))}
                </div>
              )}

              {visibleServices.length === 0 ? (
                <div className="text-center py-16">
                  <div className="flex justify-center mb-3"><Scissors className="w-10 h-10" style={{ color: 'var(--t-border)' }} /></div>
                  <p style={{ color: 'var(--t-text-2)' }}>No services listed yet.</p>
                </div>
              ) : (
                <div className="space-y-2.5 pb-32">
                  {sortedGroupEntries.map(([cat, catServices]) => {
                    const isOpen = expandedCat === cat;
                    const showGenderSplit = isUnisex && serviceGenderFilter === "all";
                    const maleOnly   = showGenderSplit ? catServices.filter(s => classifySvc(s) === "male")   : [];
                    const femaleOnly = showGenderSplit ? catServices.filter(s => classifySvc(s) === "female") : [];
                    const both       = showGenderSplit ? catServices.filter(s => classifySvc(s) === "both")   : catServices;
                    const hasSplit   = showGenderSplit && (maleOnly.length > 0 || femaleOnly.length > 0);

                    return (
                      <div key={cat} className="rounded-2xl overflow-hidden transition-all duration-200"
                        style={{
                          background: 'var(--t-card)',
                          border: isOpen ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--t-border)',
                          boxShadow: isOpen ? '0 4px 24px rgba(99,102,241,0.08)' : 'none',
                        }}>
                        <button
                          type="button"
                          onClick={() => setExpandedCat(isOpen ? null : cat)}
                          className="w-full flex items-center gap-3 px-4 py-3.5 transition-all text-left"
                          style={{ color: 'var(--t-text)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--t-bg-2)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                            style={{ background: isOpen ? 'rgba(99,102,241,0.15)' : 'var(--t-bg-2)' }}>
                            {CATEGORY_ICON_MAP[cat] || "✨"}
                          </div>
                          <span className="text-sm font-semibold flex-1" style={{ color: 'var(--t-text)' }}>{cat}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full mr-1 font-medium"
                            style={{ background: isOpen ? 'rgba(99,102,241,0.12)' : 'var(--t-bg-2)', color: isOpen ? '#818cf8' : 'var(--t-text-3)' }}>
                            {catServices.length}
                          </span>
                          {isOpen
                            ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: '#818cf8' }} />
                            : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--t-text-3)' }} />}
                        </button>

                        {isOpen && (
                          <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid var(--t-border)' }}>
                            <div className="pt-3">
                              {hasSplit ? (
                                <>
                                  {maleOnly.length > 0 && (
                                    <div className="mb-3">
                                      <p className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: '#60a5fa' }}>👨 Men's Services</p>
                                      <div className="space-y-2">
                                        {maleOnly.map(s => (
                                          <ServiceCard key={s._id} service={s} isSelected={selectedServices.some(x => x._id === s._id)} onToggle={() => toggleService(s)} showGenderBadge={false} />
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {femaleOnly.length > 0 && (
                                    <div className="mb-3">
                                      <p className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: '#f472b6' }}>👩 Women's Services</p>
                                      <div className="space-y-2">
                                        {femaleOnly.map(s => (
                                          <ServiceCard key={s._id} service={s} isSelected={selectedServices.some(x => x._id === s._id)} onToggle={() => toggleService(s)} showGenderBadge={false} />
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {both.length > 0 && (
                                    <div className="space-y-2">
                                      {both.map(s => (
                                        <ServiceCard key={s._id} service={s} isSelected={selectedServices.some(x => x._id === s._id)} onToggle={() => toggleService(s)} showGenderBadge={false} />
                                      ))}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="space-y-2">
                                  {catServices.map(s => (
                                    <ServiceCard key={s._id} service={s} isSelected={selectedServices.some(x => x._id === s._id)} onToggle={() => toggleService(s)} showGenderBadge={false} />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* ══ PACKAGES TAB ═══════════════════════════════════════════════ */}
        {activeTab === "Packages" && (
          <div className="fade-in pb-8 space-y-4">
            {packages.length === 0 ? (
              <div className="text-center py-14">
                <div className="flex justify-center mb-3"><Gift className="w-10 h-10" style={{ color: 'var(--t-border)' }} /></div>
                <p className="font-semibold" style={{ color: 'var(--t-text-2)' }}>No packages or memberships yet</p>
                <p className="text-sm mt-1" style={{ color: 'var(--t-text-3)' }}>This salon hasn't added any packages.</p>
              </div>
            ) : (
              <>
                {/* Packages */}
                {packages.filter(p => p.type === 'package').length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
                      <Gift className="w-4 h-4" style={{ color: '#6366f1' }} /> Service Packages
                    </h3>
                    <div className="space-y-3">
                      {packages.filter(p => p.type === 'package').map(pkg => (
                        <div key={pkg._id} className="rounded-2xl p-4" style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)' }}>
                          <div className="flex items-start gap-3 mb-3">
                            <span className="text-2xl shrink-0">{pkg.icon || '🎁'}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm" style={{ color: 'var(--t-text)' }}>{pkg.name}</span>
                                {pkg.tag && pkg.tag !== '' && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                    style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>
                                    {pkg.tag === 'popular' ? '🔥 Popular' : pkg.tag === 'recommended' ? '⭐ Recommended' : '💰 Best Value'}
                                  </span>
                                )}
                              </div>
                              {pkg.description && <p className="text-xs mt-0.5" style={{ color: 'var(--t-text-3)' }}>{pkg.description}</p>}
                            </div>
                          </div>
                          {pkg.services?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {pkg.services.map((s, i) => (
                                <span key={i} className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--t-bg-2)', color: 'var(--t-text-2)' }}>
                                  {s.serviceName}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl font-extrabold" style={{ color: '#6366f1' }}>₹{pkg.discountedPrice}</span>
                              {pkg.originalPrice > 0 && pkg.originalPrice !== pkg.discountedPrice && (
                                <>
                                  <span className="text-xs line-through" style={{ color: 'var(--t-text-3)' }}>₹{pkg.originalPrice}</span>
                                  <span className="text-xs font-bold" style={{ color: '#22c55e' }}>{pkg.discountPercent}% OFF</span>
                                </>
                              )}
                            </div>
                            <button
                              onClick={() => { if (!isCustomer()) { navigate('/login'); return; } setPkgReqModal(pkg); setPkgNote(''); }}
                              className="text-sm font-semibold px-4 py-2 rounded-xl transition-all"
                              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff' }}
                            >
                              Buy Now
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Memberships */}
                {packages.filter(p => p.type === 'membership').length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
                      <CreditCard className="w-4 h-4" style={{ color: '#8b5cf6' }} /> Membership Plans
                    </h3>
                    <div className="space-y-3">
                      {packages.filter(p => p.type === 'membership').map(pkg => (
                        <div key={pkg._id} className="rounded-2xl p-4" style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)' }}>
                          <div className="flex items-start gap-3 mb-3">
                            <span className="text-2xl shrink-0">{pkg.icon || '💳'}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm" style={{ color: 'var(--t-text)' }}>{pkg.name}</span>
                                {pkg.tag && pkg.tag !== '' && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                    style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa' }}>
                                    {pkg.tag === 'popular' ? '🔥 Popular' : pkg.tag === 'recommended' ? '⭐ Recommended' : '💰 Best Value'}
                                  </span>
                                )}
                              </div>
                              {pkg.description && <p className="text-xs mt-0.5" style={{ color: 'var(--t-text-3)' }}>{pkg.description}</p>}
                            </div>
                          </div>
                          <div className="space-y-1.5 mb-3">
                            {pkg.benefits?.discountPercent > 0 && (
                              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--t-text-2)' }}>
                                <Tag className="w-3.5 h-3.5 shrink-0" style={{ color: '#8b5cf6' }} />
                                {pkg.benefits.discountPercent}% off all services
                              </div>
                            )}
                            {pkg.benefits?.priorityBooking && (
                              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--t-text-2)' }}>
                                <Zap className="w-3.5 h-3.5 shrink-0" style={{ color: '#fbbf24' }} />
                                Priority booking
                              </div>
                            )}
                            {(pkg.benefits?.freeServices || []).map((fs, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs" style={{ color: 'var(--t-text-2)' }}>
                                <Check className="w-3.5 h-3.5 shrink-0" style={{ color: '#22c55e' }} />
                                {fs.serviceName} × {fs.usageLimit}
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xl font-extrabold" style={{ color: '#8b5cf6' }}>₹{pkg.price}</span>
                                <span className="text-xs" style={{ color: 'var(--t-text-3)' }}>
                                  /{pkg.billingCycle === 'monthly' ? 'month' : pkg.billingCycle === 'quarterly' ? 'quarter' : 'year'}
                                </span>
                              </div>
                              <p className="text-xs" style={{ color: 'var(--t-text-3)' }}>Valid {pkg.durationDays} days</p>
                            </div>
                            <button
                              onClick={() => { if (!isCustomer()) { navigate('/login'); return; } setPkgReqModal(pkg); setPkgNote(''); }}
                              className="text-sm font-semibold px-4 py-2 rounded-xl transition-all"
                              style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff' }}
                            >
                              Subscribe
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══ REVIEWS TAB ════════════════════════════════════════════════ */}
        {activeTab === "Reviews" && (
          <div className="fade-in pb-8">
            {reviews.length > 0 && avgRating && (
              <div className="rounded-2xl p-5 mb-5 flex items-center gap-5"
                style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)' }}>
                <div className="text-center shrink-0">
                  <div className="text-4xl font-extrabold" style={{ color: 'var(--t-text)' }}>{avgRating}</div>
                  <div className="flex items-center gap-0.5 justify-center my-1">
                    {[1,2,3,4,5].map(s => (
                      <span key={s} style={{ color: s <= Math.round(parseFloat(avgRating)) ? '#fbbf24' : 'var(--t-border)' }}>★</span>
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--t-text-3)' }}>{reviews.length} reviews</p>
                </div>
                <div className="flex-1">
                  {[5,4,3,2,1].map(star => {
                    const count = reviews.filter(r => Math.round(r.salonRating || r.rating || 5) === star).length;
                    const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 mb-1">
                        <span className="text-xs w-2 shrink-0" style={{ color: 'var(--t-text-3)' }}>{star}</span>
                        <span style={{ color: '#fbbf24', fontSize: 10 }}>★</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--t-bg-2)' }}>
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: pct > 60 ? '#fbbf24' : pct > 30 ? '#fb923c' : '#f87171' }} />
                        </div>
                        <span className="text-xs w-4 shrink-0 text-right" style={{ color: 'var(--t-text-3)' }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="rounded-2xl p-4 mb-5 flex items-start gap-3"
              style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)' }}>
              <Star className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#818cf8' }} />
              <p className="text-sm" style={{ color: '#818cf8' }}>
                Reviews can be submitted after completing a booking.
              </p>
            </div>
            {reviews.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex justify-center mb-3"><MessageSquare className="w-10 h-10" style={{ color: 'var(--t-border)' }} /></div>
                <p style={{ color: 'var(--t-text-2)' }}>No reviews yet. Be the first!</p>
              </div>
            ) : (
              <div className="space-y-3">{reviews.map((r) => <ReviewCard key={r._id} review={r} />)}</div>
            )}
          </div>
        )}

        {/* ══ INFO TAB ═══════════════════════════════════════════════════ */}
        {activeTab === "Info" && (
          <div className="fade-in space-y-4 pb-8">
            {galleryItems.length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)' }}>
                <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
                  <Sparkles className="w-4 h-4" style={{ color: '#818cf8' }} />
                  Gallery ({salonPhotoUrls.length > 0 && `${salonPhotoUrls.length} photo${salonPhotoUrls.length !== 1 ? 's' : ''}`}{salonPhotoUrls.length > 0 && salonVideoUrls.length > 0 && ' · '}{salonVideoUrls.length > 0 && `${salonVideoUrls.length} video${salonVideoUrls.length !== 1 ? 's' : ''}`})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {galleryItems.map((item, i) => {
                    const videoIdx = item.type === 'video'
                      ? salonVideoUrls.indexOf(item.url)
                      : -1;
                    const thumbUrl = item.type === 'video' && item.url.includes('/video/upload/')
                      ? item.url
                          .replace('/video/upload/', '/video/upload/w_400,h_400,c_fill,q_auto,f_jpg,vc_none/')
                          .replace(/\.(mp4|mov|avi|mkv|webm)(\?.*)?$/i, '.jpg')
                      : '';
                    return (
                      <button
                        key={i}
                        onClick={() => item.type === 'video' ? setVideoViewerIdx(videoIdx) : setGalleryLightbox(i)}
                        className="relative block aspect-square rounded-xl overflow-hidden group focus:outline-none"
                      >
                        {item.type === 'video' ? (
                          <>
                            {/* Gradient base always visible — img renders on top if it loads */}
                            <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900" />
                            {thumbUrl && (
                              <img
                                src={thumbUrl}
                                alt="Video"
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={e => { e.currentTarget.style.display = 'none'; }}
                              />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/45 transition-colors">
                              <div className="w-12 h-12 rounded-full bg-black/55 flex items-center justify-center border-2 border-white/70 group-hover:scale-110 transition-transform backdrop-blur-sm">
                                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                              </div>
                            </div>
                          </>
                        ) : (
                          <img
                            src={item.url}
                            alt={`Salon photo ${i + 1}`}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            onError={e => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Gallery Lightbox */}
            {galleryLightbox !== null && galleryItems[galleryLightbox] && (() => {
              const lbItem = galleryItems[galleryLightbox];
              const isVideo = lbItem.type === 'video';
              const goPrev = () => { galleryVideoRef.current?.pause(); setGalleryLightbox(i => i - 1); };
              const goNext = () => { galleryVideoRef.current?.pause(); setGalleryLightbox(i => i + 1); };
              const closeGallery = () => { galleryVideoRef.current?.pause(); setGalleryLightbox(null); };
              return (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4" onClick={closeGallery}>
                  {/* Close */}
                  <button onClick={closeGallery} className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition">
                    <X className="w-5 h-5" />
                  </button>

                  {/* Counter + type badge */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
                    <span className="text-white text-sm font-semibold bg-black/40 px-3 py-1 rounded-full">
                      {galleryLightbox + 1} / {galleryItems.length}
                    </span>
                    {isVideo && <span className="text-xs text-violet-300 bg-violet-900/60 px-2 py-1 rounded-full font-semibold">Video</span>}
                  </div>

                  {/* Media */}
                  <div className="max-w-4xl w-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                    {isVideo ? (
                      <video
                        ref={galleryVideoRef}
                        src={lbItem.url}
                        controls
                        autoPlay
                        className="max-h-[80vh] max-w-full rounded-xl"
                        style={{ minHeight: 200 }}
                      />
                    ) : (
                      <img src={lbItem.url} alt="" className="max-h-[80vh] max-w-full rounded-xl object-contain" />
                    )}
                  </div>

                  {/* Prev */}
                  {galleryLightbox > 0 && (
                    <button onClick={e => { e.stopPropagation(); goPrev(); }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition">
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                  )}
                  {/* Next */}
                  {galleryLightbox < galleryItems.length - 1 && (
                    <button onClick={e => { e.stopPropagation(); goNext(); }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition">
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  )}
                </div>
              );
            })()}
            {/* SalonVideoViewer rendered at root level — see below */}

            {salon.description && (
              <div className="rounded-2xl p-5" style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)' }}>
                <h3 className="font-bold mb-2" style={{ color: 'var(--t-text)' }}>About</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--t-text-2)' }}>{salon.description}</p>
              </div>
            )}
            <div className="rounded-2xl p-5" style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)' }}>
              <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
                <MapPin className="w-4 h-4" style={{ color: '#818cf8' }} />
                Contact & Location
              </h3>
              <ul className="space-y-3 text-sm">
                {salon.address && (
                  <li className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(99,102,241,0.1)' }}>
                      <MapPin className="w-4 h-4" style={{ color: '#818cf8' }} />
                    </div>
                    <span style={{ color: 'var(--t-text-2)' }}>{salon.address}</span>
                  </li>
                )}
                {salon.city && (
                  <li className="flex gap-3 items-center">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(99,102,241,0.1)' }}>
                      <Building2 className="w-4 h-4" style={{ color: '#818cf8' }} />
                    </div>
                    <span style={{ color: 'var(--t-text-2)' }}>{salon.city}</span>
                  </li>
                )}
                {salon.phone && (
                  <li className="flex gap-3 items-center">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(99,102,241,0.1)' }}>
                      <Phone className="w-4 h-4" style={{ color: '#818cf8' }} />
                    </div>
                    <a href={`tel:${salon.phone}`} className="font-medium hover:underline" style={{ color: 'var(--t-accent)' }}>{salon.phone}</a>
                  </li>
                )}
                {salon.email && (
                  <li className="flex gap-3 items-center">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(99,102,241,0.1)' }}>
                      <Mail className="w-4 h-4" style={{ color: '#818cf8' }} />
                    </div>
                    <a href={`mailto:${salon.email}`} className="font-medium hover:underline" style={{ color: 'var(--t-accent)' }}>{salon.email}</a>
                  </li>
                )}
              </ul>
              {(salon.address || salon.city) && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(salon.address || salon.city)}`}
                  target="_blank" rel="noreferrer"
                  className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                  style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}
                >
                  <Navigation className="w-4 h-4" /> Get Directions
                </a>
              )}
            </div>
            {salon.workingHours && (
              <div className="rounded-2xl p-5" style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)' }}>
                <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
                  <Clock className="w-4 h-4" style={{ color: '#818cf8' }} />
                  Working Hours
                </h3>
                <div className="space-y-2.5">
                  {dayOrder.map((day) => {
                    const h = salon.workingHours[day];
                    if (!h) return null;
                    const isToday = new Date().toLocaleDateString("en-US",{weekday:"long"}).toLowerCase() === day;
                    return (
                      <div key={day}
                        className="flex justify-between items-center text-sm px-3 py-2 rounded-lg"
                        style={{ background: isToday ? 'rgba(99,102,241,0.07)' : 'transparent', border: isToday ? '1px solid rgba(99,102,241,0.15)' : '1px solid transparent' }}>
                        <span className="capitalize font-medium flex items-center gap-2" style={{ color: isToday ? 'var(--t-accent)' : 'var(--t-text-2)' }}>
                          {isToday && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />}
                          {day}
                          {isToday && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--t-accent)' }}>Today</span>}
                        </span>
                        {h.isClosed ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--t-error-bg)', color: 'var(--t-error-text)' }}>Closed</span>
                        ) : (
                          <span className="font-medium" style={{ color: 'var(--t-text)' }}>{h.open} – {h.close}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="rounded-2xl p-5" style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)' }}>
              <h3 className="font-bold mb-4" style={{ color: 'var(--t-text)' }}>Why Book Here?</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: <Check className="w-4 h-4" />, label: "Verified Salon", color: '#4ade80', bg: 'rgba(34,197,94,0.1)' },
                  { icon: <Zap className="w-4 h-4" />,   label: "Instant Booking", color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
                  { icon: <Star className="w-4 h-4" />,  label: "Trusted Reviews", color: '#f472b6', bg: 'rgba(236,72,153,0.1)' },
                  { icon: <Clock className="w-4 h-4" />, label: "No Wait Time",    color: '#818cf8', bg: 'rgba(99,102,241,0.1)' },
                ].map(({ icon, label, color, bg }) => (
                  <div key={label} className="flex items-center gap-2.5 p-3 rounded-xl"
                    style={{ background: bg, border: `1px solid ${color}25` }}>
                    <div style={{ color }}>{icon}</div>
                    <span className="text-xs font-semibold" style={{ color: 'var(--t-text-2)' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ STICKY BOOKING BAR ════════════════════════════════════════════ */}
      {selectedServices.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 py-3 fade-in md:bottom-4 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl md:rounded-2xl md:shadow-2xl"
          style={{ background: 'var(--t-card)', borderTop: '1px solid var(--t-border)', boxShadow: '0 -8px 32px rgba(0,0,0,0.15)' }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(99,102,241,0.15)' }}>
                <ShoppingBag className="w-5 h-5" style={{ color: '#818cf8' }} />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm" style={{ color: 'var(--t-text)' }}>
                  {selectedServices.length} service{selectedServices.length > 1 ? "s" : ""} selected
                </p>
                <p className="text-xs font-semibold truncate" style={{ color: '#818cf8' }}>
                  ₹{totalPrice} · {totalDuration} min
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setSelectedServices([])}
                className="text-sm px-3 py-2 rounded-lg transition-all"
                style={{ color: 'var(--t-text-3)' }}
              >
                Clear
              </button>
              <button
                onClick={handleBookNow}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}
              >
                <Zap className="w-4 h-4" /> Book Now →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ VIDEO VIEWER — outside fade-in to avoid stacking-context trap ══ */}
      {videoViewerIdx !== null && salonVideoUrls.length > 0 && (
        <SalonVideoViewer
          videos={salonVideoUrls}
          startIdx={videoViewerIdx}
          salon={salon}
          onClose={() => setVideoViewerIdx(null)}
          onBook={() => { setVideoViewerIdx(null); setShowBooking(true); }}
        />
      )}

      {/* ══ BOOKING DRAWER ════════════════════════════════════════════════ */}
      {showBooking && (
        <div className="fixed inset-0 z-50 flex flex-col md:items-center md:justify-center" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget && !bookingSuccess) setShowBooking(false); }}>

          <div
            className="mt-auto w-full max-h-[92vh] rounded-t-3xl flex flex-col md:mt-0 md:rounded-3xl md:max-w-xl md:max-h-[88vh]"
            style={{ background: 'var(--t-bg)', boxShadow: '0 -20px 60px rgba(0,0,0,0.3)' }}
          >
            {bookingSuccess ? (
              /* ── Success view ────────────────────────────────────────── */
              <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                  style={{ background: bookingStatus === "pending" ? 'var(--t-warn-bg)' : '#dcfce7' }}>
                  {bookingStatus === "pending"
                    ? <span className="text-4xl">⏳</span>
                    : <CheckCircle className="w-10 h-10 text-green-500" />}
                </div>
                <h2 className="text-xl font-extrabold mb-1" style={{ color: 'var(--t-text)' }}>
                  {bookingStatus === "pending" ? "Booking Received!" : "Booking Confirmed!"}
                </h2>
                {bookingStatus === "pending" && (
                  <div className="rounded-xl px-4 py-2.5 mb-3 text-sm" style={{ background: 'var(--t-warn-bg)', color: 'var(--t-warn-text)' }}>
                    Awaiting salon confirmation. You'll be notified once approved.
                  </div>
                )}
                <div className="rounded-2xl p-4 w-full mb-5 text-sm space-y-1.5" style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)' }}>
                  <p className="font-bold" style={{ color: 'var(--t-text)' }}>{salon.name}</p>
                  <p style={{ color: 'var(--t-text-2)' }}>{selectedServices.map(s => s.name).join(" + ")}</p>
                  <p style={{ color: 'var(--t-text-3)' }}>{formatDate(bookDate + "T12:00:00")} · {slot}</p>
                  <p style={{ color: 'var(--t-accent)' }}>₹{finalPrice} · Pay at salon</p>
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <button
                    onClick={() => { setShowBooking(false); navigate("/dashboard"); }}
                    className="btn-primary w-full py-3"
                  >
                    View My Bookings
                  </button>
                  <button
                    onClick={() => { setShowBooking(false); navigate("/"); }}
                    className="btn-outline w-full py-3"
                  >
                    Browse More Salons
                  </button>
                </div>
              </div>
            ) : (
              /* ── Booking form ─────────────────────────────────────────── */
              <>
                {/* Drawer handle + header */}
                <div className="rounded-t-3xl pt-3 pb-4 px-5 relative overflow-hidden shrink-0"
                  style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 4px 20px rgba(79,70,229,0.3)' }}>
                  {/* Decorative circles like app */}
                  <div style={{ position: 'absolute', top: -50, right: -30, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', top: -15, right: 70, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
                  <div className="w-10 h-1 rounded-full bg-white/30 mx-auto mb-4" />
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-extrabold text-white">Book Appointment</h2>
                      <p className="text-xs text-white/70 mt-0.5 truncate max-w-[220px]">
                        {salon.name}
                        {selectedServices.length > 0 && ` · ${selectedServices.map(s => s.name).join(", ")}`}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowBooking(false)}
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                      style={{ background: 'rgba(255,255,255,0.15)' }}
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                  {selectedServices.length > 0 && (
                    <div className="mt-3 flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.12)' }}>
                      <Scissors className="w-4 h-4 text-white/70 shrink-0" />
                      <span className="text-xs text-white/80 font-semibold flex-1 truncate">
                        {totalDuration} min · ₹{totalPrice}
                      </span>
                    </div>
                  )}
                </div>

                <form onSubmit={handleConfirm} className="px-5 py-5 space-y-6 overflow-y-auto flex-1 min-h-0 pb-4">
                  {/* ── Date ── */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold mb-3" style={{ color: 'var(--t-text)' }}>
                      <Calendar className="w-4 h-4" style={{ color: '#818cf8' }} /> Select Date
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {dateDays.map(d => {
                        const active = bookDate === d;
                        const dateObj = new Date(d + "T12:00:00");
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setBookDate(d)}
                            className="flex flex-col items-center justify-center rounded-2xl shrink-0 transition-all hover:scale-105"
                            style={{
                              width: 52, height: 62, borderWidth: 1.5,
                              background: active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--t-card)',
                              borderColor: active ? '#6366f1' : 'var(--t-border)',
                              boxShadow: active ? '0 4px 12px rgba(99,102,241,0.35)' : 'none',
                            }}
                          >
                            <span className="text-[10px] font-bold" style={{ color: active ? 'rgba(255,255,255,0.8)' : 'var(--t-text-3)' }}>
                              {formatDay(d)}
                            </span>
                            <span className="text-lg font-extrabold" style={{ color: active ? '#fff' : 'var(--t-text)' }}>
                              {dateObj.getDate()}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Stylist ── */}
                  {barbers.length > 0 && (
                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold mb-3" style={{ color: 'var(--t-text)' }}>
                        <User className="w-4 h-4" style={{ color: '#818cf8' }} />
                        Select Stylist <span className="font-normal text-xs" style={{ color: 'var(--t-text-3)' }}>(optional)</span>
                      </label>
                      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                        {/* Any / No preference */}
                        <button type="button" onClick={() => setBarberId("")}
                          className="flex flex-col items-center gap-1.5 shrink-0 transition-all hover:scale-105">
                          <div
                            className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold"
                            style={barberId === ""
                              ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }
                              : { background: 'var(--t-bg-2)', color: 'var(--t-text-2)', border: '2px solid var(--t-border)' }}
                          >
                            Any
                          </div>
                          <span className="text-xs font-medium" style={{ color: barberId === "" ? '#6366f1' : 'var(--t-text-2)' }}>No Pref</span>
                        </button>
                        {barbers.map(b => (
                          <button key={b._id} type="button" onClick={() => setBarberId(b._id)}
                            className="flex flex-col items-center gap-1.5 shrink-0 transition-all hover:scale-105">
                            <div
                              className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden"
                              style={barberId === b._id
                                ? { border: '3px solid #6366f1', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }
                                : { background: 'var(--t-bg-2)', color: 'var(--t-text-2)', border: '2px solid var(--t-border)' }}
                            >
                              {b.photo
                                ? <img src={b.photo} alt={b.name} className="w-full h-full object-cover" />
                                : (b.name?.charAt(0)?.toUpperCase() || "?")}
                            </div>
                            <span className="text-xs font-medium text-center max-w-[60px] truncate"
                              style={{ color: barberId === b._id ? '#6366f1' : 'var(--t-text-2)' }}>
                              {b.name}
                            </span>
                            {b.experience > 0 && (
                              <span className="text-[10px]" style={{ color: 'var(--t-text-3)', marginTop: -4 }}>
                                {b.experience}yr
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Time slots ── */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold mb-3" style={{ color: 'var(--t-text)' }}>
                      <Clock className="w-4 h-4" style={{ color: '#818cf8' }} />
                      Select Time
                      {totalDuration > 0 && <span className="font-normal text-xs" style={{ color: 'var(--t-text-3)' }}>({totalDuration} min)</span>}
                    </label>

                    {slotsLoading ? (
                      <div className="flex items-center gap-2 py-4 text-sm" style={{ color: 'var(--t-text-3)' }}>
                        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        Loading available slots…
                      </div>
                    ) : closedDay ? (
                      <div className="p-4 rounded-xl text-sm text-center" style={{ background: '#fef3c7', color: '#92400e' }}>
                        🔒 Salon is closed on this date. Please try another day.
                      </div>
                    ) : slots.length === 0 ? (
                      <div className="p-4 rounded-xl text-sm text-center" style={{ background: 'var(--t-bg-2)', color: 'var(--t-text-2)' }}>
                        No available slots for this date.
                      </div>
                    ) : bookingMode === "sequential" ? (
                      <div className="flex items-center gap-3 p-3 rounded-xl text-sm"
                        style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                        <Zap className="w-4 h-4 shrink-0" style={{ color: '#818cf8' }} />
                        <span style={{ color: '#818cf8' }}>Auto-assigned: <strong>{slots[0]} – {addMinutes(slots[0], totalDuration)}</strong></span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-4 mb-3 text-xs flex-wrap" style={{ color: 'var(--t-text-3)' }}>
                          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ background: 'var(--t-border)' }} /> Past</span>
                          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-400" /> Booked</span>
                          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-indigo-600" /> Selected</span>
                          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded" style={{ border: '1px solid var(--t-border)', background: 'var(--t-input-bg)' }} /> Available</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {slots.map((s) => {
                            const past    = isPastSlot(bookDate, s);
                            const blocked = !past && blockedSlots.includes(s);
                            const selected = slot === s;
                            const endTime = addMinutes(s, totalDuration);
                            return (
                              <button
                                key={s}
                                type="button"
                                onClick={() => {
                                  if (past)    { setSlotPopup("past");   return; }
                                  if (blocked) { setSlotPopup("booked"); return; }
                                  setSlot(s);
                                }}
                                className="py-2 px-1 text-xs rounded-xl border transition-all font-medium text-center leading-tight hover:scale-[1.03]"
                                style={
                                  past    ? { background: 'var(--t-bg-2)', color: 'var(--t-text-3)', borderColor: 'var(--t-border)', cursor: 'not-allowed' } :
                                  blocked ? { background: 'var(--t-error-bg)', color: 'var(--t-error-text)', borderColor: 'var(--t-error-border)', cursor: 'not-allowed' } :
                                  selected? { background: 'var(--t-accent)', color: '#fff', borderColor: 'var(--t-accent)', boxShadow: '0 4px 12px rgba(99,102,241,0.35)' } :
                                            { background: 'var(--t-input-bg)', color: 'var(--t-text-2)', borderColor: 'var(--t-border)' }
                                }
                              >
                                <span className="block">{s}</span>
                                <span className="block opacity-75">– {endTime}</span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* ── Coupon ── */}
                  {slot && salon?.hasCoupons && (
                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold mb-3" style={{ color: 'var(--t-text)' }}>
                        <Tag className="w-4 h-4" style={{ color: '#818cf8' }} /> Have a coupon?
                      </label>
                      {appliedCoupon ? (
                        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm"
                          style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                          <span className="font-medium" style={{ color: '#16a34a' }}>✓ {appliedCoupon.code} — ₹{couponDiscount} off</span>
                          <button type="button" onClick={removeCoupon} className="text-xs ml-2" style={{ color: '#ef4444' }}>Remove</button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={couponInput}
                            onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                            placeholder="Enter coupon code"
                            className="input-field flex-1"
                          />
                          <button
                            type="button"
                            onClick={applyCoupon}
                            disabled={couponLoading || !couponInput.trim()}
                            className="px-4 py-2 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition"
                            style={{ background: 'var(--t-accent)' }}
                          >
                            {couponLoading ? "…" : "Apply"}
                          </button>
                        </div>
                      )}
                      {couponError && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{couponError}</p>}
                    </div>
                  )}

                  {/* ── Price summary ── */}
                  {slot && (
                    <div className="rounded-2xl p-4 text-sm" style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)' }}>
                      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--t-accent)' }}>
                        <CreditCard className="w-3.5 h-3.5" /> Booking Summary
                      </p>
                      <div className="space-y-2">
                        {selectedServices.map(s => (
                          <div key={s._id} className="flex justify-between">
                            <span style={{ color: 'var(--t-text-2)' }}>{s.name}</span>
                            <span className="font-semibold" style={{ color: 'var(--t-text)' }}>₹{s.basePrice || s.price}</span>
                          </div>
                        ))}
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--t-text-3)' }}>Date & Time</span>
                          <span className="font-medium" style={{ color: 'var(--t-text-2)' }}>{formatDate(bookDate + "T12:00:00")} · {slot}</span>
                        </div>
                        {couponDiscount > 0 && (
                          <div className="flex justify-between" style={{ color: '#16a34a' }}>
                            <span>Discount ({appliedCoupon?.code})</span>
                            <span className="font-medium">−₹{couponDiscount}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 mt-1" style={{ borderTop: '1px solid var(--t-border)' }}>
                          <span className="font-bold" style={{ color: 'var(--t-text)' }}>Total (Pay at salon)</span>
                          <span className="font-bold text-base" style={{ color: 'var(--t-accent)' }}>₹{finalPrice}</span>
                        </div>
                      </div>
                    </div>
                  )}

                </form>

                {/* ── Sticky footer confirm button ── */}
                <div className="shrink-0 px-5 py-4"
                  style={{ borderTop: '1px solid var(--t-border)', background: 'var(--t-bg)' }}>
                  {bookError && (
                    <div className="mb-3 p-3 rounded-xl text-sm" style={{ background: 'var(--t-error-bg)', color: 'var(--t-error-text)' }}>{bookError}</div>
                  )}
                  <button
                    onClick={handleConfirm}
                    disabled={bookingLoading || !slot}
                    className="w-full py-3.5 text-base font-bold text-white rounded-2xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: slot ? '0 4px 20px rgba(99,102,241,0.4)' : 'none' }}
                  >
                    {bookingLoading ? "Confirming…" : !slot ? "Select a time slot" : "Confirm Booking"}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Slot popup */}
          {slotPopup && (
            <div className="absolute inset-0 flex items-center justify-center px-6 z-20" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <div className="rounded-2xl p-6 max-w-sm w-full text-center" style={{ background: 'var(--t-card)' }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl mx-auto mb-3"
                  style={{ background: slotPopup === "past" ? 'var(--t-bg-2)' : 'var(--t-error-bg)' }}>
                  {slotPopup === "past" ? "⏰" : "🚫"}
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--t-text)' }}>
                  {slotPopup === "past" ? "Time Has Passed" : "Slot Already Booked"}
                </h3>
                <p className="text-sm mb-5" style={{ color: 'var(--t-text-2)' }}>
                  {slotPopup === "past" ? "This time slot has already passed. Please choose an upcoming slot." : "This slot is taken. Please choose another available slot."}
                </p>
                <button onClick={() => setSlotPopup(null)} className="btn-primary w-full">Choose Another Slot</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ PACKAGE REQUEST MODAL ══════════════════════════════════════ */}
      {pkgReqModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-2xl w-full max-w-sm p-6" style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)' }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{pkgReqModal.icon || (pkgReqModal.type === 'package' ? '🎁' : '💳')}</span>
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--t-text)' }}>{pkgReqModal.name}</p>
                <p className="text-xs" style={{ color: 'var(--t-text-3)' }}>
                  {pkgReqModal.type === 'package' ? `₹${pkgReqModal.discountedPrice}` : `₹${pkgReqModal.price}/${pkgReqModal.billingCycle === 'monthly' ? 'month' : pkgReqModal.billingCycle === 'quarterly' ? 'quarter' : 'year'}`}
                </p>
              </div>
            </div>
            <div className="rounded-xl p-3 mb-4 text-xs" style={{ background: 'rgba(99,102,241,0.08)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
              Pay directly at the salon. The owner will confirm after receiving your payment.
            </div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--t-text-2)' }}>Note (optional)</label>
            <textarea
              value={pkgNote}
              onChange={e => setPkgNote(e.target.value)}
              rows={2}
              placeholder="Any message to the salon owner..."
              className="w-full px-3 py-2 rounded-xl text-sm resize-none mb-4"
              style={{ background: 'var(--t-bg-2)', border: '1px solid var(--t-border)', color: 'var(--t-text)', outline: 'none' }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setPkgReqModal(null); setPkgNote(''); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ border: '1px solid var(--t-border)', color: 'var(--t-text-2)' }}
              >
                Cancel
              </button>
              <button
                onClick={handlePackageRequest}
                disabled={pkgReqLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
              >
                {pkgReqLoading ? 'Sending…' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
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
      background: #050505;
      background-image:
        radial-gradient(ellipse 60% 50% at 30% 20%, rgba(99,102,241,0.07) 0%, transparent 70%),
        radial-gradient(ellipse 60% 50% at 70% 80%, rgba(139,92,246,0.05) 0%, transparent 70%);
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
      rgba(0,0,0,0.60) 0%, rgba(0,0,0,0.10) 18%,
      transparent 36%, transparent 48%,
      rgba(0,0,0,0.55) 72%, rgba(0,0,0,0.93) 100%);
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
    const url = `${window.location.origin}/salon/${salonId}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }, [salonId]);

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

  // Swap video src + play when idx changes
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.src = videos[idx] || '';
    v.muted = mutedRef.current;
    v.play().catch(() => {});
    setPlaying(true);
  }, [idx, videos]);

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
              background: 'linear-gradient(135deg, #5b5ef7 0%, #7c3aed 50%, #9333ea 100%)',
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
                      background: posting || !commentText.trim() ? 'rgba(99,102,241,0.25)' : 'linear-gradient(135deg,#6366f1,#7c3aed)',
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
