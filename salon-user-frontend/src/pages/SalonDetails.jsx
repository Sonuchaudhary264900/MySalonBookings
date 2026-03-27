import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { Scissors, Phone, Star, Check, MessageSquare, Frown, Building2, Mail, ShoppingBag } from "lucide-react";
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
  // Dynamic tabs: hide Reviews if no reviews
  const TABS = reviews.length > 0 ? BASE_TABS : BASE_TABS.filter(t => t !== "Reviews");
  const activeTab = TABS.includes(tab) ? tab : "Services";
  const [selectedServices, setSelectedServices] = useState([]);
  const [serviceGenderFilter, setServiceGenderFilter] = useState("all");
  const [expandedCat, setExpandedCat] = useState(null);
  const token = localStorage.getItem("customerToken");

  // Pre-select gender filter based on logged-in user's gender
  useEffect(() => {
    if (!token) return;
    API.get("/customer/auth/me")
      .then((res) => {
        const gender = res.data?.data?.gender || res.data?.gender;
        if (gender === "male" || gender === "female") {
          setServiceGenderFilter(gender);
        }
      })
      .catch(() => {/* silent — filter stays "all" */});
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
    navigate(`/booking/${id}`, {
      state: { serviceIds: selectedServices.map(s => s._id) }
    });
  };

  useEffect(() => {
    Promise.all([loadSalon(), loadServices(), loadReviews()]).finally(() =>
      setLoading(false)
    );
  }, [id]);

  const loadSalon = async () => {
    try {
      const res = await API.get(`/public/salons/${id}`);
      setSalon(res.data.data || res.data.salon);
    } catch {/* silent */}
  };

  const loadServices = async () => {
    try {
      const res = await API.get(`/public/salons/${id}/services`);
      setServices(res.data.data?.services || res.data.data || []);
    } catch {/* silent */}
  };

  const loadReviews = async () => {
    try {
      const res = await API.get(`/public/salons/${id}/reviews`);
      setReviews(res.data.data?.reviews || res.data.data || []);
    } catch {/* silent */}
  };

  if (loading) {
    return (
      <div className="t-page">
        <div className="h-56 skeleton" />
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          <div className="h-6 skeleton rounded w-1/2" />
          <div className="h-4 skeleton rounded w-1/3" />
          <div className="h-4 skeleton rounded w-1/4" />
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

  const avgRating =
    salon.averageRating || salon.rating
      ? parseFloat(salon.averageRating || salon.rating).toFixed(1)
      : null;

  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  return (
    <div className="t-page">
      {/* ── HERO IMAGE ─────────────────────── */}
      <div className="relative h-56 sm:h-72 bg-gradient-to-br from-indigo-400 to-violet-500 overflow-hidden">
        {(salon.coverPhoto || salon.image || salon.photos?.[0] || salon.ownerPhoto) ? (
          <img
            src={salon.coverPhoto || salon.image || salon.photos?.[0] || salon.ownerPhoto}
            alt={salon.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Scissors className="w-16 h-16 text-white/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-9 h-9 rounded-full glass flex items-center justify-center text-white hover:bg-white/30 transition"
        >
          ←
        </button>

        {/* Salon name overlay */}
        <div className="absolute bottom-5 left-5 right-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">{salon.name}</h1>
              <p className="text-white/80 text-sm flex items-center gap-1 mt-0.5">
                <img src="https://img.freepik.com/free-vector/location_53876-25530.jpg" alt="location" className="w-4 h-4 object-contain" />
                {salon.address || salon.city}
              </p>
            </div>
            {avgRating && (
              <div className="bg-amber-400 text-white font-bold rounded-xl px-3 py-1.5 text-center shrink-0">
                <div className="text-lg leading-none">{avgRating}</div>
                <div className="text-xs">★ rating</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CONTENT ────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Quick info badges */}
        <div className="flex flex-wrap gap-2 mb-5">
          {salon.category && (
            <span className="badge" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>
              {salon.category.replace("_", " ")}
            </span>
          )}
          {salon.servedGender && (
            <span className="badge capitalize flex items-center gap-1" style={
              salon.servedGender === 'male'   ? { background: 'rgba(59,130,246,0.12)', color: '#60a5fa' } :
              salon.servedGender === 'female' ? { background: 'rgba(236,72,153,0.12)', color: '#f472b6' } :
                                                { background: 'rgba(139,92,246,0.12)', color: '#a78bfa' }
            }>
              {salon.servedGender === 'male' ? '👨' : salon.servedGender === 'female' ? '👩' : '👥'}
              {' '}
              {salon.servedGender === 'male' ? 'Men' : salon.servedGender === 'female' ? 'Women' : 'Unisex'}
            </span>
          )}
          {salon.ownerGender && (
            <span className="badge flex items-center gap-1" style={
              salon.ownerGender === 'male'   ? { background: 'rgba(59,130,246,0.12)', color: '#60a5fa' } :
              salon.ownerGender === 'female' ? { background: 'rgba(236,72,153,0.12)', color: '#f472b6' } :
                                               { background: 'rgba(148,163,184,0.12)', color: 'var(--t-text-2)' }
            }>
              {salon.ownerGender === 'male' ? '👨' : salon.ownerGender === 'female' ? '👩' : '🧑'}
              {' Owner: '}{salon.ownerGender.charAt(0).toUpperCase() + salon.ownerGender.slice(1)}
            </span>
          )}
          {salon.isApproved && (
            <span className="badge flex items-center gap-1" style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80' }}>
              <Check className="w-3 h-3" /> Verified
            </span>
          )}
          {salon.phone && (
            <a href={`tel:${salon.phone}`} className="badge flex items-center gap-1 transition-opacity hover:opacity-80"
              style={{ background: 'var(--t-bg-2)', color: 'var(--t-text-2)', border: '1px solid var(--t-border)' }}>
              <Phone className="w-3 h-3" /> {salon.phone}
            </a>
          )}
          {reviews.length > 0 && (
            <span className="badge flex items-center gap-1" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>
              <Star className="w-3 h-3" /> {reviews.length} review{reviews.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 rounded-xl p-1 mb-6"
          style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)' }}
        >
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 text-sm font-semibold rounded-lg transition-all"
              style={
                activeTab === t
                  ? { background: '#6366f1', color: '#fff' }
                  : { color: 'var(--t-text-2)' }
              }
            >
              {t}
              {t === "Services" && services.length > 0 && (
                <span
                  className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
                  style={{ background: activeTab === t ? 'rgba(255,255,255,0.25)' : 'var(--t-bg-2)' }}
                >
                  {services.length}
                </span>
              )}
              {t === "Reviews" && reviews.length > 0 && (
                <span
                  className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
                  style={{ background: activeTab === t ? 'rgba(255,255,255,0.25)' : 'var(--t-bg-2)' }}
                >
                  {reviews.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── SERVICES TAB ──────────────────── */}
        {activeTab === "Services" && (() => {
          const isUnisex = salon.servedGender === "unisex";

          const MALE_ONLY_CATS   = ["Beard & Grooming", "Body Grooming"];
          const FEMALE_ONLY_CATS = ["Bridal & Events"];

          // Name-based gender lookup per category (mirrors UNISEX_CATEGORIES in owner app)
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
            // Fallback: look up by service name in category map
            const lookup = UNISEX_CAT_NAMES[s.category || ""];
            if (lookup) {
              const inM = lookup.m.has(s.name);
              const inF = lookup.f.has(s.name);
              if (inM && !inF) return "male";
              if (inF && !inM) return "female";
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
                if (gender === "both") return true;
                return gender === serviceGenderFilter;
              });

          const categoryIconMap = {
            "Hair Services":          "✂️",
            "Hair Services (Men)":    "✂️",
            "Hair Services (Women)":  "✂️",
            "Beard & Grooming":       "🧔",
            "Nail Services":          "💅",
            "Skin & Face / Beauty":   "🧖",
            "Skin & Face (Men Grooming)": "🧴",
            "Skin & Beauty":          "🧖",
            "Spa & Massage":          "💆",
            "Spa & Relaxation":       "💆",
            "Body Grooming":          "🧴",
            "Bridal & Events":        "👰",
            "Kids Services":          "👶",
            "At-Home Services":       "🏠",
          };

          const CATEGORY_ORDER = [
            "Hair Services", "Hair Services (Men)", "Hair Services (Women)",
            "Beard & Grooming",
            "Nail Services",
            "Skin & Face / Beauty", "Skin & Face (Men Grooming)", "Skin & Beauty",
            "Spa & Massage", "Spa & Relaxation",
            "Body Grooming",
            "Bridal & Events",
            "Kids Services",
            "At-Home Services",
          ];

          const grouped = visibleServices.reduce((acc, svc) => {
            const cat = svc.category || "Other";
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(svc);
            return acc;
          }, {});

          const sortedGroupEntries = Object.entries(grouped).sort(([a], [b]) => {
            const ai = CATEGORY_ORDER.indexOf(a);
            const bi = CATEGORY_ORDER.indexOf(b);
            if (ai === -1 && bi === -1) return a.localeCompare(b);
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
          });

          return (
            <div className="fade-in">
              {/* Gender filter — only for unisex salons */}
              {isUnisex && services.length > 0 && (
                <div className="flex gap-2 mb-4">
                  {[
                    { key: "all",    label: "All Services", emoji: "👥" },
                    { key: "male",   label: "For Men",       emoji: "👨" },
                    { key: "female", label: "For Women",     emoji: "👩" },
                  ].map(({ key, label, emoji }) => (
                    <button
                      key={key}
                      onClick={() => setServiceGenderFilter(key)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                      style={
                        serviceGenderFilter === key
                          ? { background: '#6366f1', color: '#fff', border: '1px solid #6366f1' }
                          : { background: 'var(--t-input-bg)', color: 'var(--t-text-2)', border: '1px solid var(--t-border)' }
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
                <div className="space-y-2 pb-32">
                  {sortedGroupEntries.map(([cat, catServices]) => {
                    const isOpen = expandedCat === cat;
                    const showGenderSplit = isUnisex && serviceGenderFilter === "all";
                    const maleOnly   = showGenderSplit ? catServices.filter(s => classifySvc(s) === "male")   : [];
                    const femaleOnly = showGenderSplit ? catServices.filter(s => classifySvc(s) === "female") : [];
                    const both       = showGenderSplit ? catServices.filter(s => classifySvc(s) === "both")   : catServices;
                    const hasSplit   = showGenderSplit && (maleOnly.length > 0 || femaleOnly.length > 0);

                    return (
                      <div key={cat} className="rounded-xl overflow-hidden"
                        style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)' }}>
                        <button
                          type="button"
                          onClick={() => setExpandedCat(isOpen ? null : cat)}
                          className="w-full flex items-center gap-2.5 px-4 py-3 transition text-left"
                          style={{ color: 'var(--t-text)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--t-bg-2)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <span className="text-lg">{categoryIconMap[cat] || "✨"}</span>
                          <span className="text-sm font-semibold flex-1" style={{ color: 'var(--t-text)' }}>{cat}</span>
                          <span className="text-xs mr-1" style={{ color: 'var(--t-text-3)' }}>{catServices.length}</span>
                          <span className="text-sm" style={{ color: 'var(--t-text-3)' }}>{isOpen ? "▲" : "▼"}</span>
                        </button>

                        {isOpen && (
                          <div className="px-4 py-3 space-y-3"
                            style={{ borderTop: '1px solid var(--t-border)' }}>
                            {hasSplit ? (
                              <>
                                {maleOnly.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold mb-1.5" style={{ color: '#60a5fa' }}>👨 Men</p>
                                    <div className="space-y-2">
                                      {maleOnly.map(service => (
                                        <ServiceCard key={service._id} service={service}
                                          isSelected={selectedServices.some(s => s._id === service._id)}
                                          onToggle={() => toggleService(service)} showGenderBadge={false} />
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {femaleOnly.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold mb-1.5" style={{ color: '#f472b6' }}>👩 Women</p>
                                    <div className="space-y-2">
                                      {femaleOnly.map(service => (
                                        <ServiceCard key={service._id} service={service}
                                          isSelected={selectedServices.some(s => s._id === service._id)}
                                          onToggle={() => toggleService(service)} showGenderBadge={false} />
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {both.length > 0 && (
                                  <div className="space-y-2">
                                    {both.map(service => (
                                      <ServiceCard key={service._id} service={service}
                                        isSelected={selectedServices.some(s => s._id === service._id)}
                                        onToggle={() => toggleService(service)} showGenderBadge={false} />
                                    ))}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="space-y-2">
                                {catServices.map(service => (
                                  <ServiceCard key={service._id} service={service}
                                    isSelected={selectedServices.some(s => s._id === service._id)}
                                    onToggle={() => toggleService(service)} showGenderBadge={false} />
                                ))}
                              </div>
                            )}
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

        {/* ── REVIEWS TAB ───────────────────── */}
        {activeTab === "Reviews" && (
          <div className="fade-in">
            <div className="mb-5 p-4 rounded-xl text-sm flex items-center gap-3"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8' }}>
              <span>⭐</span>
              <span>Reviews can be submitted after completing a booking. You'll receive a notification once your service is done.</span>
            </div>
            {reviews.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex justify-center mb-3"><MessageSquare className="w-10 h-10" style={{ color: 'var(--t-border)' }} /></div>
                <p style={{ color: 'var(--t-text-2)' }}>No reviews yet. Be the first!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <ReviewCard key={r._id} review={r} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── INFO TAB ──────────────────────── */}
        {activeTab === "Info" && (
          <div className="fade-in space-y-4">
            {/* Photo Gallery */}
            {salon.photos?.length > 0 && (
              <div className="rounded-xl p-5" style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)' }}>
                <h3 className="font-semibold mb-3" style={{ color: 'var(--t-text)' }}>Photos ({salon.photos.length})</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {salon.photos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="block aspect-square rounded-lg overflow-hidden">
                      <img src={url} alt={`Salon photo ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-200" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {salon.description && (
              <div className="rounded-xl p-5" style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)' }}>
                <h3 className="font-semibold mb-2" style={{ color: 'var(--t-text)' }}>About</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--t-text-2)' }}>{salon.description}</p>
              </div>
            )}

            <div className="rounded-xl p-5" style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)' }}>
              <h3 className="font-semibold mb-3" style={{ color: 'var(--t-text)' }}>Contact &amp; Location</h3>
              <ul className="space-y-2 text-sm" style={{ color: 'var(--t-text-2)' }}>
                {salon.address && (
                  <li className="flex gap-2"><img src="https://img.freepik.com/free-vector/location_53876-25530.jpg" alt="location" className="w-4 h-4 object-contain mt-0.5 shrink-0" /> {salon.address}</li>
                )}
                {salon.city && (
                  <li className="flex gap-2 items-center"><Building2 className="w-4 h-4 shrink-0" style={{ color: 'var(--t-text-3)' }} /> {salon.city}</li>
                )}
                {salon.phone && (
                  <li className="flex gap-2 items-center"><Phone className="w-4 h-4 shrink-0" style={{ color: 'var(--t-text-3)' }} />
                    <a href={`tel:${salon.phone}`} className="text-indigo-400 hover:underline">{salon.phone}</a>
                  </li>
                )}
                {salon.email && (
                  <li className="flex gap-2 items-center"><Mail className="w-4 h-4 shrink-0" style={{ color: 'var(--t-text-3)' }} />
                    <a href={`mailto:${salon.email}`} className="text-indigo-400 hover:underline">{salon.email}</a>
                  </li>
                )}
              </ul>
            </div>

            {salon.workingHours && (
              <div className="rounded-xl p-5" style={{ background: 'var(--t-card)', border: '1px solid var(--t-border)' }}>
                <h3 className="font-semibold mb-3" style={{ color: 'var(--t-text)' }}>Working Hours</h3>
                <div className="space-y-2">
                  {dayOrder.map((day) => {
                    const h = salon.workingHours[day];
                    if (!h) return null;
                    return (
                      <div key={day} className="flex justify-between text-sm">
                        <span className="capitalize font-medium" style={{ color: 'var(--t-text-2)' }}>{day}</span>
                        {h.isClosed ? (
                          <span style={{ color: 'var(--t-error-text)' }}>Closed</span>
                        ) : (
                          <span style={{ color: 'var(--t-text)' }}>{h.open} – {h.close}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── STICKY BOOKING BAR ─────────────────── */}
      {selectedServices.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 shadow-xl px-4 py-3 fade-in"
          style={{ background: 'var(--t-card)', borderTop: '1px solid var(--t-border)' }}>
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(99,102,241,0.15)' }}>
                <ShoppingBag className="w-4 h-4" style={{ color: '#818cf8' }} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm" style={{ color: 'var(--t-text)' }}>
                  {selectedServices.length} service{selectedServices.length > 1 ? "s" : ""} selected
                </p>
                <p className="text-xs font-medium truncate" style={{ color: '#818cf8' }}>
                  ₹{totalPrice} · {totalDuration} min total
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setSelectedServices([])}
                className="text-sm px-3 py-2 transition"
                style={{ color: 'var(--t-text-3)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--t-text-2)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--t-text-3)'; }}
              >
                Clear
              </button>
              <button
                onClick={handleBookNow}
                className="btn-primary px-5 py-2.5 text-sm"
              >
                Book Now →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalonDetails;
