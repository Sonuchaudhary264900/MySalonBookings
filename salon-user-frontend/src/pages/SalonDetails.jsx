import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import {
  Scissors, Phone, Star, Check, MessageSquare, Frown, Building2,
  Mail, ShoppingBag, MapPin, Navigation, ChevronDown, ChevronUp,
  Clock, Sparkles, Award, Users, ArrowLeft, Zap,
} from "lucide-react";
import API from "../services/api";
import ServiceCard from "../components/ServiceCard";
import ReviewCard from "../components/ReviewCard";
import { isCustomer, clearCustomerAuth } from "../utils/auth";

const BASE_TABS = ["Services", "Reviews", "Info"];

function SalonDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [salon, setSalon] = useState(null);
  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [tab, setTab] = useState("Services");
  const [loading, setLoading] = useState(true);
  const TABS = reviews.length > 0 ? BASE_TABS : BASE_TABS.filter(t => t !== "Reviews");
  const activeTab = TABS.includes(tab) ? tab : "Services";
  const [selectedServices, setSelectedServices] = useState([]);
  const [serviceGenderFilter, setServiceGenderFilter] = useState("all");
  const [expandedCat, setExpandedCat] = useState(null);
  const token = localStorage.getItem("customerToken");

  useEffect(() => {
    if (!token) return;
    API.get("/customer/auth/me")
      .then((res) => {
        const gender = res.data?.data?.gender || res.data?.gender;
        if (gender === "male" || gender === "female") setServiceGenderFilter(gender);
      })
      .catch(() => {});
  }, [token]);

  const toggleService = (service) => {
    setSelectedServices(prev =>
      prev.find(s => s._id === service._id)
        ? prev.filter(s => s._id !== service._id)
        : [...prev, service]
    );
  };

  const totalPrice    = selectedServices.reduce((sum, s) => sum + (s.basePrice || s.price || 0), 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + (s.duration || 0), 0);

  const handleBookNow = () => {
    if (!isCustomer()) {
      clearCustomerAuth();
      navigate("/login", {
        state: {
          from: `/booking/${id}`,
          bookingState: { serviceIds: selectedServices.map(s => s._id) },
        },
      });
      return;
    }
    navigate(`/booking/${id}`, { state: { serviceIds: selectedServices.map(s => s._id) } });
  };

  const handleBookNowEmpty = () => {
    if (!isCustomer()) {
      clearCustomerAuth();
      navigate("/login", { state: { from: `/booking/${id}`, bookingState: { serviceIds: [] } } });
      return;
    }
    navigate(`/booking/${id}`, { state: { serviceIds: [] } });
  };

  useEffect(() => {
    Promise.all([loadSalon(), loadServices(), loadReviews()]).finally(() => setLoading(false));
  }, [id]);

  const loadSalon     = async () => { try { const r = await API.get(`/public/salons/${id}`);           setSalon(r.data.data || r.data.salon); } catch {} };
  const loadServices  = async () => { try { const r = await API.get(`/public/salons/${id}/services`);  setServices(r.data.data?.services || r.data.data || []); } catch {} };
  const loadReviews   = async () => { try { const r = await API.get(`/public/salons/${id}/reviews`);   setReviews(r.data.data?.reviews || r.data.data || []); } catch {} };

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

  const dayOrder = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

  /* ── Tab icon map ── */
  const TAB_ICONS = { Services: <Scissors className="w-4 h-4" />, Reviews: <Star className="w-4 h-4" />, Info: <Building2 className="w-4 h-4" /> };

  return (
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

        {/* Multi-layer overlay for depth */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.15) 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, transparent 60%)' }} />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Top-right: Verified badge */}
        {salon.isApproved && (
          <div
            className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ background: 'rgba(34,197,94,0.2)', backdropFilter: 'blur(8px)', border: '1px solid rgba(34,197,94,0.4)', color: '#4ade80' }}
          >
            <Check className="w-3 h-3" /> Verified
          </div>
        )}

        {/* Bottom overlay content */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 pt-8">
          {/* Top Rated badge */}
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

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-1">
            {salon.name}
          </h1>

          {/* Location */}
          {(salon.address || salon.city) && (
            <p className="flex items-center gap-1.5 text-sm text-white/75 mb-3">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {salon.address || salon.city}
            </p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {avgRating && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold"
                style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.35)', color: '#fbbf24' }}>
                <Star className="w-3.5 h-3.5 fill-current" /> {avgRating}
                {reviews.length > 0 && <span className="font-normal text-white/60 text-xs">({reviews.length})</span>}
              </div>
            )}
            {services.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white/75"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Scissors className="w-3 h-3" /> {services.length} Services
              </div>
            )}
          </div>

          {/* CTA buttons */}
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
                target="_blank"
                rel="noreferrer"
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
      <div className="border-b" style={{ borderColor: 'var(--t-border)', background: 'var(--t-card)' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4 overflow-x-auto scrollbar-hide text-xs font-semibold whitespace-nowrap">
          {avgRating && (
            <div className="flex items-center gap-1.5" style={{ color: '#fbbf24' }}>
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>{avgRating} Rating</span>
            </div>
          )}
          {reviews.length > 0 && (
            <div className="flex items-center gap-1.5" style={{ color: 'var(--t-text-2)' }}>
              <Users className="w-3.5 h-3.5" />
              <span>{reviews.length}+ Happy Customers</span>
            </div>
          )}
          {salon.isApproved && (
            <div className="flex items-center gap-1.5" style={{ color: 'var(--t-success-text)' }}>
              <Check className="w-3.5 h-3.5" />
              <span>Verified Salon</span>
            </div>
          )}
          {services.length > 0 && (
            <div className="flex items-center gap-1.5" style={{ color: 'var(--t-text-2)' }}>
              <Scissors className="w-3.5 h-3.5" />
              <span>{services.length} Services Available</span>
            </div>
          )}
          <div className="flex items-center gap-1.5" style={{ color: 'var(--t-text-2)' }}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>Instant Booking</span>
          </div>
        </div>
      </div>

      {/* ══ CONTENT ════════════════════════════════════════════════════════ */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 pb-2">

        {/* Info chips */}
        <div className="flex flex-wrap gap-2 mb-5">
          {salon.category && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-105"
              style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
              <Scissors className="w-3 h-3" />
              {salon.category.replace("_", " ")}
            </span>
          )}
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
              {(t === "Services" && services.length > 0) || (t === "Reviews" && reviews.length > 0) ? (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: activeTab === t ? 'rgba(255,255,255,0.25)' : 'var(--t-bg-2)' }}
                >
                  {t === "Services" ? services.length : reviews.length}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* ══ SERVICES TAB ═══════════════════════════════════════════════ */}
        {activeTab === "Services" && (() => {
          const isUnisex = salon.servedGender === "unisex";
          const MALE_ONLY_CATS   = ["Beard & Grooming", "Body Grooming"];
          const FEMALE_ONLY_CATS = ["Bridal & Events"];

          const UNISEX_CAT_NAMES = {
            "Hair Services":         { m: new Set(["Basic Haircut","Fade / Taper / Skin Fade","Designer Haircut","Hair Styling","Hair Wash","Blow Dry","Hair Coloring","Hair Straightening","Hair Smoothening","Hair Spa","Dandruff Treatment","Hair Fall Treatment"]), f: new Set(["Haircut (Layer / Step / Trim)","Advanced Haircut","Hair Styling (Straight / Curl / Party)","Hair Wash","Blow Dry","Hair Coloring","Highlights / Balayage","Hair Smoothening","Rebonding","Keratin Treatment","Hair Spa"]) },
            "Beard & Grooming":      { m: new Set(["Beard Trim","Clean Shave","Beard Styling / Shape","Designer Beard","Beard Coloring","Hot Towel Shave"]), f: new Set() },
            "Nail Services":         { m: new Set(["Manicure","Pedicure"]), f: new Set(["Manicure","Pedicure","Nail Art","Gel Nails","Acrylic Nails","Nail Extensions","Nail Repair"]) },
            "Skin & Face / Beauty":  { m: new Set(["Basic Facial","Gold Facial","Diamond Facial","Clean-up","Detan","Face Bleach","Anti-Acne Treatment","Skin Brightening"]), f: new Set(["Basic Facial","Gold Facial","Diamond Facial","Hydra Facial","Clean-up","Detan","Bleach","Anti-aging Treatment","Skin Brightening"]) },
            "Spa & Massage":         { m: new Set(["Head Massage","Neck & Shoulder Massage","Full Body Massage","Foot Massage","Deep Tissue Massage","Relaxation Massage"]), f: new Set(["Head Massage","Full Body Massage","Foot Massage","Aromatherapy","Spa Therapy","Relaxation Massage"]) },
            "Body Grooming":         { m: new Set(["Chest Waxing","Back Waxing","Full Body Wax","Threading (optional)","Nose Wax","Ear Cleaning"]), f: new Set(["Full Body Wax","Half Wax","Bikini Wax","Threading (Eyebrow / Upper Lip / Forehead)","Body Polish","Body Scrub"]) },
            "Bridal & Events":       { m: new Set(["Groom Makeup","Hairstyling (Groom)","Shave & Grooming (Groom)"]), f: new Set(["Bridal Makeup","Engagement Makeup","Party Makeup","Hairstyling","Saree Draping"]) },
            "Kids Services":         { m: new Set(["Kids' Haircut (Boys)","Kids' Hair Styling (Boys)","Kids' Hair Wash"]), f: new Set(["Kids' Haircut (Girls)","Kids' Hair Styling (Girls)","Kids' Hair Wash","Kids' Braiding"]) },
            "At-Home Services":      { m: new Set(["At-Home Haircut (Men)","At-Home Shave","At-Home Massage","At-Home Facial (Men)"]), f: new Set(["At-Home Haircut (Women)","At-Home Facial","At-Home Waxing","At-Home Massage","At-Home Bridal"]) },
          };

          const classifySvc = (s) => {
            const af = s.applicableFor || [];
            if (af.length > 0 && af.includes("male")   && !af.includes("female")) return "male";
            if (af.length > 0 && af.includes("female") && !af.includes("male"))   return "female";
            const lookup = UNISEX_CAT_NAMES[s.category || ""];
            if (lookup) {
              const inM = lookup.m.has(s.name); const inF = lookup.f.has(s.name);
              if (inM && !inF) return "male"; if (inF && !inM) return "female";
            }
            return "both";
          };

          const visibleServices = !isUnisex || serviceGenderFilter === "all"
            ? services
            : services.filter((s) => {
                const cat = s.category || "";
                if (serviceGenderFilter === "female" && MALE_ONLY_CATS.includes(cat))   return false;
                if (serviceGenderFilter === "male"   && FEMALE_ONLY_CATS.includes(cat)) return false;
                const gender = classifySvc(s);
                return gender === "both" || gender === serviceGenderFilter;
              });

          const categoryIconMap = {
            "Hair Services": "✂️", "Hair Services (Men)": "✂️", "Hair Services (Women)": "✂️",
            "Beard & Grooming": "🧔", "Nail Services": "💅", "Skin & Face / Beauty": "🧖",
            "Skin & Face (Men Grooming)": "🧴", "Skin & Beauty": "🧖", "Spa & Massage": "💆",
            "Spa & Relaxation": "💆", "Body Grooming": "🧴", "Bridal & Events": "👰",
            "Kids Services": "👶", "At-Home Services": "🏠",
          };

          const CATEGORY_ORDER = [
            "Hair Services","Hair Services (Men)","Hair Services (Women)","Beard & Grooming",
            "Nail Services","Skin & Face / Beauty","Skin & Face (Men Grooming)","Skin & Beauty",
            "Spa & Massage","Spa & Relaxation","Body Grooming","Bridal & Events",
            "Kids Services","At-Home Services",
          ];

          const grouped = visibleServices.reduce((acc, svc) => {
            const cat = svc.category || "Other";
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(svc);
            return acc;
          }, {});

          const sortedGroupEntries = Object.entries(grouped).sort(([a], [b]) => {
            const ai = CATEGORY_ORDER.indexOf(a), bi = CATEGORY_ORDER.indexOf(b);
            if (ai === -1 && bi === -1) return a.localeCompare(b);
            if (ai === -1) return 1; if (bi === -1) return -1;
            return ai - bi;
          });

          return (
            <div className="fade-in">
              {/* Gender filter */}
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
                            {categoryIconMap[cat] || "✨"}
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

        {/* ══ REVIEWS TAB ════════════════════════════════════════════════ */}
        {activeTab === "Reviews" && (
          <div className="fade-in pb-8">
            {/* Rating overview */}
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
                Reviews can be submitted after completing a booking. You'll receive a notification once your service is done.
              </p>
            </div>

            {reviews.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex justify-center mb-3"><MessageSquare className="w-10 h-10" style={{ color: 'var(--t-border)' }} /></div>
                <p style={{ color: 'var(--t-text-2)' }}>No reviews yet. Be the first!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => <ReviewCard key={r._id} review={r} />)}
              </div>
            )}
          </div>
        )}

        {/* ══ INFO TAB ═══════════════════════════════════════════════════ */}
        {activeTab === "Info" && (
          <div className="fade-in space-y-4 pb-8">
            {/* Photo gallery */}
            {salon.photos?.length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)' }}>
                <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
                  <Sparkles className="w-4 h-4" style={{ color: '#818cf8' }} />
                  Gallery ({salon.photos.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {salon.photos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer"
                      className="block aspect-square rounded-xl overflow-hidden group">
                      <img src={url} alt={`Salon photo ${i + 1}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {salon.description && (
              <div className="rounded-2xl p-5" style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)' }}>
                <h3 className="font-bold mb-2" style={{ color: 'var(--t-text)' }}>About</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--t-text-2)' }}>{salon.description}</p>
              </div>
            )}

            {/* Contact & Location */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)' }}>
              <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--t-text)' }}>
                <MapPin className="w-4 h-4" style={{ color: '#818cf8' }} />
                Contact & Location
              </h3>
              <ul className="space-y-3 text-sm">
                {salon.address && (
                  <li className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: 'rgba(99,102,241,0.1)' }}>
                      <MapPin className="w-4 h-4" style={{ color: '#818cf8' }} />
                    </div>
                    <span style={{ color: 'var(--t-text-2)' }}>{salon.address}</span>
                  </li>
                )}
                {salon.city && (
                  <li className="flex gap-3 items-center">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(99,102,241,0.1)' }}>
                      <Building2 className="w-4 h-4" style={{ color: '#818cf8' }} />
                    </div>
                    <span style={{ color: 'var(--t-text-2)' }}>{salon.city}</span>
                  </li>
                )}
                {salon.phone && (
                  <li className="flex gap-3 items-center">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(99,102,241,0.1)' }}>
                      <Phone className="w-4 h-4" style={{ color: '#818cf8' }} />
                    </div>
                    <a href={`tel:${salon.phone}`} className="font-medium hover:underline" style={{ color: 'var(--t-accent)' }}>{salon.phone}</a>
                  </li>
                )}
                {salon.email && (
                  <li className="flex gap-3 items-center">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(99,102,241,0.1)' }}>
                      <Mail className="w-4 h-4" style={{ color: '#818cf8' }} />
                    </div>
                    <a href={`mailto:${salon.email}`} className="font-medium hover:underline" style={{ color: 'var(--t-accent)' }}>{salon.email}</a>
                  </li>
                )}
              </ul>

              {/* Directions button */}
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

            {/* Working Hours */}
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

            {/* Trust badges */}
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
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 py-3 fade-in"
          style={{
            background: 'var(--t-card)',
            borderTop: '1px solid var(--t-border)',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.15)',
          }}>
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
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
                onMouseEnter={e => e.currentTarget.style.color = 'var(--t-text-2)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--t-text-3)'}
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
    </div>
  );
}

export default SalonDetails;
